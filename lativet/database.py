from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
import time as time_module
from contextlib import contextmanager
from datetime import date, datetime, time, timedelta
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from werkzeug.security import check_password_hash, generate_password_hash

from .validators import (
    ValidationError,
    validate_availability_rule,
    validate_appointment,
    validate_billing_document,
    validate_billing_payment,
    validate_cash_movement,
    validate_catalog_item,
    validate_clinical_record,
    validate_consultation,
    validate_consent,
    validate_evolution,
    validate_grooming_document,
    validate_inventory_adjustment,
    validate_owner,
    validate_patient,
    validate_provider,
    validate_settings,
    validate_user,
)


DEFAULT_SETTINGS = {
    "clinic_name": "Lativet",
    "clinic_registration": "",
    "clinic_address": "",
    "clinic_phone": "",
    "clinic_email": "",
    "agenda_timezone": "America/Bogota",
    "retention_years": 15,
    "smtp_enabled": False,
    "smtp_from": "",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "billing_footer": "",
    "billing_default_cash_account": "caja_menor",
    "email_subject_template": "Documento {document_number} - {clinic_name}",
    "email_body_template": "Hola {owner_name}, adjuntamos el documento {document_number}.",
    "google_calendar_enabled": False,
    "google_calendar_id": "primary",
}

APPOINTMENT_STATUSES = {"scheduled", "confirmed", "completed", "cancelled", "no_show"}
ACTIVE_APPOINTMENT_STATUSES = {"scheduled", "confirmed"}
CONSULTATION_TYPES = {
    "Vacunacion",
    "Formula",
    "Desparasitacion",
    "Ambulatorio",
    "Hospitalizacion",
    "Cirugia / procedimiento",
    "Examen de laboratorio",
    "Imagen diagnostica",
    "Seguimiento",
    "Documento",
    "Remision",
}
GROOMING_STATUSES = {"scheduled", "in_progress", "completed", "cancelled"}
BILLING_DOCUMENT_TYPES = {"factura", "cotizacion"}
BILLING_PAYMENT_METHODS = {"Pendiente", "Efectivo", "Transferencia", "Tarjeta", "Otro"}
BILLING_CASH_ACCOUNTS = {"caja_menor", "caja_mayor", "transferencia"}


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat(timespec="seconds")


def add_years(iso_datetime: str, years: int) -> str:
    reference = datetime.fromisoformat(iso_datetime)
    try:
        final_date = reference.date().replace(year=reference.year + years)
    except ValueError:
        final_date = reference.date() + (
            date(reference.year + years, 3, 1) - date(reference.year, 3, 1)
        )
    return final_date.isoformat()


def round_money(value: float) -> float:
    return round(float(value or 0), 2)


def compute_catalog_pricing(
    purchase_cost: float, presentation_total: float, margin_percent: float
) -> tuple[float, float, float]:
    units = float(presentation_total or 1)
    if units <= 0:
        units = 1.0
    unit_cost = round_money(float(purchase_cost or 0) / units)
    unit_price = round_money(unit_cost * (1 + (float(margin_percent or 0) / 100)))
    profit_amount = round_money(unit_price - unit_cost)
    return unit_cost, unit_price, profit_amount


def normalize_postgres_dsn(dsn: str) -> str:
    if not dsn:
        return dsn
    parsed = urlparse(dsn)
    if not parsed.scheme.startswith("postgres"):
        return dsn
    query = dict(parse_qsl(parsed.query))
    # Drop unsupported query params (Vercel/Supabase may add custom ones like "supa")
    allowed = {
        "sslmode",
        "sslrootcert",
        "connect_timeout",
        "application_name",
        "options",
        "target_session_attrs",
        "gssencmode",
        "channel_binding",
    }
    cleaned = {key: value for key, value in query.items() if key in allowed}
    if "sslmode" not in cleaned:
        cleaned["sslmode"] = "require"
    parsed = parsed._replace(query=urlencode(cleaned))
    return urlunparse(parsed)


def _split_sql_script(script: str) -> list[str]:
    statements: list[str] = []
    buffer: list[str] = []
    in_single = False
    in_double = False
    for char in script:
        if char == "'" and not in_double:
            in_single = not in_single
        elif char == '"' and not in_single:
            in_double = not in_double
        if char == ";" and not in_single and not in_double:
            statement = "".join(buffer).strip()
            if statement:
                statements.append(statement)
            buffer = []
        else:
            buffer.append(char)
    trailing = "".join(buffer).strip()
    if trailing:
        statements.append(trailing)
    return statements


def _normalize_postgres_schema(script: str) -> str:
    return script.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")


def _convert_postgres_placeholders(query: str) -> str:
    if "?" not in query:
        return query
    return query.replace("?", "%s")


class PostgresConnection:
    def __init__(self, dsn: str):
        import psycopg
        from psycopg.rows import dict_row

        self._conn = psycopg.connect(dsn, row_factory=dict_row)

    def execute(self, query: str, params: tuple | list | None = None):
        sql = _convert_postgres_placeholders(query)
        try:
            if params is None:
                return self._conn.execute(sql)
            return self._conn.execute(sql, params)
        except Exception:
            try:
                self._conn.rollback()
            except Exception:
                pass
            raise

    def executescript(self, script: str) -> None:
        normalized = _normalize_postgres_schema(script)
        for statement in _split_sql_script(normalized):
            self.execute(statement)

    def commit(self) -> None:
        self._conn.commit()

    def rollback(self) -> None:
        self._conn.rollback()

    def close(self) -> None:
        self._conn.close()


