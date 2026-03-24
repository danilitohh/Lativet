from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

from .validators import ValidationError


GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


class GoogleCalendarBridge:
    def __init__(self, data_dir: Path):
        self._base_dir = data_dir / "integrations" / "google_calendar"
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._credentials_path = self._base_dir / "credentials.json"
        self._token_path = self._base_dir / "token.json"

    def status(self, settings: dict | None = None) -> dict:
        settings = settings or {}
        connected = False
        token_present = self._token_path.exists()
        credentials_present = self._credentials_path.exists()
        error = ""
        try:
            connected = bool(self._load_credentials(allow_refresh=False))
        except ValidationError as exc:
            error = str(exc)
        return {
            "enabled": bool(settings.get("google_calendar_enabled")),
            "calendar_id": settings.get("google_calendar_id") or "primary",
            "timezone": settings.get("agenda_timezone") or "America/Bogota",
            "credentials_present": credentials_present,
            "token_present": token_present,
            "connected": connected,
            "credentials_path": str(self._credentials_path),
            "token_path": str(self._token_path),
            "error": error,
        }

    def save_credentials_json(self, raw_json: str) -> dict:
        text = (raw_json or "").strip()
        if not text:
            return {"saved": False, "path": str(self._credentials_path)}
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValidationError("El JSON de credenciales de Google no es valido.") from exc
        if not isinstance(data, dict) or not any(key in data for key in ("installed", "web")):
            raise ValidationError(
                "Las credenciales deben corresponder a un cliente OAuth de Google."
            )
        self._credentials_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return {"saved": True, "path": str(self._credentials_path)}

    def connect(self) -> dict:
        self._require_google_packages()
        if not self._credentials_path.exists():
            raise ValidationError(
                "Primero guarda el JSON del cliente OAuth de Google Calendar."
            )
        from google_auth_oauthlib.flow import InstalledAppFlow

        flow = InstalledAppFlow.from_client_secrets_file(
            str(self._credentials_path), GOOGLE_CALENDAR_SCOPES
        )
        creds = flow.run_local_server(
            host="127.0.0.1",
            port=0,
            open_browser=True,
            prompt="consent",
            authorization_prompt_message=(
                "Se abrira el navegador para conectar Google Calendar."
            ),
            success_message=(
                "Google Calendar conectado. Puedes volver a Lativet y cerrar esta ventana."
            ),
        )
        self._token_path.write_text(creds.to_json(), encoding="utf-8")
        return {"connected": True, "path": str(self._token_path)}

    def disconnect(self) -> dict:
        removed = False
        if self._token_path.exists():
            self._token_path.unlink()
            removed = True
        return {"disconnected": True, "removed_token": removed}

    def sync_appointment(self, appointment: dict, settings: dict) -> dict:
        if not settings.get("google_calendar_enabled"):
            return {"synced": False, "skipped": True, "reason": "disabled"}

        service = self._build_service()
        calendar_id = settings.get("google_calendar_id") or "primary"
        body = self._build_event_body(appointment, settings)
        google_event_id = appointment.get("google_event_id") or ""

        if appointment.get("status") == "cancelled" and google_event_id:
            result = (
                service.events()
                .patch(calendarId=calendar_id, eventId=google_event_id, body={"status": "cancelled"})
                .execute()
            )
            return {
                "synced": True,
                "event_id": result.get("id", google_event_id),
                "event_url": result.get("htmlLink", ""),
                "status": result.get("status", "cancelled"),
            }

        if google_event_id:
            result = (
                service.events()
                .patch(calendarId=calendar_id, eventId=google_event_id, body=body)
                .execute()
            )
        else:
            result = service.events().insert(calendarId=calendar_id, body=body).execute()

        return {
            "synced": True,
            "event_id": result.get("id", ""),
            "event_url": result.get("htmlLink", ""),
            "status": result.get("status", "confirmed"),
        }

    def _build_event_body(self, appointment: dict, settings: dict) -> dict:
        timezone = settings.get("agenda_timezone") or "America/Bogota"
        start_at = datetime.fromisoformat(appointment["appointment_at"])
        end_at = start_at + timedelta(minutes=int(appointment.get("duration_minutes") or 30))
        patient_name = appointment.get("patient_name") or "Paciente"
        owner_name = appointment.get("owner_name") or "Sin propietario"
        clinic_name = settings.get("clinic_name") or "Lativet"
        professional_name = appointment.get("professional_name") or "Agenda general"
        notes = (appointment.get("notes") or "").strip()
        reason = appointment.get("reason") or "Cita veterinaria"
        description_lines = [
            f"Paciente: {patient_name}",
            f"Propietario: {owner_name}",
            f"Motivo: {reason}",
            f"Responsable: {professional_name}",
        ]
        if notes:
            description_lines.append(f"Notas: {notes}")
        return {
            "summary": f"{clinic_name} - {patient_name}",
            "description": "\n".join(description_lines),
            "start": {"dateTime": start_at.isoformat(timespec='seconds'), "timeZone": timezone},
            "end": {"dateTime": end_at.isoformat(timespec='seconds'), "timeZone": timezone},
            "status": "cancelled" if appointment.get("status") == "cancelled" else "confirmed",
        }

    def _build_service(self):
        self._require_google_packages()
        from googleapiclient.discovery import build

        creds = self._load_credentials(allow_refresh=True)
        if not creds:
            raise ValidationError("Google Calendar no esta conectado todavia.")
        return build("calendar", "v3", credentials=creds, cache_discovery=False)

    def _load_credentials(self, allow_refresh: bool):
        if not self._token_path.exists():
            return None
        self._require_google_packages()
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials

        creds = Credentials.from_authorized_user_file(
            str(self._token_path), GOOGLE_CALENDAR_SCOPES
        )
        if allow_refresh and creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            self._token_path.write_text(creds.to_json(), encoding="utf-8")
        if not creds or not creds.valid:
            return None
        return creds

    def _require_google_packages(self) -> None:
        try:
            import google.auth.transport.requests  # noqa: F401
            import google.oauth2.credentials  # noqa: F401
            import google_auth_oauthlib.flow  # noqa: F401
            import googleapiclient.discovery  # noqa: F401
        except ImportError as exc:
            raise ValidationError(
                "Faltan dependencias de Google Calendar. Instala google-api-python-client, "
                "google-auth-oauthlib y google-auth-httplib2."
            ) from exc
