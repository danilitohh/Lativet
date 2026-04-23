from __future__ import annotations

import os
from datetime import date, datetime
from functools import wraps
from pathlib import Path
from zoneinfo import ZoneInfo

from .billing_exports import (
    EMAIL_TEMPLATE_VARIABLES,
    build_billing_document_pdf,
    build_billing_email_context,
    build_billing_payment_pdf,
    build_inventory_pdf,
    build_sales_report_pdf,
    render_billing_template,
)
from .compliance import get_compliance_context
from .consent_pdf import ConsentBundle, build_consent_pdf
from .database import Database, PostgresDatabase, normalize_postgres_dsn
from .google_calendar import GoogleCalendarBridge
from .mailer import SmtpConfig, send_email, send_email_with_attachment
from .validators import ValidationError, parse_date, validate_google_calendar_config


def safe_api_call(fn):
    @wraps(fn)
    def wrapper(self, *args, **kwargs):
        try:
            return {"ok": True, "data": fn(self, *args, **kwargs)}
        except ValidationError as exc:
            try:
                self._db.rollback()
            except Exception:
                pass
            return {"ok": False, "error": str(exc)}
        except Exception as exc:  # pragma: no cover
            try:
                self._db.rollback()
            except Exception:
                pass
            return {"ok": False, "error": f"Error interno: {exc}"}

    return wrapper