class Database:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.backups_dir = self.base_dir / "backups"
        self.backups_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.base_dir / "lativet.sqlite3"
        self._lock = threading.RLock()
        self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        with self._lock:
            self.connection.execute("PRAGMA foreign_keys = ON")
            self.connection.execute("PRAGMA journal_mode = WAL")
            self.connection.execute("PRAGMA synchronous = NORMAL")
            self.connection.execute("PRAGMA busy_timeout = 5000")
            self._init_schema()
            if not self._has_settings():
                self.save_settings(DEFAULT_SETTINGS)

    def close(self) -> None:
        with self._lock:
            self.connection.close()

    def rollback(self) -> None:
        with self._lock:
            try:
                self.connection.rollback()
            except Exception:
                pass

    @contextmanager
    def _tx(self):
        with self._lock:
            try:
                yield
                self.connection.commit()
            except Exception:
                self.connection.rollback()
                raise

    def _init_schema(self, skip_indexes: bool = False) -> None:
        script = """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS owners (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                identification_type TEXT NOT NULL,
                identification_number TEXT NOT NULL,
                phone TEXT NOT NULL,
                alternate_phone TEXT,
                email TEXT,
                address TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (identification_type, identification_number)
            );

            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                name TEXT NOT NULL,
                species TEXT NOT NULL,
                breed TEXT,
                sex TEXT NOT NULL,
                birth_date TEXT,
                age_years REAL,
                color TEXT,
                reproductive_status TEXT,
                microchip TEXT,
                weight_kg REAL,
                allergies TEXT,
                chronic_conditions TEXT,
                vaccination_status TEXT,
                deworming_status TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (owner_id) REFERENCES owners(id)
            );

            CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                appointment_at TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL,
                professional_name TEXT,
                duration_minutes INTEGER NOT NULL DEFAULT 30,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (owner_id) REFERENCES owners(id)
            );

            CREATE TABLE IF NOT EXISTS consents (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                consent_type TEXT NOT NULL,
                procedure_name TEXT NOT NULL,
                risks_explained TEXT NOT NULL,
                benefits_expected TEXT,
                alternatives TEXT,
                cost_estimate TEXT,
                owner_statement TEXT NOT NULL,
                owner_signature_name TEXT NOT NULL,
                owner_identification TEXT NOT NULL,
                professional_name TEXT NOT NULL,
                professional_license TEXT NOT NULL,
                signed_at TEXT NOT NULL,
                notes TEXT,
                record_id TEXT,
                consultation_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (owner_id) REFERENCES owners(id)
            );

            CREATE TABLE IF NOT EXISTS clinical_records (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                opened_at TEXT NOT NULL,
                status TEXT NOT NULL,
                reason_for_consultation TEXT NOT NULL,
                anamnesis TEXT NOT NULL,
                history_notes TEXT,
                physical_exam_summary TEXT NOT NULL,
                presumptive_diagnosis TEXT NOT NULL,
                differential_diagnosis TEXT,
                definitive_diagnosis TEXT,
                procedures_plan TEXT NOT NULL,
                medications TEXT,
                lab_requests TEXT,
                prognosis TEXT,
                recommendations TEXT NOT NULL,
                attachments_summary TEXT,
                consent_required INTEGER NOT NULL DEFAULT 0,
                consent_summary TEXT,
                professional_name TEXT NOT NULL,
                professional_license TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                retention_until TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                finalized_at TEXT,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (owner_id) REFERENCES owners(id)
            );

            CREATE TABLE IF NOT EXISTS clinical_evolutions (
                id TEXT PRIMARY KEY,
                record_id TEXT NOT NULL,
                evolution_at TEXT NOT NULL,
                subjective TEXT,
                objective TEXT,
                assessment TEXT,
                plan TEXT NOT NULL,
                author_name TEXT NOT NULL,
                author_license TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (record_id) REFERENCES clinical_records(id)
            );

            CREATE TABLE IF NOT EXISTS clinical_consultations (
                id TEXT PRIMARY KEY,
                record_id TEXT NOT NULL,
                patient_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                consultation_at TEXT NOT NULL,
                consultation_type TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                indications TEXT,
                attachments_summary TEXT,
                document_reference TEXT,
                referred_to TEXT,
                consent_required INTEGER NOT NULL DEFAULT 0,
                consent_id TEXT,
                professional_name TEXT NOT NULL,
                professional_license TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (record_id) REFERENCES clinical_records(id),
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (owner_id) REFERENCES owners(id)
            );

            CREATE TABLE IF NOT EXISTS agenda_availability_rules (
                id TEXT PRIMARY KEY,
                scope TEXT NOT NULL,
                professional_name TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                slot_minutes INTEGER NOT NULL,
                location TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS grooming_documents (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                service_at TEXT NOT NULL,
                document_type TEXT NOT NULL,
                service_name TEXT NOT NULL,
                stylist_name TEXT NOT NULL,
                status TEXT NOT NULL,
                notes TEXT,
                recommendations TEXT,
                products_used TEXT,
                next_visit_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (owner_id) REFERENCES owners(id)
            );

            CREATE TABLE IF NOT EXISTS billing_providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                contact_name TEXT,
                phone TEXT,
                email TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS billing_catalog_items (
                id TEXT PRIMARY KEY,
                provider_id TEXT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                purchase_cost REAL NOT NULL DEFAULT 0,
                margin_percent REAL NOT NULL DEFAULT 0,
                presentation_total REAL NOT NULL DEFAULT 1,
                unit_cost REAL NOT NULL DEFAULT 0,
                unit_price REAL NOT NULL DEFAULT 0,
                profit_amount REAL NOT NULL DEFAULT 0,
                stock_quantity REAL NOT NULL DEFAULT 0,
                min_stock REAL NOT NULL DEFAULT 0,
                track_inventory INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (provider_id) REFERENCES billing_providers(id)
            );

            CREATE TABLE IF NOT EXISTS billing_documents (
                id TEXT PRIMARY KEY,
                sequence_number INTEGER NOT NULL UNIQUE,
                document_type TEXT NOT NULL,
                document_number TEXT NOT NULL UNIQUE,
                patient_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                issue_date TEXT NOT NULL,
                due_date TEXT,
                recipient_email TEXT,
                payment_method TEXT NOT NULL,
                cash_account TEXT,
                status TEXT NOT NULL,
                notes TEXT,
                subtotal REAL NOT NULL,
                discount REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL,
                amount_paid REAL NOT NULL DEFAULT 0,
                balance_due REAL NOT NULL DEFAULT 0,
                patient_name_snapshot TEXT NOT NULL,
                owner_name_snapshot TEXT NOT NULL,
                owner_phone_snapshot TEXT,
                owner_document_snapshot TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (owner_id) REFERENCES owners(id)
            );

            CREATE TABLE IF NOT EXISTS billing_document_items (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                catalog_item_id TEXT,
                item_name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                line_total REAL NOT NULL,
                track_inventory INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES billing_documents(id),
                FOREIGN KEY (catalog_item_id) REFERENCES billing_catalog_items(id)
            );

            CREATE TABLE IF NOT EXISTS billing_document_payments (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                payment_date TEXT NOT NULL,
                amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                cash_account TEXT NOT NULL,
                note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES billing_documents(id)
            );

            CREATE TABLE IF NOT EXISTS billing_cash_movements (
                id TEXT PRIMARY KEY,
                movement_type TEXT NOT NULL,
                concept TEXT NOT NULL,
                amount REAL NOT NULL,
                movement_date TEXT NOT NULL,
                cash_account TEXT NOT NULL,
                category TEXT,
                notes TEXT,
                auto_generated INTEGER NOT NULL DEFAULT 0,
                related_document_id TEXT,
                related_payment_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (related_document_id) REFERENCES billing_documents(id),
                FOREIGN KEY (related_payment_id) REFERENCES billing_document_payments(id)
            );

            CREATE TABLE IF NOT EXISTS billing_stock_movements (
                id TEXT PRIMARY KEY,
                catalog_item_id TEXT NOT NULL,
                movement_type TEXT NOT NULL,
                quantity REAL NOT NULL,
                movement_date TEXT NOT NULL,
                balance_after REAL NOT NULL,
                note TEXT,
                related_document_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (catalog_item_id) REFERENCES billing_catalog_items(id),
                FOREIGN KEY (related_document_id) REFERENCES billing_documents(id)
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                payload_json TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS staff_users (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                permissions_json TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (email)
            );

            CREATE INDEX IF NOT EXISTS idx_patients_owner ON patients(owner_id);
            CREATE INDEX IF NOT EXISTS idx_appointments_at ON appointments(appointment_at);
            CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
            CREATE INDEX IF NOT EXISTS idx_appointments_status_at ON appointments(status, appointment_at);
            CREATE INDEX IF NOT EXISTS idx_consents_signed_at ON consents(signed_at);
            CREATE INDEX IF NOT EXISTS idx_records_patient ON clinical_records(patient_id);
            CREATE INDEX IF NOT EXISTS idx_records_opened_at ON clinical_records(opened_at);
            CREATE INDEX IF NOT EXISTS idx_records_retention ON clinical_records(retention_until);
            CREATE INDEX IF NOT EXISTS idx_records_status ON clinical_records(status);
            CREATE INDEX IF NOT EXISTS idx_evolutions_record ON clinical_evolutions(record_id);
            CREATE INDEX IF NOT EXISTS idx_consultations_record ON clinical_consultations(record_id);
            CREATE INDEX IF NOT EXISTS idx_consultations_record_at ON clinical_consultations(record_id, consultation_at);
            CREATE INDEX IF NOT EXISTS idx_consultations_type ON clinical_consultations(consultation_type);
            CREATE INDEX IF NOT EXISTS idx_consultations_at ON clinical_consultations(consultation_at);
            CREATE INDEX IF NOT EXISTS idx_availability_day ON agenda_availability_rules(day_of_week);
            CREATE INDEX IF NOT EXISTS idx_grooming_service_at ON grooming_documents(service_at);
            CREATE INDEX IF NOT EXISTS idx_grooming_status ON grooming_documents(status);
            CREATE INDEX IF NOT EXISTS idx_billing_catalog_name ON billing_catalog_items(name);
            CREATE INDEX IF NOT EXISTS idx_billing_catalog_category ON billing_catalog_items(category);
            CREATE INDEX IF NOT EXISTS idx_billing_documents_issue_date ON billing_documents(issue_date);
            CREATE INDEX IF NOT EXISTS idx_billing_documents_status ON billing_documents(status);
            CREATE INDEX IF NOT EXISTS idx_billing_document_items_document ON billing_document_items(document_id);
            CREATE INDEX IF NOT EXISTS idx_billing_payments_document ON billing_document_payments(document_id);
            CREATE INDEX IF NOT EXISTS idx_billing_cash_date ON billing_cash_movements(movement_date);
            CREATE INDEX IF NOT EXISTS idx_billing_stock_item ON billing_stock_movements(catalog_item_id);
            CREATE INDEX IF NOT EXISTS idx_staff_users_email ON staff_users(email);
            """
        if skip_indexes:
            statements = [
                statement
                for statement in _split_sql_script(script)
                if not statement.strip().upper().startswith("CREATE INDEX")
            ]
            script = ";\n".join(statements)
            if script:
                script = f"{script};"
        self.connection.executescript(script)
        self._ensure_column("appointments", "professional_name", "TEXT")
        self._ensure_column(
            "appointments", "duration_minutes", "INTEGER NOT NULL DEFAULT 30"
        )
        self._ensure_column("appointments", "google_event_id", "TEXT")
        self._ensure_column("appointments", "google_event_url", "TEXT")
        self._ensure_column("appointments", "google_sync_status", "TEXT")
        self._ensure_column("appointments", "google_sync_error", "TEXT")
        self._ensure_column("consents", "record_id", "TEXT")
        self._ensure_column("consents", "consultation_id", "TEXT")
        self._ensure_column("patients", "age_years", "REAL")
        self._ensure_column("owners", "alternate_phone", "TEXT")
        self._ensure_column("staff_users", "password_hash", "TEXT")

    def _ensure_column(self, table: str, column: str, definition: str) -> None:
        columns = {
            row["name"]
            for row in self.connection.execute(f"PRAGMA table_info({table})").fetchall()
        }
        if column in columns:
            return
        self.connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    def _has_settings(self) -> bool:
        row = self.connection.execute("SELECT COUNT(*) AS total FROM settings").fetchone()
        return bool(row["total"])

    def _row_to_dict(self, row: sqlite3.Row | None) -> dict | None:
        if row is None:
            return None
        return {key: row[key] for key in row.keys()}

    def _scalar(self, query: str, params: tuple = ()) -> int:
        row = self.connection.execute(query, params).fetchone()
        if not row:
            return 0
        return int(row["total"] or 0)

    def _list_consultation_details(
        self,
        *,
        where_sql: str = "",
        params: tuple | list = (),
        limit: int | None = None,
    ) -> list[dict]:
        query = """
            SELECT c.*, r.opened_at AS record_opened_at, p.name AS patient_name,
                   o.full_name AS owner_name, cons.procedure_name AS consent_procedure_name
            FROM clinical_consultations c
            JOIN clinical_records r ON r.id = c.record_id
            JOIN patients p ON p.id = c.patient_id
            JOIN owners o ON o.id = c.owner_id
            LEFT JOIN consents cons ON cons.id = c.consent_id
        """
        if where_sql:
            query += f"\nWHERE {where_sql}"
        query += "\nORDER BY c.consultation_at DESC"
        if limit is not None:
            query += f"\nLIMIT {int(limit)}"
        rows = self.connection.execute(query, params).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def _record_audit(
        self, entity_type: str, entity_id: str, action: str, actor: str, payload: dict | None
    ) -> None:
        self.connection.execute(
            """
            INSERT INTO audit_log (entity_type, entity_id, action, actor, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                entity_type,
                entity_id,
                action,
                actor,
                json.dumps(payload or {}, ensure_ascii=False),
                now_iso(),
            ),
        )

    def _get_patient(self, patient_id: str) -> dict:
        row = self.connection.execute(
            """
            SELECT p.*, o.full_name AS owner_name, o.identification_number AS owner_identification
            FROM patients p
            JOIN owners o ON o.id = p.owner_id
            WHERE p.id = ?
            """,
            (patient_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("El paciente seleccionado no existe.")
        return self._row_to_dict(row)

    def _get_record(self, record_id: str) -> dict:
        row = self.connection.execute(
            "SELECT * FROM clinical_records WHERE id = ?",
            (record_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("La historia clínica seleccionada no existe.")
        return self._row_to_dict(row)

    def _get_consultation(self, consultation_id: str) -> dict:
        row = self.connection.execute(
            "SELECT * FROM clinical_consultations WHERE id = ?",
            (consultation_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("La consulta seleccionada no existe.")
        return self._row_to_dict(row)

    def get_settings(self) -> dict:
        rows = self.connection.execute("SELECT key, value FROM settings").fetchall()
        settings = DEFAULT_SETTINGS.copy()
        secret_password = ""
        for row in rows:
            key = row["key"]
            if key == "smtp_app_password":
                secret_password = row["value"]
                continue
            settings[key] = row["value"]
        settings["retention_years"] = int(settings.get("retention_years", 15))
        settings["smtp_port"] = int(settings.get("smtp_port", 587))
        settings["agenda_timezone"] = str(
            settings.get("agenda_timezone") or "America/Bogota"
        )
        settings["smtp_enabled"] = str(settings.get("smtp_enabled", "")).lower() in {
            "1",
            "true",
            "on",
            "yes",
            "si",
            "s",
        }
        settings["google_calendar_enabled"] = str(
            settings.get("google_calendar_enabled", "")
        ).lower() in {"1", "true", "on", "yes", "si", "s"}
        settings["google_calendar_id"] = str(settings.get("google_calendar_id") or "primary")
        settings["smtp_password_set"] = bool(secret_password)
        return settings

    def get_secret_setting(self, key: str) -> str:
        row = self.connection.execute(
            "SELECT value FROM settings WHERE key = ?",
            (key,),
        ).fetchone()
        return row["value"] if row else ""

    def set_secret_setting(self, key: str, value: str) -> None:
        timestamp = now_iso()
        with self._tx():
            self.connection.execute(
                """
                INSERT INTO settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, value, timestamp),
            )

    def get_owner(self, owner_id: str) -> dict:
        row = self.connection.execute(
            "SELECT * FROM owners WHERE id = ?",
            (owner_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("El propietario seleccionado no existe.")
        return self._row_to_dict(row)

    def get_consent(self, consent_id: str) -> dict:
        row = self.connection.execute(
            "SELECT * FROM consents WHERE id = ?",
            (consent_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("El consentimiento seleccionado no existe.")
        return self._row_to_dict(row)

    def _enrich_consent(self, consent: dict | None) -> dict | None:
        if consent is None:
            return None
        if consent.get("record_id"):
            record = self.connection.execute(
                """
                SELECT opened_at
                FROM clinical_records
                WHERE id = ?
                """,
                (consent["record_id"],),
            ).fetchone()
            consent["record_label"] = record["opened_at"] if record else ""
        else:
            consent["record_label"] = ""
        if consent.get("consultation_id"):
            consultation = self.connection.execute(
                """
                SELECT title
                FROM clinical_consultations
                WHERE id = ?
                """,
                (consent["consultation_id"],),
            ).fetchone()
            consent["consultation_label"] = consultation["title"] if consultation else ""
        else:
            consent["consultation_label"] = ""
        return consent

    def get_consent_bundle(self, consent_id: str) -> dict:
        consent = self.get_consent(consent_id)
        patient = self._get_patient(consent["patient_id"])
        owner = self.get_owner(consent["owner_id"])
        settings = self.get_settings()
        return {"settings": settings, "owner": owner, "patient": patient, "consent": consent}

    def list_users(self, include_inactive: bool = True) -> list[dict]:
        query = "SELECT * FROM staff_users"
        params: tuple = ()
        if not include_inactive:
            query += " WHERE is_active = 1"
        query += " ORDER BY created_at DESC"
        rows = self.connection.execute(query, params).fetchall()
        users = [self._row_to_dict(row) for row in rows]
        for user in users:
            try:
                user["permissions"] = json.loads(user.get("permissions_json") or "[]")
            except json.JSONDecodeError:
                user["permissions"] = []
            user["is_active"] = bool(int(user.get("is_active") or 0))
            user.pop("password_hash", None)
        return users

    def save_user(self, payload: dict) -> dict:
        data = validate_user(payload)
        user_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        permissions_json = json.dumps(data["permissions"] or [], ensure_ascii=False)
        password = data.get("password") or ""
        password_hash = ""
        audit_payload = {key: value for key, value in data.items() if key != "password"}
        with self._tx():
            self._ensure_column("staff_users", "password_hash", "TEXT")
            existing = None
            existing_password_hash = ""
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id, password_hash FROM staff_users WHERE id = ?",
                    (user_id,),
                ).fetchone()
                if existing:
                    existing_password_hash = existing["password_hash"] or ""
            email_row = self.connection.execute(
                "SELECT id FROM staff_users WHERE lower(email) = ?",
                (data["email"].lower(),),
            ).fetchone()
            if email_row and (not existing or email_row["id"] != user_id):
                raise ValidationError("Ya existe un usuario con ese correo.")
            if existing:
                if password:
                    password_hash = generate_password_hash(password)
                else:
                    password_hash = existing_password_hash
                self.connection.execute(
                    """
                    UPDATE staff_users
                    SET full_name = ?, email = ?, role = ?, permissions_json = ?, is_active = ?, password_hash = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["full_name"],
                        data["email"],
                        data["role"],
                        permissions_json,
                        1 if data["is_active"] else 0,
                        password_hash,
                        timestamp,
                        user_id,
                    ),
                )
                action = "update"
            else:
                if not password:
                    raise ValidationError("La contrasena es obligatoria para nuevos usuarios.")
                password_hash = generate_password_hash(password)
                self.connection.execute(
                    """
                    INSERT INTO staff_users (
                        id, full_name, email, role, permissions_json,
                        is_active, password_hash, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        data["full_name"],
                        data["email"],
                        data["role"],
                        permissions_json,
                        1 if data["is_active"] else 0,
                        password_hash,
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("staff_user", user_id, action, "admin", audit_payload)
        return self.get_user(user_id)

    def update_user_status(self, user_id: str, is_active: bool) -> dict:
        timestamp = now_iso()
        with self._tx():
            self.connection.execute(
                "UPDATE staff_users SET is_active = ?, updated_at = ? WHERE id = ?",
                (1 if is_active else 0, timestamp, user_id),
            )
            self._record_audit(
                "staff_user", user_id, "status", "admin", {"is_active": is_active}
            )
        return self.get_user(user_id)

    def get_user(self, user_id: str) -> dict:
        row = self.connection.execute(
            "SELECT * FROM staff_users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("El usuario seleccionado no existe.")
        user = self._row_to_dict(row)
        try:
            user["permissions"] = json.loads(user.get("permissions_json") or "[]")
        except json.JSONDecodeError:
            user["permissions"] = []
        user["is_active"] = bool(int(user.get("is_active") or 0))
        user.pop("password_hash", None)
        return user

    def authenticate_user(self, email: str, password: str) -> dict:
        row = self.connection.execute(
            "SELECT * FROM staff_users WHERE lower(email) = ?",
            (email.lower(),),
        ).fetchone()
        if row is None:
            raise ValidationError("Credenciales invalidas.")
        user = self._row_to_dict(row)
        if not bool(int(user.get("is_active") or 0)):
            raise ValidationError("Usuario inactivo.")
        stored_hash = user.get("password_hash") or ""
        if not stored_hash or not check_password_hash(stored_hash, password):
            raise ValidationError("Credenciales invalidas.")
        try:
            user["permissions"] = json.loads(user.get("permissions_json") or "[]")
        except json.JSONDecodeError:
            user["permissions"] = []
        user["is_active"] = bool(int(user.get("is_active") or 0))
        user.pop("password_hash", None)
        return user

    def save_settings(self, payload: dict) -> dict:
        data = validate_settings(payload)
        timestamp = now_iso()
        with self._tx():
            for key, value in data.items():
                if key == "smtp_app_password" and not value:
                    # Keep existing password unless explicitly replaced with a non-empty value.
                    continue
                self.connection.execute(
                    """
                    INSERT INTO settings (key, value, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                    """,
                    (key, str(value), timestamp),
                )
            self._record_audit("settings", "global", "upsert", "sistema", data)
        return self.get_settings()

    def save_owner(self, payload: dict) -> dict:
        data = validate_owner(payload)
        owner_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        try:
            with self._tx():
                existing = None
                if data["id"]:
                    existing = self.connection.execute(
                        "SELECT id FROM owners WHERE id = ?", (owner_id,)
                    ).fetchone()
                if existing:
                    self.connection.execute(
                        """
                    UPDATE owners
                    SET full_name = ?, identification_type = ?, identification_number = ?,
                        phone = ?, alternate_phone = ?, email = ?, address = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["full_name"],
                        data["identification_type"],
                        data["identification_number"],
                        data["phone"],
                        data["alternate_phone"],
                        data["email"],
                        data["address"],
                        timestamp,
                        owner_id,
                    ),
                )
                    action = "update"
                else:
                    self.connection.execute(
                        """
                        INSERT INTO owners (
                            id, full_name, identification_type, identification_number,
                            phone, alternate_phone, email, address, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            owner_id,
                            data["full_name"],
                            data["identification_type"],
                            data["identification_number"],
                            data["phone"],
                            data["alternate_phone"],
                            data["email"],
                            data["address"],
                            timestamp,
                            timestamp,
                        ),
                    )
                    action = "create"
                self._record_audit("owner", owner_id, action, "recepción", data)
        except sqlite3.IntegrityError as exc:
            raise ValidationError(
                "Ya existe un propietario con ese tipo y numero de identificacion."
            ) from exc
        row = self.connection.execute("SELECT * FROM owners WHERE id = ?", (owner_id,)).fetchone()
        return self._row_to_dict(row)

    def delete_owner(self, owner_id: str) -> dict:
        owner = self.get_owner(owner_id)
        dependencies = [
            (
                "mascotas",
                self._scalar("SELECT COUNT(*) AS total FROM patients WHERE owner_id = ?", (owner_id,)),
            ),
            (
                "citas",
                self._scalar("SELECT COUNT(*) AS total FROM appointments WHERE owner_id = ?", (owner_id,)),
            ),
            (
                "historias clinicas",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM clinical_records WHERE owner_id = ?",
                    (owner_id,),
                ),
            ),
            (
                "consultas",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM clinical_consultations WHERE owner_id = ?",
                    (owner_id,),
                ),
            ),
            (
                "consentimientos",
                self._scalar("SELECT COUNT(*) AS total FROM consents WHERE owner_id = ?", (owner_id,)),
            ),
            (
                "documentos de peluqueria",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM grooming_documents WHERE owner_id = ?",
                    (owner_id,),
                ),
            ),
            (
                "documentos de facturacion",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM billing_documents WHERE owner_id = ?",
                    (owner_id,),
                ),
            ),
        ]
        active_dependencies = [label for label, total in dependencies if total > 0]
        if active_dependencies:
            raise ValidationError(
                "No puedes eliminar el propietario porque tiene registros asociados en: "
                + ", ".join(active_dependencies)
                + "."
            )
        with self._tx():
            deleted = self.connection.execute("DELETE FROM owners WHERE id = ?", (owner_id,))
            if not deleted.rowcount:
                raise ValidationError("El propietario seleccionado no existe.")
            self._record_audit("owner", owner_id, "delete", "recepcion", owner)
        return {"id": owner_id, "deleted": True}

    def list_owners(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT o.*, COUNT(p.id) AS patients_count
            FROM owners o
            LEFT JOIN patients p ON p.owner_id = o.id
            GROUP BY o.id
            ORDER BY LOWER(o.full_name)
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def save_patient(self, payload: dict) -> dict:
        data = validate_patient(payload)
        owner = self.connection.execute(
            "SELECT id FROM owners WHERE id = ?", (data["owner_id"],)
        ).fetchone()
        if owner is None:
            raise ValidationError("Debes crear primero el propietario responsable.")
        patient_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM patients WHERE id = ?", (patient_id,)
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE patients
                    SET owner_id = ?, name = ?, species = ?, breed = ?, sex = ?, birth_date = ?, age_years = ?,
                        color = ?, reproductive_status = ?, microchip = ?, weight_kg = ?,
                        allergies = ?, chronic_conditions = ?, vaccination_status = ?,
                        deworming_status = ?, notes = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["owner_id"],
                        data["name"],
                        data["species"],
                        data["breed"],
                        data["sex"],
                        data["birth_date"],
                        data["age_years"],
                        data["color"],
                        data["reproductive_status"],
                        data["microchip"],
                        data["weight_kg"],
                        data["allergies"],
                        data["chronic_conditions"],
                        data["vaccination_status"],
                        data["deworming_status"],
                        data["notes"],
                        timestamp,
                        patient_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO patients (
                        id, owner_id, name, species, breed, sex, birth_date, age_years, color,
                        reproductive_status, microchip, weight_kg, allergies,
                        chronic_conditions, vaccination_status, deworming_status, notes,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        patient_id,
                        data["owner_id"],
                        data["name"],
                        data["species"],
                        data["breed"],
                        data["sex"],
                        data["birth_date"],
                        data["age_years"],
                        data["color"],
                        data["reproductive_status"],
                        data["microchip"],
                        data["weight_kg"],
                        data["allergies"],
                        data["chronic_conditions"],
                        data["vaccination_status"],
                        data["deworming_status"],
                        data["notes"],
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("patient", patient_id, action, "recepción", data)
        row = self.connection.execute(
            """
            SELECT p.*, o.full_name AS owner_name
            FROM patients p
            JOIN owners o ON o.id = p.owner_id
            WHERE p.id = ?
            """,
            (patient_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def delete_patient(self, patient_id: str) -> dict:
        patient = self._get_patient(patient_id)
        dependencies = [
            (
                "citas",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM appointments WHERE patient_id = ?",
                    (patient_id,),
                ),
            ),
            (
                "historias clinicas",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM clinical_records WHERE patient_id = ?",
                    (patient_id,),
                ),
            ),
            (
                "consultas",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM clinical_consultations WHERE patient_id = ?",
                    (patient_id,),
                ),
            ),
            (
                "consentimientos",
                self._scalar("SELECT COUNT(*) AS total FROM consents WHERE patient_id = ?", (patient_id,)),
            ),
            (
                "documentos de peluqueria",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM grooming_documents WHERE patient_id = ?",
                    (patient_id,),
                ),
            ),
            (
                "documentos de facturacion",
                self._scalar(
                    "SELECT COUNT(*) AS total FROM billing_documents WHERE patient_id = ?",
                    (patient_id,),
                ),
            ),
        ]
        active_dependencies = [label for label, total in dependencies if total > 0]
        if active_dependencies:
            raise ValidationError(
                "No puedes eliminar el paciente porque tiene registros asociados en: "
                + ", ".join(active_dependencies)
                + "."
            )
        with self._tx():
            deleted = self.connection.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
            if not deleted.rowcount:
                raise ValidationError("El paciente seleccionado no existe.")
            self._record_audit("patient", patient_id, "delete", "recepcion", patient)
        return {"id": patient_id, "deleted": True}

    def _ensure_placeholder_patient(self, owner_id: str) -> dict:
        row = self.connection.execute(
            "SELECT * FROM patients WHERE owner_id = ? AND name = ?",
            (owner_id, "Mascota por registrar"),
        ).fetchone()
        if row:
            return self._row_to_dict(row)
        payload = {
            "id": "",
            "owner_id": owner_id,
            "name": "Mascota por registrar",
            "species": "Otros",
            "breed": "Pendiente",
            "sex": "Desconocido",
            "birth_date": None,
            "age_years": 0,
            "color": "",
            "reproductive_status": "Desconocido",
            "microchip": "",
            "weight_kg": 0,
            "allergies": "",
            "chronic_conditions": "",
            "vaccination_status": "",
            "deworming_status": "",
            "notes": "Pendiente de registro",
        }
        return self.save_patient(payload)

    def list_patients(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT p.*, o.full_name AS owner_name,
                   (SELECT COUNT(*) FROM clinical_records r WHERE r.patient_id = p.id) AS records_count
            FROM patients p
            JOIN owners o ON o.id = p.owner_id
            ORDER BY LOWER(p.name)
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def save_appointment(self, payload: dict) -> dict:
        data = validate_appointment(payload)
        if data["status"] not in APPOINTMENT_STATUSES:
            raise ValidationError("Estado de cita no válido.")
        if not data.get("patient_id"):
            if not data.get("owner_id"):
                raise ValidationError("Debes seleccionar un propietario.")
            placeholder = self._ensure_placeholder_patient(data["owner_id"])
            data["patient_id"] = placeholder["id"]
        patient = self._get_patient(data["patient_id"])
        appointment_id = data["id"] or uuid.uuid4().hex
        matched_rule = self._match_availability_rule(
            appointment_at=data["appointment_at"],
            duration_minutes=data["duration_minutes"],
        )
        if matched_rule and not data["professional_name"]:
            data["professional_name"] = matched_rule["professional_name"]
        self._validate_appointment_availability(
            appointment_id=appointment_id,
            appointment_at=data["appointment_at"],
            duration_minutes=data["duration_minutes"],
            matched_rule=matched_rule,
        )
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM appointments WHERE id = ?", (appointment_id,)
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE appointments
                    SET patient_id = ?, owner_id = ?, appointment_at = ?, reason = ?,
                        status = ?, professional_name = ?, duration_minutes = ?,
                        notes = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["patient_id"],
                        patient["owner_id"],
                        data["appointment_at"],
                        data["reason"],
                        data["status"],
                        data["professional_name"],
                        data["duration_minutes"],
                        data["notes"],
                        timestamp,
                        appointment_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO appointments (
                        id, patient_id, owner_id, appointment_at, reason, status,
                        professional_name, duration_minutes, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        appointment_id,
                        data["patient_id"],
                        patient["owner_id"],
                        data["appointment_at"],
                        data["reason"],
                        data["status"],
                        data["professional_name"],
                        data["duration_minutes"],
                        data["notes"],
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("appointment", appointment_id, action, "agenda", data)
        row = self.connection.execute(
            """
            SELECT a.*, p.name AS patient_name, o.full_name AS owner_name
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN owners o ON o.id = a.owner_id
            WHERE a.id = ?
            """,
            (appointment_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def update_appointment_status(self, appointment_id: str, status: str) -> dict:
        if status not in APPOINTMENT_STATUSES:
            raise ValidationError("Estado de cita no válido.")
        timestamp = now_iso()
        with self._tx():
            updated = self.connection.execute(
                "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
                (status, timestamp, appointment_id),
            )
            if not updated.rowcount:
                raise ValidationError("La cita seleccionada no existe.")
            self._record_audit(
                "appointment",
                appointment_id,
                "status_change",
                "agenda",
                {"status": status},
            )
        row = self.connection.execute(
            """
            SELECT a.*, p.name AS patient_name, o.full_name AS owner_name
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN owners o ON o.id = a.owner_id
            WHERE a.id = ?
            """,
            (appointment_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def get_appointment(self, appointment_id: str) -> dict:
        row = self.connection.execute(
            """
            SELECT a.*, p.name AS patient_name, o.full_name AS owner_name
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN owners o ON o.id = a.owner_id
            WHERE a.id = ?
            """,
            (appointment_id,),
        ).fetchone()
        if not row:
            raise ValidationError("La cita seleccionada no existe.")
        return self._row_to_dict(row)

    def delete_appointment(self, appointment_id: str) -> dict:
        with self._tx():
            row = self.connection.execute(
                """
                SELECT a.*, p.name AS patient_name, o.full_name AS owner_name
                FROM appointments a
                JOIN patients p ON p.id = a.patient_id
                JOIN owners o ON o.id = a.owner_id
                WHERE a.id = ?
                """,
                (appointment_id,),
            ).fetchone()
            if not row:
                raise ValidationError("La cita seleccionada no existe.")
            self.connection.execute("DELETE FROM appointments WHERE id = ?", (appointment_id,))
            self._record_audit(
                "appointment",
                appointment_id,
                "delete",
                "agenda",
                {"status": "deleted"},
            )
        return self._row_to_dict(row)

    def list_appointments(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT a.*, p.name AS patient_name, o.full_name AS owner_name
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN owners o ON o.id = a.owner_id
            ORDER BY a.appointment_at DESC
            LIMIT 250
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def update_appointment_google_sync(
        self,
        appointment_id: str,
        *,
        event_id: str = "",
        event_url: str = "",
        sync_status: str = "",
        sync_error: str = "",
    ) -> dict:
        timestamp = now_iso()
        with self._tx():
            updated = self.connection.execute(
                """
                UPDATE appointments
                SET google_event_id = ?, google_event_url = ?, google_sync_status = ?,
                    google_sync_error = ?, updated_at = ?
                WHERE id = ?
                """,
                (event_id, event_url, sync_status, sync_error, timestamp, appointment_id),
            )
            if not updated.rowcount:
                raise ValidationError("La cita seleccionada no existe.")
        row = self.connection.execute(
            """
            SELECT a.*, p.name AS patient_name, o.full_name AS owner_name
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN owners o ON o.id = a.owner_id
            WHERE a.id = ?
            """,
            (appointment_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def save_consent(self, payload: dict) -> dict:
        data = validate_consent(payload)
        patient = self._get_patient(data["patient_id"])
        if data["record_id"]:
            record = self._get_record(data["record_id"])
            if record["patient_id"] != data["patient_id"]:
                raise ValidationError("La historia seleccionada no corresponde al paciente.")
        if data["consultation_id"]:
            consultation = self._get_consultation(data["consultation_id"])
            if consultation["patient_id"] != data["patient_id"]:
                raise ValidationError("La consulta seleccionada no corresponde al paciente.")
        consent_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM consents WHERE id = ?", (consent_id,)
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE consents
                    SET patient_id = ?, owner_id = ?, consent_type = ?, procedure_name = ?,
                        risks_explained = ?, benefits_expected = ?, alternatives = ?,
                        cost_estimate = ?, owner_statement = ?, owner_signature_name = ?,
                        owner_identification = ?, professional_name = ?, professional_license = ?,
                        signed_at = ?, notes = ?, record_id = ?, consultation_id = ?
                    WHERE id = ?
                    """,
                    (
                        data["patient_id"],
                        patient["owner_id"],
                        data["consent_type"],
                        data["procedure_name"],
                        data["risks_explained"],
                        data["benefits_expected"],
                        data["alternatives"],
                        data["cost_estimate"],
                        data["owner_statement"],
                        data["owner_signature_name"],
                        data["owner_identification"],
                        data["professional_name"],
                        data["professional_license"],
                        data["signed_at"],
                        data["notes"],
                        data["record_id"],
                        data["consultation_id"],
                        consent_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO consents (
                        id, patient_id, owner_id, consent_type, procedure_name, risks_explained,
                        benefits_expected, alternatives, cost_estimate, owner_statement,
                        owner_signature_name, owner_identification, professional_name,
                        professional_license, signed_at, notes, record_id, consultation_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        consent_id,
                        data["patient_id"],
                        patient["owner_id"],
                        data["consent_type"],
                        data["procedure_name"],
                        data["risks_explained"],
                        data["benefits_expected"],
                        data["alternatives"],
                        data["cost_estimate"],
                        data["owner_statement"],
                        data["owner_signature_name"],
                        data["owner_identification"],
                        data["professional_name"],
                        data["professional_license"],
                        data["signed_at"],
                        data["notes"],
                        data["record_id"],
                        data["consultation_id"],
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("consent", consent_id, action, data["professional_name"], data)
        row = self.connection.execute(
            """
            SELECT c.*, p.name AS patient_name, o.full_name AS owner_name
            FROM consents c
            JOIN patients p ON p.id = c.patient_id
            JOIN owners o ON o.id = c.owner_id
            WHERE c.id = ?
            """,
            (consent_id,),
        ).fetchone()
        return self._enrich_consent(self._row_to_dict(row))

    def list_consents(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT c.*, p.name AS patient_name, o.full_name AS owner_name
            FROM consents c
            JOIN patients p ON p.id = c.patient_id
            JOIN owners o ON o.id = c.owner_id
            ORDER BY c.signed_at DESC
            LIMIT 250
            """
        ).fetchall()
        return [self._enrich_consent(self._row_to_dict(row)) for row in rows]

    def save_consultation(self, payload: dict) -> dict:
        data = validate_consultation(payload)
        if data["consultation_type"] not in CONSULTATION_TYPES:
            raise ValidationError("El tipo de consulta no es valido.")
        record = self._get_record(data["record_id"])
        patient = self._get_patient(record["patient_id"])
        if data["consent_id"]:
            consent = self.get_consent(data["consent_id"])
            if consent["patient_id"] != patient["id"]:
                raise ValidationError("El consentimiento no corresponde al paciente seleccionado.")
        consultation_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM clinical_consultations WHERE id = ?",
                    (consultation_id,),
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE clinical_consultations
                    SET record_id = ?, patient_id = ?, owner_id = ?, consultation_at = ?,
                        consultation_type = ?, title = ?, summary = ?, indications = ?,
                        attachments_summary = ?, document_reference = ?, referred_to = ?,
                        consent_required = ?, consent_id = ?, professional_name = ?,
                        professional_license = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["record_id"],
                        patient["id"],
                        patient["owner_id"],
                        data["consultation_at"],
                        data["consultation_type"],
                        data["title"],
                        data["summary"],
                        data["indications"],
                        data["attachments_summary"],
                        data["document_reference"],
                        data["referred_to"],
                        int(data["consent_required"]),
                        data["consent_id"],
                        data["professional_name"],
                        data["professional_license"],
                        timestamp,
                        consultation_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO clinical_consultations (
                        id, record_id, patient_id, owner_id, consultation_at, consultation_type,
                        title, summary, indications, attachments_summary, document_reference,
                        referred_to, consent_required, consent_id, professional_name,
                        professional_license, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        consultation_id,
                        data["record_id"],
                        patient["id"],
                        patient["owner_id"],
                        data["consultation_at"],
                        data["consultation_type"],
                        data["title"],
                        data["summary"],
                        data["indications"],
                        data["attachments_summary"],
                        data["document_reference"],
                        data["referred_to"],
                        int(data["consent_required"]),
                        data["consent_id"],
                        data["professional_name"],
                        data["professional_license"],
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self.connection.execute(
                """
                UPDATE clinical_records
                SET retention_until = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    add_years(data["consultation_at"], self.get_settings()["retention_years"]),
                    timestamp,
                    data["record_id"],
                ),
            )
            self._record_audit(
                "clinical_consultation",
                consultation_id,
                action,
                data["professional_name"],
                data,
            )
        return self._fetch_consultation_detail(consultation_id)

    def _fetch_consultation_detail(self, consultation_id: str) -> dict:
        consultation = next(
            iter(
                self._list_consultation_details(
                    where_sql="c.id = ?",
                    params=(consultation_id,),
                    limit=1,
                )
            ),
            None,
        )
        if not consultation:
            raise ValidationError("La consulta seleccionada no existe.")
        return consultation

    def list_consultations(self) -> list[dict]:
        return self._list_consultation_details(limit=300)

    def save_availability_rule(self, payload: dict) -> dict:
        data = validate_availability_rule(payload)
        rule_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM agenda_availability_rules WHERE id = ?",
                    (rule_id,),
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE agenda_availability_rules
                    SET scope = ?, professional_name = ?, day_of_week = ?, start_time = ?,
                        end_time = ?, slot_minutes = ?, location = ?, notes = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["scope"],
                        data["professional_name"],
                        data["day_of_week"],
                        data["start_time"],
                        data["end_time"],
                        data["slot_minutes"],
                        data["location"],
                        data["notes"],
                        timestamp,
                        rule_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO agenda_availability_rules (
                        id, scope, professional_name, day_of_week, start_time, end_time,
                        slot_minutes, location, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rule_id,
                        data["scope"],
                        data["professional_name"],
                        data["day_of_week"],
                        data["start_time"],
                        data["end_time"],
                        data["slot_minutes"],
                        data["location"],
                        data["notes"],
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("availability_rule", rule_id, action, "agenda", data)
        row = self.connection.execute(
            """
            SELECT *
            FROM agenda_availability_rules
            WHERE id = ?
            """,
            (rule_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def delete_availability_rule(self, rule_id: str) -> dict:
        with self._tx():
            deleted = self.connection.execute(
                "DELETE FROM agenda_availability_rules WHERE id = ?",
                (rule_id,),
            )
            if not deleted.rowcount:
                raise ValidationError("La regla de disponibilidad seleccionada no existe.")
            self._record_audit(
                "availability_rule",
                rule_id,
                "delete",
                "agenda",
                {"id": rule_id},
            )
        return {"id": rule_id, "deleted": True}

    def list_availability_rules(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT *
            FROM agenda_availability_rules
            WHERE scope = 'general'
            ORDER BY day_of_week, start_time, LOWER(professional_name)
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def get_agenda_calendar(self, days: int = 14) -> list[dict]:
        rules = self.list_availability_rules()
        if not rules:
            return []
        appointments = [
            item
            for item in self.list_appointments()
            if item["status"] in ACTIVE_APPOINTMENT_STATUSES
        ]
        days_payload: list[dict] = []
        today = date.today()
        for offset in range(days):
            current_date = today + timedelta(days=offset)
            day_rules = [rule for rule in rules if int(rule["day_of_week"]) == current_date.weekday()]
            slot_items = []
            for rule in day_rules:
                start_dt = datetime.combine(current_date, time.fromisoformat(rule["start_time"]))
                end_dt = datetime.combine(current_date, time.fromisoformat(rule["end_time"]))
                slot_cursor = start_dt
                while slot_cursor < end_dt:
                    slot_end = slot_cursor + timedelta(minutes=int(rule["slot_minutes"]))
                    conflicting = next(
                        (
                            appointment
                            for appointment in appointments
                            if self._appointment_overlaps_slot(appointment, slot_cursor, slot_end)
                        ),
                        None,
                    )
                    slot_items.append(
                        {
                            "slot_at": slot_cursor.replace(microsecond=0).isoformat(timespec="seconds"),
                            "scope": rule["scope"],
                            "professional_name": rule["professional_name"],
                            "location": rule["location"],
                            "occupied": bool(conflicting),
                            "patient_name": conflicting["patient_name"] if conflicting else "",
                        }
                    )
                    slot_cursor = slot_end
            days_payload.append(
                {
                    "date": current_date.isoformat(),
                    "weekday": current_date.strftime("%A"),
                    "slots": slot_items,
                    "available_count": len([item for item in slot_items if not item["occupied"]]),
                }
            )
        return days_payload

    def _appointment_overlaps_slot(
        self, appointment: dict, slot_start: datetime, slot_end: datetime
    ) -> bool:
        appointment_start = datetime.fromisoformat(appointment["appointment_at"])
        appointment_end = appointment_start + timedelta(
            minutes=int(appointment.get("duration_minutes") or 30)
        )
        return appointment_start < slot_end and appointment_end > slot_start

    def _match_availability_rule(
        self, *, appointment_at: str, duration_minutes: int
    ) -> dict | None:
        rules = self.list_availability_rules()
        if not rules:
            return None
        start = datetime.fromisoformat(appointment_at)
        end = start + timedelta(minutes=int(duration_minutes or 30))
        for rule in rules:
            if int(rule["day_of_week"]) != start.weekday():
                continue
            rule_start = datetime.combine(start.date(), time.fromisoformat(rule["start_time"]))
            rule_end = datetime.combine(start.date(), time.fromisoformat(rule["end_time"]))
            slot_minutes = int(rule["slot_minutes"] or 30)
            if start < rule_start or end > rule_end:
                continue
            offset_minutes = int((start - rule_start).total_seconds() / 60)
            if offset_minutes % slot_minutes != 0:
                continue
            if int(duration_minutes or 30) % slot_minutes != 0:
                continue
            return rule
        return None

    def _validate_appointment_availability(
        self,
        *,
        appointment_id: str,
        appointment_at: str,
        duration_minutes: int,
        matched_rule: dict | None,
    ) -> None:
        if self.list_availability_rules() and not matched_rule:
            raise ValidationError(
                "La cita debe quedar dentro de un horario de atencion configurado."
            )
        start = datetime.fromisoformat(appointment_at)
        end = start + timedelta(minutes=int(duration_minutes or 30))
        for item in self.list_appointments():
            if item["id"] == appointment_id or item["status"] not in ACTIVE_APPOINTMENT_STATUSES:
                continue
            other_start = datetime.fromisoformat(item["appointment_at"])
            other_end = other_start + timedelta(minutes=int(item.get("duration_minutes") or 30))
            if other_start < end and other_end > start:
                raise ValidationError("Ya existe una cita activa en ese horario.")

    def _get_available_slots_next_days_count(self, days: int = 14) -> int:
        if days <= 0:
            return 0
        rules_rows = self.connection.execute(
            """
            SELECT day_of_week, start_time, end_time, slot_minutes
            FROM agenda_availability_rules
            ORDER BY day_of_week, start_time
            """
        ).fetchall()
        if not rules_rows:
            return 0

        rules_by_weekday: dict[int, list[dict]] = {}
        for row in rules_rows:
            slot_minutes = max(int(row["slot_minutes"] or 30), 1)
            start_time = time.fromisoformat(row["start_time"])
            end_time = time.fromisoformat(row["end_time"])
            total_minutes = int(
                (
                    datetime.combine(date.min, end_time)
                    - datetime.combine(date.min, start_time)
                ).total_seconds()
                / 60
            )
            if total_minutes <= 0:
                continue
            rules_by_weekday.setdefault(int(row["day_of_week"]), []).append(
                {
                    "start_time": start_time,
                    "end_time": end_time,
                    "slot_minutes": slot_minutes,
                    "slot_count": max(total_minutes // slot_minutes, 0),
                }
            )

        today = date.today()
        end_date = today + timedelta(days=days - 1)
        total_slots = 0
        for offset in range(days):
            current_date = today + timedelta(days=offset)
            total_slots += sum(
                rule["slot_count"]
                for rule in rules_by_weekday.get(current_date.weekday(), [])
            )
        if total_slots <= 0:
            return 0

        appointment_rows = self.connection.execute(
            """
            SELECT appointment_at, duration_minutes
            FROM appointments
            WHERE status IN ('scheduled', 'confirmed')
              AND appointment_at >= ?
              AND appointment_at <= ?
            """,
            (today.isoformat(), f"{end_date.isoformat()}T23:59:59"),
        ).fetchall()
        occupied_slots = 0
        for row in appointment_rows:
            appointment_at = row["appointment_at"]
            if not appointment_at:
                continue
            start = datetime.fromisoformat(appointment_at)
            duration = max(int(row["duration_minutes"] or 30), 1)
            matched_rule = None
            for rule in rules_by_weekday.get(start.weekday(), []):
                rule_start = datetime.combine(start.date(), rule["start_time"])
                rule_end = datetime.combine(start.date(), rule["end_time"])
                if start < rule_start or start + timedelta(minutes=duration) > rule_end:
                    continue
                offset_minutes = int((start - rule_start).total_seconds() / 60)
                if offset_minutes % rule["slot_minutes"] != 0:
                    continue
                if duration % rule["slot_minutes"] != 0:
                    continue
                matched_rule = rule
                break
            if matched_rule:
                occupied_slots += max(1, duration // matched_rule["slot_minutes"])
            else:
                occupied_slots += 1
        return max(total_slots - occupied_slots, 0)

    def save_grooming_document(self, payload: dict) -> dict:
        data = validate_grooming_document(payload)
        patient = self._get_patient(data["patient_id"])
        grooming_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM grooming_documents WHERE id = ?",
                    (grooming_id,),
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE grooming_documents
                    SET patient_id = ?, owner_id = ?, service_at = ?, document_type = ?,
                        service_name = ?, stylist_name = ?, status = ?, notes = ?,
                        recommendations = ?, products_used = ?, next_visit_at = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["patient_id"],
                        patient["owner_id"],
                        data["service_at"],
                        data["document_type"],
                        data["service_name"],
                        data["stylist_name"],
                        data["status"],
                        data["notes"],
                        data["recommendations"],
                        data["products_used"],
                        data["next_visit_at"],
                        timestamp,
                        grooming_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO grooming_documents (
                        id, patient_id, owner_id, service_at, document_type, service_name,
                        stylist_name, status, notes, recommendations, products_used,
                        next_visit_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        grooming_id,
                        data["patient_id"],
                        patient["owner_id"],
                        data["service_at"],
                        data["document_type"],
                        data["service_name"],
                        data["stylist_name"],
                        data["status"],
                        data["notes"],
                        data["recommendations"],
                        data["products_used"],
                        data["next_visit_at"],
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("grooming_document", grooming_id, action, data["stylist_name"], data)
        return self._fetch_grooming_detail(grooming_id)

    def _fetch_grooming_detail(self, grooming_id: str) -> dict:
        row = self.connection.execute(
            """
            SELECT g.*, p.name AS patient_name, o.full_name AS owner_name
            FROM grooming_documents g
            JOIN patients p ON p.id = g.patient_id
            JOIN owners o ON o.id = g.owner_id
            WHERE g.id = ?
            """,
            (grooming_id,),
        ).fetchone()
        grooming = self._row_to_dict(row)
        if grooming is None:
            raise ValidationError("El documento de peluqueria no existe.")
        return grooming

    def list_grooming_documents(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT g.*, p.name AS patient_name, o.full_name AS owner_name
            FROM grooming_documents g
            JOIN patients p ON p.id = g.patient_id
            JOIN owners o ON o.id = g.owner_id
            ORDER BY g.service_at DESC
            LIMIT 250
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def save_provider(self, payload: dict) -> dict:
        data = validate_provider(payload)
        provider_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM billing_providers WHERE id = ?",
                    (provider_id,),
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE billing_providers
                    SET name = ?, contact_name = ?, phone = ?, email = ?, notes = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["name"],
                        data["contact_name"],
                        data["phone"],
                        data["email"],
                        data["notes"],
                        timestamp,
                        provider_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO billing_providers (
                        id, name, contact_name, phone, email, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        provider_id,
                        data["name"],
                        data["contact_name"],
                        data["phone"],
                        data["email"],
                        data["notes"],
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("billing_provider", provider_id, action, "ventas", data)
        row = self.connection.execute(
            "SELECT * FROM billing_providers WHERE id = ?",
            (provider_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def list_providers(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT p.*,
                   (SELECT COUNT(*) FROM billing_catalog_items c WHERE c.provider_id = p.id) AS items_count
            FROM billing_providers p
            ORDER BY LOWER(p.name)
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def save_catalog_item(self, payload: dict) -> dict:
        data = validate_catalog_item(payload)
        item_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        unit_cost, unit_price, profit_amount = compute_catalog_pricing(
            data["purchase_cost"], data["presentation_total"], data["margin_percent"]
        )
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM billing_catalog_items WHERE id = ?",
                    (item_id,),
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE billing_catalog_items
                    SET provider_id = ?, name = ?, category = ?, purchase_cost = ?, margin_percent = ?,
                        presentation_total = ?, unit_cost = ?, unit_price = ?, profit_amount = ?,
                        stock_quantity = ?, min_stock = ?, track_inventory = ?, notes = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["provider_id"] or None,
                        data["name"],
                        data["category"],
                        data["purchase_cost"],
                        data["margin_percent"],
                        data["presentation_total"],
                        unit_cost,
                        unit_price,
                        profit_amount,
                        data["stock_quantity"],
                        data["min_stock"],
                        int(data["track_inventory"]),
                        data["notes"],
                        timestamp,
                        item_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO billing_catalog_items (
                        id, provider_id, name, category, purchase_cost, margin_percent,
                        presentation_total, unit_cost, unit_price, profit_amount, stock_quantity,
                        min_stock, track_inventory, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item_id,
                        data["provider_id"] or None,
                        data["name"],
                        data["category"],
                        data["purchase_cost"],
                        data["margin_percent"],
                        data["presentation_total"],
                        unit_cost,
                        unit_price,
                        profit_amount,
                        data["stock_quantity"],
                        data["min_stock"],
                        int(data["track_inventory"]),
                        data["notes"],
                        timestamp,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("billing_catalog_item", item_id, action, "ventas", data)
        return self.get_catalog_item(item_id)

    def get_catalog_item(self, item_id: str) -> dict:
        row = self.connection.execute(
            """
            SELECT c.*, p.name AS provider_name
            FROM billing_catalog_items c
            LEFT JOIN billing_providers p ON p.id = c.provider_id
            WHERE c.id = ?
            """,
            (item_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("El item de catalogo no existe.")
        item = self._row_to_dict(row)
        item["low_stock"] = bool(
            item["track_inventory"] and float(item["stock_quantity"]) <= float(item["min_stock"])
        )
        return item

    def list_catalog_items(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT c.*, p.name AS provider_name
            FROM billing_catalog_items c
            LEFT JOIN billing_providers p ON p.id = c.provider_id
            ORDER BY LOWER(c.name)
            """
        ).fetchall()
        return [self.get_catalog_item(row["id"]) for row in rows]

    def adjust_catalog_stock(self, payload: dict) -> dict:
        data = validate_inventory_adjustment(payload)
        item = self.get_catalog_item(data["item_id"])
        quantity_delta = data["quantity"] if data["movement_type"] == "entrada" else -data["quantity"]
        new_balance = round_money(float(item["stock_quantity"]) + quantity_delta)
        if data["movement_type"] == "salida" and new_balance < 0:
            raise ValidationError("El ajuste manual no puede dejar inventario negativo.")
        movement_id = uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            self.connection.execute(
                """
                UPDATE billing_catalog_items
                SET stock_quantity = ?, updated_at = ?
                WHERE id = ?
                """,
                (new_balance, timestamp, data["item_id"]),
            )
            self.connection.execute(
                """
                INSERT INTO billing_stock_movements (
                    id, catalog_item_id, movement_type, quantity, movement_date, balance_after,
                    note, related_document_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    movement_id,
                    data["item_id"],
                    data["movement_type"],
                    quantity_delta,
                    data["movement_date"],
                    new_balance,
                    data["note"],
                    None,
                    timestamp,
                ),
            )
            self._record_audit("billing_stock_movement", movement_id, "create", "inventario", data)
        row = self.connection.execute(
            """
            SELECT m.*, c.name AS item_name
            FROM billing_stock_movements m
            JOIN billing_catalog_items c ON c.id = m.catalog_item_id
            WHERE m.id = ?
            """,
            (movement_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def list_stock_movements(self, item_id: str | None = None) -> list[dict]:
        params: list[str] = []
        query = """
            SELECT m.*, c.name AS item_name
            FROM billing_stock_movements m
            JOIN billing_catalog_items c ON c.id = m.catalog_item_id
        """
        if item_id:
            query += " WHERE m.catalog_item_id = ?"
            params.append(item_id)
        query += " ORDER BY m.movement_date DESC, m.created_at DESC"
        rows = self.connection.execute(query, tuple(params)).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def list_billing_clients(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT o.*,
                   (SELECT COUNT(*) FROM patients p WHERE p.owner_id = o.id) AS patients_count,
                   (SELECT COUNT(*) FROM billing_documents d WHERE d.owner_id = o.id) AS documents_count
            FROM owners o
            ORDER BY LOWER(o.full_name)
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def _next_billing_sequence_number(self) -> int:
        row = self.connection.execute(
            "SELECT COALESCE(MAX(sequence_number), 0) AS current_max FROM billing_documents"
        ).fetchone()
        return int(row["current_max"]) + 1

    def _apply_document_stock(self, document_id: str, lines: list[dict], issue_date: str) -> None:
        timestamp = now_iso()
        for line in lines:
            if not line["track_inventory"] or not line["catalog_item_id"]:
                continue
            item = self.get_catalog_item(line["catalog_item_id"])
            new_balance = round_money(float(item["stock_quantity"]) - float(line["quantity"]))
            self.connection.execute(
                """
                UPDATE billing_catalog_items
                SET stock_quantity = ?, updated_at = ?
                WHERE id = ?
                """,
                (new_balance, timestamp, line["catalog_item_id"]),
            )
            self.connection.execute(
                """
                INSERT INTO billing_stock_movements (
                    id, catalog_item_id, movement_type, quantity, movement_date, balance_after,
                    note, related_document_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uuid.uuid4().hex,
                    line["catalog_item_id"],
                    "invoice",
                    -float(line["quantity"]),
                    issue_date,
                    new_balance,
                    f"Salida automatica por documento {document_id}",
                    document_id,
                    timestamp,
                ),
            )

    def _create_auto_cash_movement(
        self,
        *,
        movement_type: str,
        concept: str,
        amount: float,
        movement_date: str,
        cash_account: str,
        category: str,
        notes: str,
        related_document_id: str | None,
        related_payment_id: str | None,
    ) -> None:
        self.connection.execute(
            """
            INSERT INTO billing_cash_movements (
                id, movement_type, concept, amount, movement_date, cash_account, category, notes,
                auto_generated, related_document_id, related_payment_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                uuid.uuid4().hex,
                movement_type,
                concept,
                round_money(amount),
                movement_date,
                cash_account,
                category,
                notes,
                1,
                related_document_id,
                related_payment_id,
                now_iso(),
            ),
        )

    def save_billing_document(self, payload: dict) -> dict:
        data = validate_billing_document(payload)
        patient = self._get_patient(data["patient_id"])
        owner = self.get_owner(patient["owner_id"])
        if data["payment_method"] not in BILLING_PAYMENT_METHODS:
            raise ValidationError("El metodo de pago no es valido.")
        if data["cash_account"] and data["cash_account"] not in BILLING_CASH_ACCOUNTS:
            raise ValidationError("La cuenta de caja no es valida.")
        document_id = data["id"] or uuid.uuid4().hex
        sequence_number = self._next_billing_sequence_number()
        document_number = f"{sequence_number:04d}"
        subtotal = 0.0
        lines: list[dict] = []
        for line in data["lines"]:
            item = self.get_catalog_item(line["catalog_item_id"])
            line_total = round_money(float(line["quantity"]) * float(item["unit_price"]))
            subtotal = round_money(subtotal + line_total)
            lines.append(
                {
                    "catalog_item_id": item["id"],
                    "item_name": item["name"],
                    "category": item["category"],
                    "quantity": float(line["quantity"]),
                    "unit_price": float(item["unit_price"]),
                    "line_total": line_total,
                    "track_inventory": bool(item["track_inventory"]),
                }
            )
        total = round_money(subtotal - float(data["discount"]))
        if total < 0:
            raise ValidationError("El total del documento no puede ser negativo.")
        status = "Cotizacion" if data["document_type"] == "cotizacion" else "Pendiente"
        amount_paid = 0.0
        balance_due = total
        cash_account = data["cash_account"] or self.get_settings().get(
            "billing_default_cash_account", "caja_menor"
        )
        timestamp = now_iso()
        with self._tx():
            self.connection.execute(
                """
                INSERT INTO billing_documents (
                    id, sequence_number, document_type, document_number, patient_id, owner_id,
                    issue_date, due_date, recipient_email, payment_method, cash_account, status,
                    notes, subtotal, discount, total, amount_paid, balance_due, patient_name_snapshot,
                    owner_name_snapshot, owner_phone_snapshot, owner_document_snapshot, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    document_id,
                    sequence_number,
                    data["document_type"],
                    document_number,
                    patient["id"],
                    owner["id"],
                    data["issue_date"],
                    data["due_date"] or data["issue_date"],
                    data["recipient_email"] or owner.get("email") or "",
                    data["payment_method"],
                    cash_account if data["document_type"] == "factura" else "",
                    status,
                    data["notes"],
                    subtotal,
                    data["discount"],
                    total,
                    amount_paid,
                    balance_due,
                    patient["name"],
                    owner["full_name"],
                    owner.get("phone") or "",
                    owner.get("identification_number") or "",
                    timestamp,
                    timestamp,
                ),
            )
            for line in lines:
                self.connection.execute(
                    """
                    INSERT INTO billing_document_items (
                        id, document_id, catalog_item_id, item_name, category, quantity, unit_price,
                        line_total, track_inventory, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        uuid.uuid4().hex,
                        document_id,
                        line["catalog_item_id"],
                        line["item_name"],
                        line["category"],
                        line["quantity"],
                        line["unit_price"],
                        line["line_total"],
                        int(line["track_inventory"]),
                        timestamp,
                    ),
                )
            if data["document_type"] == "factura":
                self._apply_document_stock(document_id, lines, data["issue_date"])
                if data["payment_method"] != "Pendiente":
                    amount_paid = total
                    balance_due = 0.0
                    status = "Pagado"
                    self._create_auto_cash_movement(
                        movement_type="ingreso",
                        concept=f"Pago de factura {document_number}",
                        amount=total,
                        movement_date=data["issue_date"],
                        cash_account=cash_account,
                        category="Factura",
                        notes="Ingreso automatico por factura pagada",
                        related_document_id=document_id,
                        related_payment_id=None,
                    )
                elif data["initial_payment_amount"] > 0:
                    payment = self.register_billing_payment(
                        {
                            "document_id": document_id,
                            "payment_date": data["initial_payment_date"] or data["issue_date"],
                            "amount": data["initial_payment_amount"],
                            "payment_method": data["initial_payment_method"],
                            "cash_account": data["initial_payment_cash_account"],
                            "note": "Abono inicial",
                        },
                        commit=False,
                    )
                    amount_paid = float(payment["document_amount_paid"])
                    balance_due = float(payment["document_balance_due"])
                    status = payment["document_status"]
                self.connection.execute(
                    """
                    UPDATE billing_documents
                    SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (amount_paid, balance_due, status, now_iso(), document_id),
                )
            self._record_audit("billing_document", document_id, "create", "ventas", data)
        return self.get_billing_document(document_id)

    def register_billing_payment(self, payload: dict, *, commit: bool = True) -> dict:
        data = validate_billing_payment(payload)
        document = self.get_billing_document(data["document_id"])
        if document["document_type"] != "factura":
            raise ValidationError("Solo las facturas admiten abonos.")
        if document["status"] == "Cotizacion":
            raise ValidationError("Las cotizaciones no admiten abonos.")
        if float(data["amount"]) > float(document["balance_due"]):
            raise ValidationError("El abono no puede superar el saldo pendiente.")
        payment_id = uuid.uuid4().hex
        timestamp = now_iso()

        def _run() -> None:
            self.connection.execute(
                """
                INSERT INTO billing_document_payments (
                    id, document_id, payment_date, amount, payment_method, cash_account, note, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payment_id,
                    data["document_id"],
                    data["payment_date"],
                    data["amount"],
                    data["payment_method"],
                    data["cash_account"],
                    data["note"],
                    timestamp,
                ),
            )
            amount_paid = round_money(float(document["amount_paid"]) + float(data["amount"]))
            balance_due = round_money(float(document["total"]) - amount_paid)
            status = "Pagado" if balance_due <= 0 else "Pendiente"
            self.connection.execute(
                """
                UPDATE billing_documents
                SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ?
                WHERE id = ?
                """,
                (amount_paid, balance_due, status, timestamp, data["document_id"]),
            )
            self._create_auto_cash_movement(
                movement_type="ingreso",
                concept=f"Abono documento {document['document_number']}",
                amount=data["amount"],
                movement_date=data["payment_date"],
                cash_account=data["cash_account"],
                category="Abono",
                notes=data["note"] or "Abono registrado",
                related_document_id=data["document_id"],
                related_payment_id=payment_id,
            )
            self._record_audit("billing_payment", payment_id, "create", "ventas", data)

        if commit:
            with self._tx():
                _run()
        else:
            _run()
        payment = self.connection.execute(
            """
            SELECT *
            FROM billing_document_payments
            WHERE id = ?
            """,
            (payment_id,),
        ).fetchone()
        result = self._row_to_dict(payment)
        updated_document = self.get_billing_document(data["document_id"])
        result["document_status"] = updated_document["status"]
        result["document_amount_paid"] = updated_document["amount_paid"]
        result["document_balance_due"] = updated_document["balance_due"]
        return result

    def get_billing_document(self, document_id: str) -> dict:
        row = self.connection.execute(
            """
            SELECT d.*, p.name AS patient_name, o.full_name AS owner_name
            FROM billing_documents d
            JOIN patients p ON p.id = d.patient_id
            JOIN owners o ON o.id = d.owner_id
            WHERE d.id = ?
            """,
            (document_id,),
        ).fetchone()
        if row is None:
            raise ValidationError("El documento de facturacion no existe.")
        document = self._row_to_dict(row)
        items = self.connection.execute(
            """
            SELECT *
            FROM billing_document_items
            WHERE document_id = ?
            ORDER BY created_at ASC
            """,
            (document_id,),
        ).fetchall()
        payments = self.connection.execute(
            """
            SELECT *
            FROM billing_document_payments
            WHERE document_id = ?
            ORDER BY payment_date ASC, created_at ASC
            """,
            (document_id,),
        ).fetchall()
        document["lines"] = [self._row_to_dict(item) for item in items]
        document["payments"] = [self._row_to_dict(payment) for payment in payments]
        return document

    def list_billing_documents(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT d.*, p.name AS patient_name, o.full_name AS owner_name,
                   (SELECT COUNT(*) FROM billing_document_items i WHERE i.document_id = d.id) AS lines_count,
                   (SELECT COUNT(*) FROM billing_document_payments pay WHERE pay.document_id = d.id) AS payments_count
            FROM billing_documents d
            JOIN patients p ON p.id = d.patient_id
            JOIN owners o ON o.id = d.owner_id
            ORDER BY d.sequence_number DESC
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def save_cash_movement(self, payload: dict) -> dict:
        data = validate_cash_movement(payload)
        movement_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id FROM billing_cash_movements WHERE id = ? AND auto_generated = 0",
                    (movement_id,),
                ).fetchone()
            if existing:
                self.connection.execute(
                    """
                    UPDATE billing_cash_movements
                    SET movement_type = ?, concept = ?, amount = ?, movement_date = ?, cash_account = ?,
                        category = ?, notes = ?
                    WHERE id = ?
                    """,
                    (
                        data["movement_type"],
                        data["concept"],
                        data["amount"],
                        data["movement_date"],
                        data["cash_account"],
                        data["category"],
                        data["notes"],
                        movement_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO billing_cash_movements (
                        id, movement_type, concept, amount, movement_date, cash_account, category, notes,
                        auto_generated, related_document_id, related_payment_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        movement_id,
                        data["movement_type"],
                        data["concept"],
                        data["amount"],
                        data["movement_date"],
                        data["cash_account"],
                        data["category"],
                        data["notes"],
                        0,
                        None,
                        None,
                        timestamp,
                    ),
                )
                action = "create"
            self._record_audit("billing_cash_movement", movement_id, action, "caja", data)
        row = self.connection.execute(
            "SELECT * FROM billing_cash_movements WHERE id = ?",
            (movement_id,),
        ).fetchone()
        return self._row_to_dict(row)

    def list_cash_movements(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT *
            FROM billing_cash_movements
            ORDER BY movement_date DESC, created_at DESC
            """
        ).fetchall()
        return [self._row_to_dict(row) for row in rows]

    def get_billing_summary(self) -> dict:
        def scalar(query: str, params: tuple = ()) -> float:
            row = self.connection.execute(query, params).fetchone()
            value = row["total"] if row and row["total"] is not None else 0
            return round_money(value)

        low_stock = self.connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM billing_catalog_items
            WHERE track_inventory = 1 AND stock_quantity <= min_stock
            """
        ).fetchone()["total"]
        return {
            "documents_total": int(
                self.connection.execute(
                    "SELECT COUNT(*) AS total FROM billing_documents"
                ).fetchone()["total"]
            ),
            "facturas_total": int(
                self.connection.execute(
                    "SELECT COUNT(*) AS total FROM billing_documents WHERE document_type = 'factura'"
                ).fetchone()["total"]
            ),
            "cotizaciones_total": int(
                self.connection.execute(
                    "SELECT COUNT(*) AS total FROM billing_documents WHERE document_type = 'cotizacion'"
                ).fetchone()["total"]
            ),
            "total_facturado": scalar(
                "SELECT COALESCE(SUM(total), 0) AS total FROM billing_documents WHERE document_type = 'factura'"
            ),
            "saldo_pendiente": scalar(
                "SELECT COALESCE(SUM(balance_due), 0) AS total FROM billing_documents WHERE status = 'Pendiente'"
            ),
            "ingresos": scalar(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM billing_cash_movements WHERE movement_type = 'ingreso'"
            ),
            "gastos": scalar(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM billing_cash_movements WHERE movement_type = 'gasto'"
            ),
            "tracked_items_count": int(
                self.connection.execute(
                    "SELECT COUNT(*) AS total FROM billing_catalog_items WHERE track_inventory = 1"
                ).fetchone()["total"]
            ),
            "low_stock_count": int(low_stock),
            "inventory_units": scalar(
                "SELECT COALESCE(SUM(stock_quantity), 0) AS total FROM billing_catalog_items WHERE track_inventory = 1"
            ),
        }

    def get_requests_summary(self) -> dict:
        consultations = self.list_consultations()
        return {
            "clinical_records": [
                record
                for record in self.list_clinical_records()
                if record["status"] == "draft" or record.get("consent_required")
            ][:12],
            "appointments": [
                appointment
                for appointment in self.list_appointments()
                if appointment["status"] == "scheduled"
            ][:12],
            "orders": [
                consultation
                for consultation in consultations
                if consultation["consultation_type"]
                in {"Examen de laboratorio", "Imagen diagnostica", "Remision"}
            ][:12],
            "billing_documents": [
                document
                for document in self.list_billing_documents()
                if document["status"] == "Pendiente"
            ][:12],
        }

    def get_reports_summary(self) -> dict:
        owners = self.list_owners()
        patients = self.list_patients()
        appointments = self.list_appointments()
        records = self.list_clinical_records()
        consultations = self.list_consultations()
        grooming_documents = self.list_grooming_documents()
        billing_documents = self.list_billing_documents()
        providers = self.list_providers()
        catalog_items = self.list_catalog_items()
        cash_movements = self.list_cash_movements()
        billing_summary = self.get_billing_summary()
        consultations_by_type: dict[str, int] = {}
        for consultation in consultations:
            consultations_by_type.setdefault(consultation["consultation_type"], 0)
            consultations_by_type[consultation["consultation_type"]] += 1
        grooming_by_status: dict[str, int] = {status: 0 for status in GROOMING_STATUSES}
        for item in grooming_documents:
            grooming_by_status[item["status"]] = grooming_by_status.get(item["status"], 0) + 1
        appointments_by_day: dict[str, int] = {}
        for appointment in appointments:
            appointment_day = appointment["appointment_at"][:10]
            appointments_by_day[appointment_day] = appointments_by_day.get(appointment_day, 0) + 1
        audit_rows = self.connection.execute(
            """
            SELECT *
            FROM audit_log
            ORDER BY created_at DESC
            LIMIT 12
            """
        ).fetchall()
        return {
            "totals": {
                "owners": len(owners),
                "patients": len(patients),
                "records": len(records),
                "consultations": len(consultations),
                "appointments": len(appointments),
                "grooming_documents": len(grooming_documents),
                "billing_documents": len(billing_documents),
                "providers": len(providers),
                "catalog_items": len(catalog_items),
            },
            "consultations_by_type": consultations_by_type,
            "appointments_by_day": appointments_by_day,
            "owners": owners[:10],
            "patients": patients[:10],
            "recent_records": records[:10],
            "recent_billing_documents": billing_documents[:10],
            "providers": providers[:10],
            "catalog_items": catalog_items[:10],
            "cash_movements": cash_movements[:20],
            "billing": billing_summary,
            "grooming_by_status": grooming_by_status,
            "availability_rules": self.list_availability_rules(),
            "recent_audit": [self._row_to_dict(row) for row in audit_rows],
        }

    def save_clinical_record(self, payload: dict, finalize: bool = False) -> dict:
        data = validate_clinical_record(payload)
        patient = self._get_patient(data["patient_id"])
        record_id = data["id"] or uuid.uuid4().hex
        timestamp = now_iso()
        settings = self.get_settings()
        opened_at = data["opened_at"] or timestamp
        retention_until = add_years(opened_at, settings["retention_years"])
        payload_json = json.dumps(
            {
                **data,
                "patient_name": patient["name"],
                "owner_name": patient["owner_name"],
            },
            ensure_ascii=False,
            sort_keys=True,
        )
        with self._tx():
            existing = None
            if data["id"]:
                existing = self.connection.execute(
                    "SELECT id, status FROM clinical_records WHERE id = ?",
                    (record_id,),
                ).fetchone()
            if existing:
                if existing["status"] == "finalized":
                    raise ValidationError(
                        "La historia clínica ya fue finalizada y no puede editarse directamente."
                    )
                self.connection.execute(
                    """
                    UPDATE clinical_records
                    SET patient_id = ?, owner_id = ?, opened_at = ?, reason_for_consultation = ?,
                        anamnesis = ?, history_notes = ?, physical_exam_summary = ?,
                        presumptive_diagnosis = ?, differential_diagnosis = ?, definitive_diagnosis = ?,
                        procedures_plan = ?, medications = ?, lab_requests = ?, prognosis = ?,
                        recommendations = ?, attachments_summary = ?, consent_required = ?,
                        consent_summary = ?, professional_name = ?, professional_license = ?,
                        payload_json = ?, retention_until = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        data["patient_id"],
                        patient["owner_id"],
                        opened_at,
                        data["reason_for_consultation"],
                        data["anamnesis"],
                        data["history_notes"],
                        data["physical_exam_summary"],
                        data["presumptive_diagnosis"],
                        data["differential_diagnosis"],
                        data["definitive_diagnosis"],
                        data["procedures_plan"],
                        data["medications"],
                        data["lab_requests"],
                        data["prognosis"],
                        data["recommendations"],
                        data["attachments_summary"],
                        int(data["consent_required"]),
                        data["consent_summary"],
                        data["professional_name"],
                        data["professional_license"],
                        payload_json,
                        retention_until,
                        timestamp,
                        record_id,
                    ),
                )
                action = "update"
            else:
                self.connection.execute(
                    """
                    INSERT INTO clinical_records (
                        id, patient_id, owner_id, opened_at, status, reason_for_consultation,
                        anamnesis, history_notes, physical_exam_summary, presumptive_diagnosis,
                        differential_diagnosis, definitive_diagnosis, procedures_plan,
                        medications, lab_requests, prognosis, recommendations,
                        attachments_summary, consent_required, consent_summary,
                        professional_name, professional_license, payload_json,
                        retention_until, created_at, updated_at, finalized_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record_id,
                        data["patient_id"],
                        patient["owner_id"],
                        opened_at,
                        "draft",
                        data["reason_for_consultation"],
                        data["anamnesis"],
                        data["history_notes"],
                        data["physical_exam_summary"],
                        data["presumptive_diagnosis"],
                        data["differential_diagnosis"],
                        data["definitive_diagnosis"],
                        data["procedures_plan"],
                        data["medications"],
                        data["lab_requests"],
                        data["prognosis"],
                        data["recommendations"],
                        data["attachments_summary"],
                        int(data["consent_required"]),
                        data["consent_summary"],
                        data["professional_name"],
                        data["professional_license"],
                        payload_json,
                        retention_until,
                        timestamp,
                        timestamp,
                        None,
                    ),
                )
                action = "create"
            if finalize:
                self.connection.execute(
                    """
                    UPDATE clinical_records
                    SET status = 'finalized', finalized_at = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (timestamp, timestamp, record_id),
                )
                action = "finalize" if action == "create" else "update_finalize"
            self._record_audit("clinical_record", record_id, action, data["professional_name"], data)
        return self._fetch_record_detail(record_id)

    def save_evolution(self, payload: dict) -> dict:
        data = validate_evolution(payload)
        record = self._get_record(data["record_id"])
        evolution_id = uuid.uuid4().hex
        timestamp = now_iso()
        retention_until = add_years(data["evolution_at"], self.get_settings()["retention_years"])
        with self._tx():
            self.connection.execute(
                """
                INSERT INTO clinical_evolutions (
                    id, record_id, evolution_at, subjective, objective, assessment,
                    plan, author_name, author_license, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evolution_id,
                    data["record_id"],
                    data["evolution_at"],
                    data["subjective"],
                    data["objective"],
                    data["assessment"],
                    data["plan"],
                    data["author_name"],
                    data["author_license"],
                    timestamp,
                ),
            )
            self.connection.execute(
                """
                UPDATE clinical_records
                SET retention_until = ?, updated_at = ?
                WHERE id = ?
                """,
                (retention_until, timestamp, data["record_id"]),
            )
            self._record_audit(
                "clinical_record",
                data["record_id"],
                "append_evolution",
                data["author_name"],
                data,
            )
        return {
            "id": evolution_id,
            "record_id": data["record_id"],
            "record_status": record["status"],
        }

    def _fetch_record_detail(self, record_id: str) -> dict:
        row = self.connection.execute(
            """
            SELECT r.*, p.name AS patient_name, o.full_name AS owner_name
            FROM clinical_records r
            JOIN patients p ON p.id = r.patient_id
            JOIN owners o ON o.id = r.owner_id
            WHERE r.id = ?
            """,
            (record_id,),
        ).fetchone()
        record = self._row_to_dict(row)
        record["payload"] = json.loads(record["payload_json"])
        evolutions = self.connection.execute(
            """
            SELECT *
            FROM clinical_evolutions
            WHERE record_id = ?
            ORDER BY evolution_at DESC
            """,
            (record_id,),
        ).fetchall()
        record["evolutions"] = [self._row_to_dict(item) for item in evolutions]
        record["consultations"] = self._list_consultation_details(
            where_sql="c.record_id = ?",
            params=(record_id,),
        )
        return record

    def list_clinical_records(self) -> list[dict]:
        rows = self.connection.execute(
            """
            SELECT r.*, p.name AS patient_name, o.full_name AS owner_name,
                   (SELECT COUNT(*) FROM clinical_evolutions e WHERE e.record_id = r.id) AS evolutions_count,
                   (SELECT COUNT(*) FROM clinical_consultations c WHERE c.record_id = r.id) AS consultations_count
            FROM clinical_records r
            JOIN patients p ON p.id = r.patient_id
            JOIN owners o ON o.id = r.owner_id
            ORDER BY r.opened_at DESC
            LIMIT 250
            """
        ).fetchall()
        records = [self._row_to_dict(row) for row in rows]
        if not records:
            return records
        record_ids = [item["id"] for item in records]
        placeholders = ",".join("?" for _ in record_ids)
        evolution_rows = self.connection.execute(
            f"""
            SELECT *
            FROM clinical_evolutions
            WHERE record_id IN ({placeholders})
            ORDER BY evolution_at DESC
            """,
            record_ids,
        ).fetchall()
        grouped: dict[str, list[dict]] = {}
        for row in evolution_rows:
            grouped.setdefault(row["record_id"], []).append(self._row_to_dict(row))
        consultation_rows = self._list_consultation_details(
            where_sql=f"c.record_id IN ({placeholders})",
            params=record_ids,
        )
        grouped_consultations: dict[str, list[dict]] = {}
        for row in consultation_rows:
            grouped_consultations.setdefault(row["record_id"], []).append(row)
        for record in records:
            record["payload"] = json.loads(record["payload_json"])
            record["evolutions"] = grouped.get(record["id"], [])
            record["consultations"] = grouped_consultations.get(record["id"], [])
        return records

    def get_dashboard_summary(self) -> dict:
        today = date.today()
        horizon = (today + timedelta(days=7)).isoformat()
        retention_window = (today + timedelta(days=180)).isoformat()
        today_end = f"{today.isoformat()}T23:59:59"

        def scalar(query: str, params: tuple = ()) -> int:
            return int(self.connection.execute(query, params).fetchone()["total"])

        appointment_status = {status: 0 for status in APPOINTMENT_STATUSES}
        for row in self.connection.execute(
            "SELECT status, COUNT(*) AS total FROM appointments GROUP BY status"
        ).fetchall():
            appointment_status[row["status"]] = row["total"]

        consents_by_type = {
            row["consent_type"]: row["total"]
            for row in self.connection.execute(
                """
                SELECT consent_type, COUNT(*) AS total
                FROM consents
                GROUP BY consent_type
                ORDER BY consent_type
                """
            ).fetchall()
        }
        consultations_by_type = {
            row["consultation_type"]: row["total"]
            for row in self.connection.execute(
                """
                SELECT consultation_type, COUNT(*) AS total
                FROM clinical_consultations
                GROUP BY consultation_type
                ORDER BY consultation_type
                """
            ).fetchall()
        }
        grooming_by_status = {
            row["status"]: row["total"]
            for row in self.connection.execute(
                """
                SELECT status, COUNT(*) AS total
                FROM grooming_documents
                GROUP BY status
                ORDER BY status
                """
            ).fetchall()
        }
        billing_summary = self.get_billing_summary()

        backups = list(self.backups_dir.glob("*.sqlite3"))
        backups_count = len(backups)
        last_backup_at = ""
        if backups:
            latest_backup = max(backups, key=lambda path: path.stat().st_mtime)
            last_backup_at = datetime.fromtimestamp(latest_backup.stat().st_mtime).replace(
                microsecond=0
            ).isoformat()

        counts = {
            "owners": scalar("SELECT COUNT(*) AS total FROM owners"),
            "patients": scalar("SELECT COUNT(*) AS total FROM patients"),
            "appointments": scalar(
                "SELECT COUNT(*) AS total FROM appointments WHERE status IN ('scheduled', 'confirmed')"
            ),
            "appointments_total": scalar("SELECT COUNT(*) AS total FROM appointments"),
            "appointments_today": scalar(
                """
                SELECT COUNT(*) AS total
                FROM appointments
                WHERE status IN ('scheduled', 'confirmed')
                  AND appointment_at >= ?
                  AND appointment_at <= ?
                """,
                (today.isoformat(), today_end),
            ),
            "appointments_status": appointment_status,
            "draft_records": scalar(
                "SELECT COUNT(*) AS total FROM clinical_records WHERE status = 'draft'"
            ),
            "finalized_records": scalar(
                "SELECT COUNT(*) AS total FROM clinical_records WHERE status = 'finalized'"
            ),
            "records_total": scalar("SELECT COUNT(*) AS total FROM clinical_records"),
            "records_with_evolutions": scalar(
                "SELECT COUNT(DISTINCT record_id) AS total FROM clinical_evolutions"
            ),
            "records_with_consent_required": scalar(
                "SELECT COUNT(*) AS total FROM clinical_records WHERE consent_required = 1"
            ),
            "evolutions_total": scalar("SELECT COUNT(*) AS total FROM clinical_evolutions"),
            "consultations_total": scalar("SELECT COUNT(*) AS total FROM clinical_consultations"),
            "consultations_by_type": consultations_by_type,
            "consents": scalar("SELECT COUNT(*) AS total FROM consents"),
            "consents_by_type": consents_by_type,
            "availability_rules_total": scalar(
                "SELECT COUNT(*) AS total FROM agenda_availability_rules"
            ),
            "grooming_total": scalar("SELECT COUNT(*) AS total FROM grooming_documents"),
            "grooming_by_status": grooming_by_status,
            "billing_documents_total": billing_summary["documents_total"],
            "billing_facturas_total": billing_summary["facturas_total"],
            "billing_cotizaciones_total": billing_summary["cotizaciones_total"],
            "billing_total_facturado": billing_summary["total_facturado"],
            "billing_saldo_pendiente": billing_summary["saldo_pendiente"],
            "billing_ingresos": billing_summary["ingresos"],
            "billing_gastos": billing_summary["gastos"],
            "billing_tracked_items_count": billing_summary["tracked_items_count"],
            "billing_low_stock_count": billing_summary["low_stock_count"],
            "billing_inventory_units": billing_summary["inventory_units"],
            "audit_events": scalar("SELECT COUNT(*) AS total FROM audit_log"),
            "backups_count": backups_count,
            "last_backup_at": last_backup_at,
        }
        counts["upcoming_week"] = self.connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM appointments
            WHERE status IN ('scheduled', 'confirmed')
              AND appointment_at >= ?
              AND appointment_at <= ?
            """,
            (today.isoformat(), f"{horizon}T23:59:59"),
        ).fetchone()["total"]
        counts["records_near_retention"] = self.connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM clinical_records
            WHERE retention_until <= ?
            """,
            (retention_window,),
        ).fetchone()["total"]
        counts["available_slots_next_14_days"] = self._get_available_slots_next_days_count(
            days=14
        )
        return counts

    def backup_database(self) -> dict:
        backup_path = self.backups_dir / f"lativet-{datetime.now():%Y%m%d-%H%M%S}.sqlite3"
        with self._lock:
            destination = sqlite3.connect(backup_path)
            try:
                self.connection.backup(destination)
            finally:
                destination.close()
        return {"path": str(backup_path)}

    def bootstrap(self, lite: bool = False, sections: set[str] | None = None) -> dict:
        payload = {
            "generated_at": now_iso(),
            "settings": self.get_settings(),
            "database_path": str(self.db_path),
            "backups_path": str(self.backups_dir),
        }
        if lite:
            payload["dashboard"] = {}
            payload["users"] = []
            return payload
        if not sections:
            payload["dashboard"] = self.get_dashboard_summary()
            payload.update(
                {
                    "users": self.list_users(),
                    "owners": self.list_owners(),
                    "patients": self.list_patients(),
                    "appointments": self.list_appointments(),
                    "availability_rules": self.list_availability_rules(),
                    "agenda_calendar": self.get_agenda_calendar(),
                    "consents": self.list_consents(),
                    "records": self.list_clinical_records(),
                    "consultations": self.list_consultations(),
                    "grooming_documents": self.list_grooming_documents(),
                    "providers": self.list_providers(),
                    "catalog_items": self.list_catalog_items(),
                    "billing_clients": self.list_billing_clients(),
                    "billing_documents": self.list_billing_documents(),
                    "cash_movements": self.list_cash_movements(),
                    "stock_movements": self.list_stock_movements(),
                    "billing_summary": self.get_billing_summary(),
                    "requests": self.get_requests_summary(),
                    "reports": self.get_reports_summary(),
                }
            )
            return payload

        include = sections.__contains__
        if include("dashboard"):
            payload["dashboard"] = self.get_dashboard_summary()
        if include("users"):
            payload["users"] = self.list_users()
        if include("owners"):
            payload["owners"] = self.list_owners()
        if include("patients"):
            payload["patients"] = self.list_patients()
        if include("appointments"):
            payload["appointments"] = self.list_appointments()
        if include("availability_rules"):
            payload["availability_rules"] = self.list_availability_rules()
        if include("agenda_calendar"):
            payload["agenda_calendar"] = self.get_agenda_calendar()
        if include("consents"):
            payload["consents"] = self.list_consents()
        if include("records"):
            payload["records"] = self.list_clinical_records()
        if include("consultations"):
            payload["consultations"] = self.list_consultations()
        if include("grooming_documents"):
            payload["grooming_documents"] = self.list_grooming_documents()
        if include("providers"):
            payload["providers"] = self.list_providers()
        if include("catalog_items"):
            payload["catalog_items"] = self.list_catalog_items()
        if include("billing_clients"):
            payload["billing_clients"] = self.list_billing_clients()
        if include("billing_documents"):
            payload["billing_documents"] = self.list_billing_documents()
        if include("cash_movements"):
            payload["cash_movements"] = self.list_cash_movements()
        if include("stock_movements"):
            payload["stock_movements"] = self.list_stock_movements()
        if include("billing_summary"):
            payload["billing_summary"] = self.get_billing_summary()
        if include("requests"):
            payload["requests"] = self.get_requests_summary()
        if include("reports"):
            payload["reports"] = self.get_reports_summary()
        return payload


class PostgresDatabase(Database):
    def __init__(self, dsn: str, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.backups_dir = self.base_dir / "backups"
        self.backups_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = Path("supabase")
        self._lock = threading.RLock()
        self.connection = PostgresConnection(dsn)
        init_indexes = os.getenv("LATIVET_POSTGRES_INIT_INDEXES", "").strip().lower() in {
            "1",
            "true",
            "on",
            "yes",
            "si",
            "s",
        }
        lock_id = 9245021
        lock_acquired = False
        with self._lock:
            for _ in range(25):
                try:
                    row = self.connection.execute(
                        "SELECT pg_try_advisory_lock(?) AS locked", (lock_id,)
                    ).fetchone()
                    lock_acquired = bool(row["locked"]) if row else False
                except Exception:
                    lock_acquired = False
                if lock_acquired:
                    break
                time_module.sleep(0.2)
            try:
                try:
                    self.connection.execute("SET statement_timeout = '60s'")
                except Exception:
                    pass
                self._init_schema(skip_indexes=not init_indexes)
                self.connection.commit()
                if not self._has_settings():
                    self.save_settings(DEFAULT_SETTINGS)
            except Exception as exc:
                try:
                    self.connection.rollback()
                except Exception:
                    pass
                message = str(exc).lower()
                if "statement timeout" in message:
                    try:
                        self._init_schema(skip_indexes=True)
                        self.connection.commit()
                        if not self._has_settings():
                            self.save_settings(DEFAULT_SETTINGS)
                    except Exception:
                        raise
                else:
                    raise
            finally:
                if lock_acquired:
                    try:
                        self.connection.execute("SELECT pg_advisory_unlock(?)", (lock_id,))
                        self.connection.commit()
                    except Exception:
                        pass

    def _ensure_column(self, table: str, column: str, definition: str) -> None:
        self.connection.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}"
        )

    def backup_database(self) -> dict:
        raise ValidationError(
            "El respaldo automatico no esta disponible en PostgreSQL/Supabase."
        )
