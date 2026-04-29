from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

from .validators import ValidationError


GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


class GoogleCalendarBridge:
    def __init__(self, data_dir: Path, get_secret=None, set_secret=None):
        self._base_dir = data_dir / "integrations" / "google_calendar"
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._credentials_path = self._base_dir / "credentials.json"
        self._token_path = self._base_dir / "token.json"
        self._get_secret = get_secret
        self._set_secret = set_secret

    def status(self, settings: dict | None = None, refresh_connection: bool = True) -> dict:
        settings = settings or {}
        connected = False
        token_present = bool(self._read_secret("google_calendar_token_json")) or self._token_path.exists()
        credentials_present = bool(self._read_secret("google_calendar_credentials_json")) or self._credentials_path.exists()
        error = ""
        if refresh_connection:
            try:
                connected = bool(self._load_credentials(allow_refresh=True))
            except ValidationError as exc:
                error = str(exc)
            except Exception as exc:
                error = str(exc)
        else:
            connected = bool(token_present and credentials_present)
        if refresh_connection and not connected and token_present and credentials_present and not error:
            error = "La conexion con Google Calendar expiro o ya no es valida. Reconecta la cuenta."
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
        if self._set_secret:
            self._set_secret("google_calendar_credentials_json", json.dumps(data))
        try:
            self._credentials_path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception:
            pass
        return {"saved": True, "path": str(self._credentials_path)}

    def begin_web_oauth(self, redirect_uri: str) -> dict:
        self._require_google_packages()
        client_config = self._load_client_config()
        if "web" not in client_config:
            raise ValidationError(
                "Para produccion debes usar credenciales OAuth de tipo Aplicacion web."
            )
        from google_auth_oauthlib.flow import Flow

        flow = Flow.from_client_config(client_config, scopes=GOOGLE_CALENDAR_SCOPES)
        flow.redirect_uri = redirect_uri
        auth_url, state = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            include_granted_scopes="true",
        )
        if self._set_secret:
            self._set_secret("google_calendar_oauth_state", state)
            verifier = getattr(flow, "code_verifier", "") or ""
            self._set_secret("google_calendar_oauth_verifier", verifier)
        return {"auth_url": auth_url}

    def complete_web_oauth(self, redirect_uri: str, authorization_response: str) -> dict:
        self._require_google_packages()
        client_config = self._load_client_config()
        if "web" not in client_config:
            raise ValidationError(
                "Para produccion debes usar credenciales OAuth de tipo Aplicacion web."
            )
        from google_auth_oauthlib.flow import Flow

        state = self._read_secret("google_calendar_oauth_state") or None
        verifier = self._read_secret("google_calendar_oauth_verifier") or None
        flow = Flow.from_client_config(
            client_config, scopes=GOOGLE_CALENDAR_SCOPES, state=state
        )
        flow.redirect_uri = redirect_uri
        if verifier:
            flow.code_verifier = verifier
            flow.fetch_token(
                authorization_response=authorization_response,
                code_verifier=verifier,
            )
        else:
            flow.fetch_token(authorization_response=authorization_response)
        creds = flow.credentials
        self._save_token(creds.to_json())
        if self._set_secret:
            self._set_secret("google_calendar_oauth_state", "")
            self._set_secret("google_calendar_oauth_verifier", "")
        return {"connected": True}

    def connect_local(self) -> dict:
        self._require_google_packages()
        client_config = self._load_client_config()
        if not client_config:
            raise ValidationError(
                "Primero guarda el JSON del cliente OAuth de Google Calendar."
            )
        from google_auth_oauthlib.flow import InstalledAppFlow

        flow = InstalledAppFlow.from_client_config(client_config, GOOGLE_CALENDAR_SCOPES)
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
        self._save_token(creds.to_json())
        return {"connected": True, "path": str(self._token_path)}

    def disconnect(self) -> dict:
        removed = False
        if self._set_secret:
            self._set_secret("google_calendar_token_json", "")
        if self._token_path.exists():
            self._token_path.unlink()
            removed = True
        return {"disconnected": True, "removed_token": removed}

    def sync_appointment(self, appointment: dict, settings: dict) -> dict:
        if not settings.get("google_calendar_enabled"):
            if not self._load_credentials(allow_refresh=True):
                return {"synced": False, "skipped": True, "reason": "disabled"}

        service = self._build_service()
        calendar_id = settings.get("google_calendar_id") or "primary"
        body = self._build_event_body(appointment, settings)
        google_event_id = appointment.get("google_event_id") or ""
        send_updates = "all" if body.get("attendees") else "none"

        if appointment.get("status") == "cancelled" and google_event_id:
            result = (
                service.events()
                .patch(
                    calendarId=calendar_id,
                    eventId=google_event_id,
                    body={"status": "cancelled"},
                    sendUpdates=send_updates,
                )
                .execute()
            )
            return {
                "synced": True,
                "event_id": result.get("id", google_event_id),
                "event_url": result.get("htmlLink", ""),
                "status": result.get("status", "cancelled"),
                "attendee_response_status": self._extract_attendee_response_status(
                    result, appointment
                ),
                "invite_sent": bool(body.get("attendees")),
            }

        if google_event_id:
            result = (
                service.events()
                .patch(
                    calendarId=calendar_id,
                    eventId=google_event_id,
                    body=body,
                    sendUpdates=send_updates,
                )
                .execute()
            )
        else:
            result = (
                service.events()
                .insert(calendarId=calendar_id, body=body, sendUpdates=send_updates)
                .execute()
            )

        return {
            "synced": True,
            "event_id": result.get("id", ""),
            "event_url": result.get("htmlLink", ""),
            "status": result.get("status", "confirmed"),
            "attendee_response_status": self._extract_attendee_response_status(
                result, appointment
            ),
            "invite_sent": bool(body.get("attendees")),
        }

    def get_appointment_attendee_response(self, appointment: dict, settings: dict) -> dict:
        google_event_id = str(appointment.get("google_event_id") or "").strip()
        if not google_event_id:
            return {"synced": False, "skipped": True, "reason": "no_event"}
        service = self._build_service()
        calendar_id = settings.get("google_calendar_id") or "primary"
        result = service.events().get(calendarId=calendar_id, eventId=google_event_id).execute()
        return {
            "synced": True,
            "event_id": result.get("id", google_event_id),
            "event_url": result.get("htmlLink", ""),
            "status": result.get("status", "confirmed"),
            "attendee_response_status": self._extract_attendee_response_status(
                result, appointment
            ),
        }

    def _build_event_body(self, appointment: dict, settings: dict) -> dict:
        timezone = settings.get("agenda_timezone") or "America/Bogota"
        start_at = datetime.fromisoformat(appointment["appointment_at"])
        end_at = start_at + timedelta(minutes=int(appointment.get("duration_minutes") or 30))
        patient_name = appointment.get("patient_name") or "Paciente"
        owner_name = appointment.get("owner_name") or "Sin propietario"
        owner_email = self._get_owner_email(appointment)
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
        event = {
            "summary": f"{clinic_name} - {patient_name}",
            "description": "\n".join(description_lines),
            "start": {"dateTime": start_at.isoformat(timespec='seconds'), "timeZone": timezone},
            "end": {"dateTime": end_at.isoformat(timespec='seconds'), "timeZone": timezone},
            "status": "cancelled" if appointment.get("status") == "cancelled" else "confirmed",
        }
        if owner_email:
            event["attendees"] = [
                {
                    "email": owner_email,
                    "displayName": owner_name,
                }
            ]
        return event

    def _get_owner_email(self, appointment: dict) -> str:
        return str(appointment.get("owner_email") or "").strip().lower()

    def _extract_attendee_response_status(self, event: dict, appointment: dict) -> str:
        attendees = event.get("attendees") or []
        if not attendees:
            return ""
        owner_email = self._get_owner_email(appointment)
        if owner_email:
            for attendee in attendees:
                attendee_email = str(attendee.get("email") or "").strip().lower()
                if attendee_email == owner_email:
                    return str(attendee.get("responseStatus") or "").strip()
        return str((attendees[0] or {}).get("responseStatus") or "").strip()

    def _build_service(self):
        self._require_google_packages()
        from googleapiclient.discovery import build

        creds = self._load_credentials(allow_refresh=True)
        if not creds:
            raise ValidationError("Google Calendar no esta conectado todavia.")
        return build("calendar", "v3", credentials=creds, cache_discovery=False)

    def _load_credentials(self, allow_refresh: bool):
        raw_token = self._read_secret("google_calendar_token_json")
        if not raw_token and not self._token_path.exists():
            return None
        self._require_google_packages()
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials

        if raw_token:
            try:
                token_payload = json.loads(raw_token)
            except json.JSONDecodeError:
                token_payload = None
            creds = (
                Credentials.from_authorized_user_info(token_payload, GOOGLE_CALENDAR_SCOPES)
                if token_payload
                else None
            )
        else:
            creds = Credentials.from_authorized_user_file(
                str(self._token_path), GOOGLE_CALENDAR_SCOPES
            )
        if allow_refresh and creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as exc:
                if self._is_invalid_grant_error(exc):
                    self.disconnect()
                    raise ValidationError(
                        "La autorizacion de Google Calendar vencio o fue revocada. "
                        "Desconecta y vuelve a conectar la cuenta."
                    ) from exc
                raise ValidationError(
                    "No fue posible renovar la conexion con Google Calendar. "
                    "Intenta nuevamente en unos minutos."
                ) from exc
            self._save_token(creds.to_json())
        if not creds or not creds.valid:
            return None
        return creds

    def _is_invalid_grant_error(self, exc: Exception) -> bool:
        message = str(exc or "").strip().lower()
        return (
            "invalid_grant" in message
            or "expired or revoked" in message
            or "token has been expired or revoked" in message
        )

    def _read_secret(self, key: str) -> str:
        if not self._get_secret:
            return ""
        try:
            return self._get_secret(key) or ""
        except Exception:
            return ""

    def _save_token(self, token_json: str) -> None:
        merged_json = token_json
        try:
            payload = json.loads(token_json) if token_json else None
        except json.JSONDecodeError:
            payload = None
        if isinstance(payload, dict):
            existing_payload = self._read_token_payload()
            if (
                isinstance(existing_payload, dict)
                and existing_payload.get("refresh_token")
                and not payload.get("refresh_token")
            ):
                payload["refresh_token"] = existing_payload["refresh_token"]
                merged_json = json.dumps(payload)
        if self._set_secret:
            try:
                self._set_secret("google_calendar_token_json", merged_json)
            except Exception:
                pass
        try:
            self._token_path.write_text(merged_json, encoding="utf-8")
        except Exception:
            pass

    def _read_token_payload(self) -> dict | None:
        raw = self._read_secret("google_calendar_token_json")
        if not raw and self._token_path.exists():
            try:
                raw = self._token_path.read_text(encoding="utf-8")
            except Exception:
                raw = ""
        if not raw:
            return None
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return None
        return data if isinstance(data, dict) else None

    def _load_client_config(self) -> dict:
        raw = self._read_secret("google_calendar_credentials_json")
        if not raw and self._credentials_path.exists():
            try:
                raw = self._credentials_path.read_text(encoding="utf-8")
            except Exception:
                raw = ""
        if not raw:
            return {}
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValidationError("El JSON de credenciales de Google no es valido.") from exc
        if not isinstance(data, dict) or not any(key in data for key in ("installed", "web")):
            raise ValidationError(
                "Las credenciales deben corresponder a un cliente OAuth de Google."
            )
        return data

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
