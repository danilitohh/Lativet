from __future__ import annotations

import os
from functools import wraps
from pathlib import Path

from .compliance import get_compliance_context
from .consent_pdf import ConsentBundle, build_consent_pdf
from .database import Database, PostgresDatabase
from .google_calendar import GoogleCalendarBridge
from .mailer import SmtpConfig, send_email_with_attachment
from .validators import ValidationError, validate_google_calendar_config


def safe_api_call(fn):
    @wraps(fn)
    def wrapper(self, *args, **kwargs):
        try:
            return {"ok": True, "data": fn(self, *args, **kwargs)}
        except ValidationError as exc:
            return {"ok": False, "error": str(exc)}
        except Exception as exc:  # pragma: no cover
            return {"ok": False, "error": f"Error interno: {exc}"}

    return wrapper


class LativetService:
    def __init__(self, project_dir: Path, data_dir: Path):
        self._project_dir = project_dir
        self._data_dir = data_dir
        self._data_dir.mkdir(parents=True, exist_ok=True)
        db_url = os.getenv("DATABASE_URL", "").strip()
        if db_url:
            self._db = PostgresDatabase(db_url, self._data_dir)
        else:
            self._db = Database(self._data_dir)
        self._exports_dir = self._data_dir / "exports"
        self._consents_dir = self._exports_dir / "consents"
        self._logo_path = self._project_dir / "images" / "logo.png"
        self._google_calendar = GoogleCalendarBridge(self._data_dir)

    def close(self) -> None:
        self._db.close()

    def _build_export_url(self, export_path: Path) -> str | None:
        try:
            relative = export_path.relative_to(self._exports_dir)
        except ValueError:
            return None
        return f"/exports/{relative.as_posix()}"

    @safe_api_call
    def bootstrap(self) -> dict:
        payload = self._db.bootstrap()
        payload["compliance"] = get_compliance_context()
        payload["google_calendar"] = self._google_calendar.status(payload.get("settings"))
        return payload

    @safe_api_call
    def save_settings(self, payload: dict) -> dict:
        return self._db.save_settings(payload)

    @safe_api_call
    def save_owner(self, payload: dict) -> dict:
        return self._db.save_owner(payload)

    @safe_api_call
    def save_provider(self, payload: dict) -> dict:
        return self._db.save_provider(payload)

    @safe_api_call
    def save_patient(self, payload: dict) -> dict:
        return self._db.save_patient(payload)

    @safe_api_call
    def save_catalog_item(self, payload: dict) -> dict:
        return self._db.save_catalog_item(payload)

    @safe_api_call
    def save_appointment(self, payload: dict) -> dict:
        appointment = self._db.save_appointment(payload)
        appointment["google_calendar"] = self._sync_google_calendar_for_appointment(appointment)
        return appointment

    @safe_api_call
    def update_appointment_status(self, appointment_id: str, status: str) -> dict:
        appointment = self._db.update_appointment_status(appointment_id, status)
        appointment["google_calendar"] = self._sync_google_calendar_for_appointment(appointment)
        return appointment

    @safe_api_call
    def save_availability_rule(self, payload: dict) -> dict:
        return self._db.save_availability_rule(payload)

    @safe_api_call
    def delete_availability_rule(self, rule_id: str) -> dict:
        return self._db.delete_availability_rule(rule_id)

    @safe_api_call
    def save_google_calendar_config(self, payload: dict) -> dict:
        data = validate_google_calendar_config(payload)
        if data["credentials_json"]:
            self._google_calendar.save_credentials_json(data["credentials_json"])
        merged_settings = {
            **self._db.get_settings(),
            "google_calendar_enabled": data["google_calendar_enabled"],
            "google_calendar_id": data["google_calendar_id"],
            "agenda_timezone": data["agenda_timezone"],
        }
        settings = self._db.save_settings(merged_settings)
        return self._google_calendar.status(settings)

    @safe_api_call
    def connect_google_calendar(self) -> dict:
        self._google_calendar.connect()
        return self._google_calendar.status(self._db.get_settings())

    @safe_api_call
    def disconnect_google_calendar(self) -> dict:
        self._google_calendar.disconnect()
        return self._google_calendar.status(self._db.get_settings())

    @safe_api_call
    def save_cash_movement(self, payload: dict) -> dict:
        return self._db.save_cash_movement(payload)

    @safe_api_call
    def save_stock_adjustment(self, payload: dict) -> dict:
        return self._db.adjust_catalog_stock(payload)

    @safe_api_call
    def save_billing_document(self, payload: dict) -> dict:
        return self._db.save_billing_document(payload)

    @safe_api_call
    def register_billing_payment(self, payload: dict) -> dict:
        return self._db.register_billing_payment(payload)

    @safe_api_call
    def save_consent(self, payload: dict) -> dict:
        consent = self._db.save_consent(payload)
        response: dict = {"consent": consent}

        try:
            bundle_data = self._db.get_consent_bundle(consent["id"])
            bundle = ConsentBundle(
                settings=bundle_data["settings"],
                owner=bundle_data["owner"],
                patient=bundle_data["patient"],
                consent=bundle_data["consent"],
                compliance=get_compliance_context(),
            )
            pdf_path = build_consent_pdf(
                bundle,
                output_dir=self._consents_dir,
                logo_path=self._logo_path if self._logo_path.exists() else None,
            )
            response["pdf"] = {
                "path": str(pdf_path),
                "url": self._build_export_url(pdf_path),
            }
        except Exception as exc:
            response["pdf"] = {"error": f"No fue posible generar el PDF: {exc}"}
            return response

        response["email"] = self._email_consent_pdf(bundle, pdf_path)
        return response

    def _email_consent_pdf(self, bundle: ConsentBundle, pdf_path: Path) -> dict:
        settings = bundle.settings or {}
        if not settings.get("smtp_enabled"):
            return {"sent": False, "skipped": True, "reason": "smtp_disabled"}

        sender = (settings.get("smtp_from") or "").strip()
        if not sender:
            return {"sent": False, "skipped": True, "reason": "smtp_from_missing"}

        password = self._db.get_secret_setting("smtp_app_password")
        if not password.strip():
            return {"sent": False, "skipped": True, "reason": "smtp_password_missing"}

        owner_email = (bundle.owner or {}).get("email") or ""
        to_address = owner_email.strip()
        if not to_address:
            return {"sent": False, "skipped": True, "reason": "owner_email_missing"}

        host = (settings.get("smtp_host") or "smtp.gmail.com").strip()
        port = int(settings.get("smtp_port") or 587)
        clinic_name = settings.get("clinic_name") or "Clinica veterinaria"
        consent_type = (bundle.consent or {}).get("consent_type") or "Consentimiento"
        patient_name = (bundle.patient or {}).get("name") or "Paciente"

        subject = f"{clinic_name} - Consentimiento informado ({consent_type}) - {patient_name}"
        body = (
            f"Adjunto se envia el consentimiento informado ({consent_type}) correspondiente a {patient_name}.\n\n"
            "Este correo fue generado automaticamente por la aplicacion web.\n"
        )

        config = SmtpConfig(
            host=host,
            port=port,
            username=sender,
            password=password,
            sender=sender,
        )
        try:
            send_email_with_attachment(
                config,
                to_address=to_address,
                subject=subject,
                body=body,
                attachment_path=str(pdf_path),
                attachment_name=pdf_path.name,
            )
            return {"sent": True, "to": to_address}
        except Exception as exc:
            return {"sent": False, "to": to_address, "error": str(exc)}

    @safe_api_call
    def save_clinical_record(self, payload: dict, finalize: bool = False) -> dict:
        return self._db.save_clinical_record(payload, finalize=finalize)

    @safe_api_call
    def save_consultation(self, payload: dict) -> dict:
        return self._db.save_consultation(payload)

    @safe_api_call
    def save_evolution(self, payload: dict) -> dict:
        return self._db.save_evolution(payload)

    @safe_api_call
    def save_grooming_document(self, payload: dict) -> dict:
        return self._db.save_grooming_document(payload)

    @safe_api_call
    def backup_database(self) -> dict:
        return self._db.backup_database()

    def _sync_google_calendar_for_appointment(self, appointment: dict) -> dict:
        settings = self._db.get_settings()
        try:
            result = self._google_calendar.sync_appointment(appointment, settings)
        except Exception as exc:
            self._db.update_appointment_google_sync(
                appointment["id"],
                event_id=appointment.get("google_event_id") or "",
                event_url=appointment.get("google_event_url") or "",
                sync_status="error",
                sync_error=str(exc),
            )
            return {"synced": False, "error": str(exc)}

        if result.get("synced"):
            self._db.update_appointment_google_sync(
                appointment["id"],
                event_id=result.get("event_id") or appointment.get("google_event_id") or "",
                event_url=result.get("event_url") or appointment.get("google_event_url") or "",
                sync_status=result.get("status") or "synced",
                sync_error="",
            )
        elif result.get("skipped"):
            self._db.update_appointment_google_sync(
                appointment["id"],
                event_id=appointment.get("google_event_id") or "",
                event_url=appointment.get("google_event_url") or "",
                sync_status=result.get("reason") or "skipped",
                sync_error="",
            )
        return result