class LativetService:
    def __init__(self, project_dir: Path, data_dir: Path):
        self._project_dir = project_dir
        self._data_dir = data_dir
        self._data_dir.mkdir(parents=True, exist_ok=True)
        db_url = (
            os.getenv("DATABASE_URL", "").strip()
            or os.getenv("POSTGRES_URL", "").strip()
            or os.getenv("POSTGRES_PRISMA_URL", "").strip()
            or os.getenv("POSTGRES_URL_NON_POOLING", "").strip()
        )
        if os.getenv("VERCEL") and not db_url:
            raise RuntimeError(
                "DATABASE_URL/POSTGRES_URL no esta configurado. "
                "En Vercel no se puede usar SQLite local porque los datos se pierden "
                "entre despliegues y cold starts. Configura Postgres persistente."
            )
        if db_url:
            self._db = PostgresDatabase(normalize_postgres_dsn(db_url), self._data_dir)
        else:
            self._db = Database(self._data_dir)
        self._exports_dir = self._data_dir / "exports"
        self._consents_dir = self._exports_dir / "consents"
        self._billing_exports_dir = self._exports_dir / "billing"
        self._billing_documents_dir = self._billing_exports_dir / "documents"
        self._billing_payments_dir = self._billing_exports_dir / "payments"
        self._billing_reports_dir = self._billing_exports_dir / "reports"
        self._billing_inventory_dir = self._billing_exports_dir / "inventory"
        self._logo_path = self._project_dir / "images" / "logo.png"
        self._google_calendar = GoogleCalendarBridge(
            self._data_dir,
            get_secret=self._db.get_secret_setting,
            set_secret=self._db.set_secret_setting,
        )
        self._apply_smtp_env_defaults()

    def _apply_smtp_env_defaults(self) -> None:
        smtp_from = os.getenv("SMTP_FROM", "").strip()
        smtp_password = os.getenv("SMTP_APP_PASSWORD", "").strip()
        if not smtp_from or not smtp_password:
            return
        smtp_host = os.getenv("SMTP_HOST", "").strip() or "smtp.gmail.com"
        smtp_port_raw = os.getenv("SMTP_PORT", "").strip()
        try:
            smtp_port = int(smtp_port_raw) if smtp_port_raw else 587
        except ValueError:
            smtp_port = 587
        smtp_enabled_raw = os.getenv("SMTP_ENABLED", "").strip().lower()
        if smtp_enabled_raw:
            smtp_enabled = smtp_enabled_raw in {"1", "true", "on", "yes", "si", "s"}
        else:
            smtp_enabled = True

        settings = self._db.get_settings()
        current_password = self._db.get_secret_setting("smtp_app_password")
        if (
            bool(settings.get("smtp_enabled")) == smtp_enabled
            and str(settings.get("smtp_from") or "") == smtp_from
            and str(settings.get("smtp_host") or "") == smtp_host
            and int(settings.get("smtp_port") or 587) == smtp_port
            and current_password == smtp_password
        ):
            return
        updated = {
            **settings,
            "smtp_enabled": smtp_enabled,
            "smtp_from": smtp_from,
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "smtp_app_password": smtp_password,
        }
        try:
            self._db.save_settings(updated)
        except Exception:
            # Avoid breaking startup if SMTP env values are invalid.
            return

    def close(self) -> None:
        self._db.close()

    def _build_export_url(self, export_path: Path) -> str | None:
        try:
            relative = export_path.relative_to(self._exports_dir)
        except ValueError:
            return None
        return f"/exports/{relative.as_posix()}"

    @safe_api_call
    def bootstrap(self, lite: bool = False, sections: set[str] | None = None) -> dict:
        payload = self._db.bootstrap(lite=lite, sections=sections)
        payload["compliance"] = get_compliance_context()
        refresh_google_connection = not lite and (sections is None or "settings" in sections)
        payload["google_calendar"] = self._google_calendar.status(
            payload.get("settings"), refresh_connection=refresh_google_connection
        )
        return payload

    @safe_api_call
    def save_settings(self, payload: dict) -> dict:
        return self._db.save_settings(payload)

    @safe_api_call
    def save_owner(self, payload: dict) -> dict:
        return self._db.save_owner(payload)

    @safe_api_call
    def delete_owner(self, owner_id: str) -> dict:
        return self._db.delete_owner(owner_id)

    @safe_api_call
    def save_provider(self, payload: dict) -> dict:
        return self._db.save_provider(payload)

    @safe_api_call
    def delete_provider(self, provider_id: str) -> dict:
        return self._db.delete_provider(provider_id)

    @safe_api_call
    def save_user(self, payload: dict) -> dict:
        return self._db.save_user(payload)

    def authenticate_user(self, email: str, password: str) -> dict:
        return self._db.authenticate_user(email, password)

    def get_user(self, user_id: str) -> dict:
        return self._db.get_user(user_id)

    @safe_api_call
    def delete_user(self, user_id: str) -> dict:
        return self._db.delete_user(user_id)

    @safe_api_call
    def save_patient(self, payload: dict) -> dict:
        return self._db.save_patient(payload)

    @safe_api_call
    def delete_patient(self, patient_id: str) -> dict:
        return self._db.delete_patient(patient_id)

    @safe_api_call
    def save_catalog_item(self, payload: dict) -> dict:
        return self._db.save_catalog_item(payload)

    @safe_api_call
    def delete_catalog_item(self, item_id: str) -> dict:
        return self._db.delete_catalog_item(item_id)

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
    def delete_appointment(self, appointment_id: str) -> dict:
        appointment = self._db.get_appointment(appointment_id)
        google_calendar = {"synced": False, "skipped": True, "reason": "no_event"}
        if appointment.get("google_event_id"):
            google_calendar = self._sync_google_calendar_for_appointment(
                {**appointment, "status": "cancelled"}
            )
        deleted = self._db.delete_appointment(appointment_id)
        deleted["google_calendar"] = google_calendar
        return deleted

    @safe_api_call
    def save_availability_rule(self, payload: dict) -> dict:
        return self._db.save_availability_rule(payload)

    @safe_api_call
    def delete_availability_rule(self, rule_id: str) -> dict:
        return self._db.delete_availability_rule(rule_id)

    @safe_api_call
    def save_google_calendar_config(self, payload: dict) -> dict:
        data = validate_google_calendar_config(payload)
        current_settings = self._db.get_settings()
        if self._google_calendar_is_locked(current_settings):
            raise ValidationError(
                "La configuracion de Google Calendar esta protegida y no puede modificarse."
            )
        if data["credentials_json"]:
            self._google_calendar.save_credentials_json(data["credentials_json"])
        enabled = data["google_calendar_enabled"]
        if data["credentials_json"]:
            enabled = True
        if current_settings.get("google_calendar_enabled") and not enabled:
            enabled = True
        merged_settings = {
            **current_settings,
            "google_calendar_enabled": enabled,
            "google_calendar_id": data["google_calendar_id"],
            "agenda_timezone": data["agenda_timezone"],
        }
        settings = self._db.save_settings(merged_settings)
        return self._google_calendar.status(settings)

    @safe_api_call
    def connect_google_calendar(self, redirect_uri: str | None = None) -> dict:
        if self._google_calendar_is_locked(self._db.get_settings()):
            raise ValidationError(
                "La configuracion de Google Calendar esta protegida y no puede modificarse."
            )
        if redirect_uri:
            return self._google_calendar.begin_web_oauth(redirect_uri)
        self._google_calendar.connect_local()
        return self._google_calendar.status(self._db.get_settings())

    @safe_api_call
    def disconnect_google_calendar(self) -> dict:
        if self._google_calendar_is_locked(self._db.get_settings()):
            raise ValidationError(
                "La configuracion de Google Calendar esta protegida y no puede modificarse."
            )
        self._google_calendar.disconnect()
        return self._google_calendar.status(self._db.get_settings())

    @safe_api_call
    def complete_google_calendar_oauth(self, redirect_uri: str, authorization_response: str) -> dict:
        result = self._google_calendar.complete_web_oauth(
            redirect_uri=redirect_uri,
            authorization_response=authorization_response,
        )
        self._db.set_secret_setting("google_calendar_locked", "true")
        settings = self._db.get_settings()
        if not settings.get("google_calendar_enabled") or not settings.get("google_calendar_locked"):
            settings = self._db.save_settings(
                {
                    **settings,
                    "google_calendar_enabled": True,
                    "google_calendar_locked": True,
                }
            )
        return {**result, **self._google_calendar.status(settings)}

    def _google_calendar_is_locked(self, settings: dict | None = None) -> bool:
        settings = settings or self._db.get_settings()
        if settings.get("google_calendar_locked"):
            return True
        try:
            status = self._google_calendar.status(settings, refresh_connection=True)
        except Exception:
            return False
        if status.get("connected"):
            self._db.set_secret_setting("google_calendar_locked", "true")
            return True
        return False

    @safe_api_call
    def save_cash_movement(self, payload: dict) -> dict:
        return self._db.save_cash_movement(payload)

    @safe_api_call
    def open_cash_session(self, payload: dict) -> dict:
        return self._db.open_cash_session(payload)

    @safe_api_call
    def close_cash_session(self, payload: dict) -> dict:
        return self._db.close_cash_session(payload)

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
    def get_billing_document(self, document_id: str) -> dict:
        document = self._db.get_billing_document(document_id)
        settings = self._db.get_settings()
        owner = self._db.get_owner(document["owner_id"])
        context = build_billing_email_context(settings, document)
        context["recipient_email"] = (
            str(document.get("recipient_email") or "").strip()
            or str(owner.get("email") or "").strip()
        )
        default_subject = "{document_label} {document_number} - {clinic_name}"
        default_body = (
            "Hola {owner_name},\n\n"
            "Adjuntamos la {document_name} {document_number} correspondiente a la atencion de {pet_name}.\n"
            "Fecha del documento: {issue_date}\n"
            "Fecha de vencimiento: {due_date}\n"
            "Total: {total}\n\n"
            "Cualquier inquietud sera atendida por {clinic_name}."
        )
        document["email_draft"] = {
            "recipient_email": context.get("recipient_email", ""),
            "subject": render_billing_template(
                str(settings.get("email_subject_template") or ""),
                context,
                default_subject,
            ),
            "body": render_billing_template(
                str(settings.get("email_body_template") or ""),
                context,
                default_body,
            ),
            "template_variables": EMAIL_TEMPLATE_VARIABLES,
        }
        return document

    @safe_api_call
    def get_sales_report(self, start_date_value: str | None = None, end_date_value: str | None = None) -> dict:
        report = self._db.get_sales_report(start_date_value, end_date_value)
        report["template_variables"] = EMAIL_TEMPLATE_VARIABLES
        return report

    @safe_api_call
    def generate_billing_document_pdf(self, document_id: str) -> dict:
        document = self._db.get_billing_document(document_id)
        pdf_path = build_billing_document_pdf(
            output_dir=self._billing_documents_dir,
            settings=self._db.get_settings(),
            document=document,
            lines=document.get("lines") or [],
            logo_path=self._logo_path if self._logo_path.exists() else None,
        )
        return {
            "document": document,
            "path": str(pdf_path),
            "url": self._build_export_url(pdf_path),
        }

    @safe_api_call
    def generate_billing_payment_pdf(self, document_id: str, payment_id: str) -> dict:
        document = self._db.get_billing_document(document_id)
        payment = next(
            (item for item in (document.get("payments") or []) if str(item.get("id")) == payment_id),
            None,
        )
        if not payment:
            raise ValidationError("El abono solicitado no existe para este documento.")
        payment_payload = {
            **payment,
            "document_balance_due": document.get("balance_due") or 0,
        }
        pdf_path = build_billing_payment_pdf(
            output_dir=self._billing_payments_dir,
            settings=self._db.get_settings(),
            document=document,
            payment=payment_payload,
            logo_path=self._logo_path if self._logo_path.exists() else None,
        )
        return {
            "payment": payment_payload,
            "path": str(pdf_path),
            "url": self._build_export_url(pdf_path),
        }

    @safe_api_call
    def generate_sales_report_pdf(
        self, start_date_value: str | None = None, end_date_value: str | None = None
    ) -> dict:
        report = self._db.get_sales_report(start_date_value, end_date_value)
        pdf_path = build_sales_report_pdf(
            output_dir=self._billing_reports_dir,
            settings=self._db.get_settings(),
            report=report,
            logo_path=self._logo_path if self._logo_path.exists() else None,
        )
        return {
            "summary": report.get("summary") or {},
            "path": str(pdf_path),
            "url": self._build_export_url(pdf_path),
        }

    @safe_api_call
    def generate_inventory_pdf(self, as_of_date: str | None = None) -> dict:
        report = self._db.get_sales_report(end_date_value=as_of_date)
        summary = report.get("summary") or {}
        pdf_path = build_inventory_pdf(
            output_dir=self._billing_inventory_dir,
            settings=self._db.get_settings(),
            as_of_date=str(summary.get("end_date") or ""),
            inventory_items=report.get("inventory_items") or [],
            low_stock_items=report.get("low_stock_items") or [],
            logo_path=self._logo_path if self._logo_path.exists() else None,
        )
        return {
            "as_of_date": summary.get("end_date"),
            "path": str(pdf_path),
            "url": self._build_export_url(pdf_path),
        }

    @safe_api_call
    def send_billing_document_email(self, document_id: str, payload: dict | None = None) -> dict:
        settings = self._db.get_settings()
        if not settings.get("smtp_enabled"):
            raise ValidationError("El correo SMTP esta deshabilitado en configuracion.")
        sender = (settings.get("smtp_from") or "").strip()
        if not sender:
            raise ValidationError("Debes configurar el correo remitente para enviar documentos.")
        password = self._db.get_secret_setting("smtp_app_password").strip()
        if not password:
            raise ValidationError("Falta la app password del correo SMTP.")

        document = self._db.get_billing_document(document_id)
        owner = self._db.get_owner(document["owner_id"])
        pdf_path = build_billing_document_pdf(
            output_dir=self._billing_documents_dir,
            settings=settings,
            document=document,
            lines=document.get("lines") or [],
            logo_path=self._logo_path if self._logo_path.exists() else None,
        )

        email_payload = payload or {}
        context = build_billing_email_context(settings, document)
        context["recipient_email"] = (
            str(document.get("recipient_email") or "").strip()
            or str(owner.get("email") or "").strip()
        )
        default_subject = "{document_label} {document_number} - {clinic_name}"
        default_body = (
            "Hola {owner_name},\n\n"
            "Adjuntamos la {document_name} {document_number} correspondiente a la atencion de {pet_name}.\n"
            "Fecha del documento: {issue_date}\n"
            "Fecha de vencimiento: {due_date}\n"
            "Total: {total}\n\n"
            "Cualquier inquietud sera atendida por {clinic_name}."
        )
        to_address = (
            str(email_payload.get("recipient_email") or "").strip()
            or context.get("recipient_email", "")
        )
        if not to_address:
            raise ValidationError("El documento no tiene un correo destinatario configurado.")
        subject = render_billing_template(
            str(email_payload.get("subject") or settings.get("email_subject_template") or ""),
            context,
            default_subject,
        )
        body = render_billing_template(
            str(email_payload.get("body") or settings.get("email_body_template") or ""),
            context,
            default_body,
        )
        if not subject.strip():
            raise ValidationError("El asunto del correo no puede quedar vacio.")
        if not body.strip():
            raise ValidationError("El cuerpo del correo no puede quedar vacio.")

        config = SmtpConfig(
            host=(settings.get("smtp_host") or "smtp.gmail.com").strip(),
            port=int(settings.get("smtp_port") or 587),
            username=sender,
            password=password,
            sender=sender,
        )
        send_email_with_attachment(
            config,
            to_address=to_address,
            subject=subject,
            body=body,
            attachment_path=str(pdf_path),
            attachment_name=pdf_path.name,
        )
        return {
            "sent": True,
            "to": to_address,
            "subject": subject,
            "pdf_url": self._build_export_url(pdf_path),
        }

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
        consultation = self._db.save_consultation(payload)
        consultation["control_reminder"] = self._describe_control_reminder(
            consultation["id"]
        )
        return consultation

    @safe_api_call
    def delete_consultation(self, consultation_id: str) -> dict:
        return self._db.delete_consultation(consultation_id)

    def _current_local_date(self) -> tuple[str, str]:
        settings = self._db.get_settings()
        timezone_name = settings.get("agenda_timezone") or "America/Bogota"
        try:
            timezone = ZoneInfo(timezone_name)
        except Exception:
            timezone_name = "America/Bogota"
            timezone = ZoneInfo(timezone_name)
        return datetime.now(timezone).date().isoformat(), timezone_name

    def _describe_control_reminder(self, consultation_id: str) -> dict:
        reminder = self._db.get_control_reminder_for_consultation(consultation_id)
        if not reminder:
            return {"scheduled": False}
        reminder_kind, reminder_label = self._resolve_control_reminder_kind(reminder)
        settings = self._db.get_settings()
        warnings: list[str] = []
        if not settings.get("smtp_enabled"):
            warnings.append("El correo SMTP esta deshabilitado.")
        sender = (settings.get("smtp_from") or "").strip()
        if not sender:
            warnings.append("No hay un correo remitente configurado.")
        password = self._db.get_secret_setting("smtp_app_password").strip()
        if not password:
            warnings.append("Falta la app password del correo SMTP.")
        owner_email = (reminder.get("owner_email") or "").strip()
        if not owner_email:
            warnings.append("El propietario no tiene correo registrado.")
        return {
            "scheduled": True,
            "scheduled_for": reminder.get("scheduled_for"),
            "status": reminder.get("status") or "pending",
            "kind": reminder_kind,
            "label": reminder_label,
            "owner_email": owner_email,
            "ready_to_send": not warnings,
            "warnings": warnings,
        }

    def _resolve_control_reminder_kind(self, reminder: dict | None) -> tuple[str, str]:
        consultation_type = str((reminder or {}).get("consultation_type") or "").strip()
        if consultation_type == "Vacunacion":
            return "vaccination", "vacunacion"
        if consultation_type == "Desparasitacion":
            return "deworming", "desparasitacion"
        return "control", "control"

    def _send_control_reminder_email(self, reminder: dict) -> dict:
        settings = self._db.get_settings()
        if not settings.get("smtp_enabled"):
            return {"sent": False, "skipped": True, "reason": "smtp_disabled"}

        sender = (settings.get("smtp_from") or "").strip()
        if not sender:
            return {"sent": False, "skipped": True, "reason": "smtp_from_missing"}

        password = self._db.get_secret_setting("smtp_app_password").strip()
        if not password:
            return {"sent": False, "skipped": True, "reason": "smtp_password_missing"}

        to_address = (reminder.get("owner_email") or "").strip()
        if not to_address:
            return {"sent": False, "skipped": True, "reason": "owner_email_missing"}

        host = (settings.get("smtp_host") or "smtp.gmail.com").strip()
        port = int(settings.get("smtp_port") or 587)
        clinic_name = settings.get("clinic_name") or "Lativet"
        patient_name = reminder.get("patient_name") or "tu mascota"
        owner_name = reminder.get("owner_name") or "propietario"
        control_date = reminder.get("scheduled_for") or ""
        consultation_title = reminder.get("consultation_title") or "control veterinario"
        reminder_kind, _ = self._resolve_control_reminder_kind(reminder)
        try:
            control_date_label = date.fromisoformat(control_date).strftime("%d/%m/%Y")
        except ValueError:
            control_date_label = control_date

        if reminder_kind == "vaccination":
            subject = f"{clinic_name} - Recordatorio de vacunacion para {patient_name}"
            body = (
                f"Hola {owner_name},\n\n"
                f"Te recordamos que {patient_name} tiene vacunacion programada para el {control_date_label}.\n"
                f"Vacuna registrada: {consultation_title}.\n\n"
                "Si necesitas reprogramar o confirmar la asistencia, comunicate con la clinica.\n\n"
                "Este correo fue generado automaticamente por Lativet.\n"
            )
        elif reminder_kind == "deworming":
            subject = f"{clinic_name} - Recordatorio de desparasitacion para {patient_name}"
            body = (
                f"Hola {owner_name},\n\n"
                f"Te recordamos que {patient_name} tiene desparasitacion programada para el {control_date_label}.\n"
                f"Producto registrado: {consultation_title}.\n\n"
                "Si necesitas reprogramar o confirmar la asistencia, comunicate con la clinica.\n\n"
                "Este correo fue generado automaticamente por Lativet.\n"
            )
        else:
            subject = f"{clinic_name} - Recordatorio de control para {patient_name}"
            body = (
                f"Hola {owner_name},\n\n"
                f"Te recordamos que {patient_name} tiene control programado para el {control_date_label}.\n"
                f"Motivo registrado: {consultation_title}.\n\n"
                "Si necesitas reprogramar o confirmar la asistencia, comunicate con la clinica.\n\n"
                "Este correo fue generado automaticamente por Lativet.\n"
            )

        config = SmtpConfig(
            host=host,
            port=port,
            username=sender,
            password=password,
            sender=sender,
        )
        try:
            send_email(
                config,
                to_address=to_address,
                subject=subject,
                body=body,
            )
            return {"sent": True, "to": to_address}
        except Exception as exc:
            return {"sent": False, "to": to_address, "error": str(exc)}

    @safe_api_call
    def run_control_reminder_job(self, run_date: str | None = None, limit: int = 100) -> dict:
        effective_date, timezone_name = self._current_local_date()
        if run_date:
            effective_date = parse_date(run_date, "Fecha de proceso")
        reminders = self._db.list_due_control_reminders(effective_date, limit=limit)
        result = {
            "date": effective_date,
            "timezone": timezone_name,
            "processed": 0,
            "sent": 0,
            "failed": 0,
            "skipped": 0,
            "items": [],
        }
        for reminder in reminders:
            delivery = self._send_control_reminder_email(reminder)
            result["processed"] += 1
            item = {
                "id": reminder.get("id"),
                "consultation_id": reminder.get("consultation_id"),
                "patient_name": reminder.get("patient_name"),
                "owner_email": reminder.get("owner_email"),
                "scheduled_for": reminder.get("scheduled_for"),
                "kind": self._resolve_control_reminder_kind(reminder)[0],
            }
            if delivery.get("sent"):
                self._db.mark_control_reminder_sent(reminder["id"])
                result["sent"] += 1
                item["status"] = "sent"
            else:
                error_message = delivery.get("reason") or delivery.get("error") or "send_failed"
                self._db.mark_control_reminder_pending(reminder["id"], error_message)
                item["status"] = "pending"
                item["error"] = error_message
                if delivery.get("skipped"):
                    result["skipped"] += 1
                else:
                    result["failed"] += 1
            result["items"].append(item)
        return result

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
