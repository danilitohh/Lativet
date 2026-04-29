from __future__ import annotations

import smtplib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from lativet.api import LativetService
from lativet.google_calendar import GoogleCalendarBridge
from lativet.validators import ValidationError


BASE_DIR = Path(__file__).resolve().parents[1]


class ServiceBootstrapTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.service = LativetService(BASE_DIR, Path(self.tempdir.name))

    def tearDown(self) -> None:
        self.service.close()
        self.tempdir.cleanup()

    def test_bootstrap_refreshes_google_calendar_status_when_settings_are_requested(self) -> None:
        self.service._google_calendar.status = Mock(return_value={"connected": False})

        result = self.service.bootstrap(sections={"settings"})
        payload = result["data"]

        self.assertIn("settings", payload)
        self.service._google_calendar.status.assert_called_once_with(
            payload.get("settings"), refresh_connection=True
        )

    def test_bootstrap_skips_google_calendar_refresh_for_non_settings_sections(self) -> None:
        self.service._google_calendar.status = Mock(return_value={"connected": False})

        result = self.service.bootstrap(sections={"appointments"})
        payload = result["data"]

        self.assertIn("settings", payload)
        self.service._google_calendar.status.assert_called_once_with(
            payload.get("settings"), refresh_connection=False
        )

    def test_google_calendar_config_is_blocked_when_connection_is_locked(self) -> None:
        self.service._google_calendar.status = Mock(return_value={"connected": True})

        result = self.service.save_google_calendar_config(
            {
                "google_calendar_enabled": True,
                "google_calendar_id": "primary",
                "agenda_timezone": "America/Bogota",
            }
        )

        self.assertFalse(result["ok"])
        self.assertIn("protegida", result["error"])
        self.assertTrue(self.service._db.get_settings()["google_calendar_locked"])

    def test_google_calendar_disconnect_is_blocked_when_connection_is_locked(self) -> None:
        self.service._db.set_secret_setting("google_calendar_locked", "true")
        self.service._google_calendar.disconnect = Mock()

        result = self.service.disconnect_google_calendar()

        self.assertFalse(result["ok"])
        self.assertIn("protegida", result["error"])
        self.service._google_calendar.disconnect.assert_not_called()

    def test_google_calendar_oauth_completion_locks_configuration(self) -> None:
        self.service._google_calendar.complete_web_oauth = Mock(return_value={"connected": True})
        self.service._google_calendar.status = Mock(return_value={"connected": True})

        result = self.service.complete_google_calendar_oauth(
            "https://clinic.example.com/api/google-calendar/callback",
            "https://clinic.example.com/api/google-calendar/callback?state=test&code=test",
        )

        self.assertTrue(result["ok"])
        self.assertTrue(self.service._db.get_settings()["google_calendar_locked"])

    def test_save_appointment_persists_google_invitation_metadata(self) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Laura Torres",
                "identification_type": "CC",
                "identification_number": "998877",
                "phone": "3001234567",
                "email": "laura@example.com",
                "address": "Calle 1",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Milo",
                "species": "Felino",
                "breed": "Criollo",
                "sex": "Macho",
                "age_years": 4,
                "reproductive_status": "Castrado",
                "weight_kg": 4.1,
                "notes": "Paciente estable.",
            }
        )
        self.service._google_calendar.sync_appointment = Mock(
            return_value={
                "synced": True,
                "event_id": "evt-123",
                "event_url": "https://calendar.google.com/event?eid=test",
                "status": "confirmed",
                "attendee_response_status": "needsAction",
                "invite_sent": True,
            }
        )

        result = self.service.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-04-29T10:00",
                "reason": "Vacunacion",
                "status": "scheduled",
            }
        )

        self.assertTrue(result["ok"])
        appointment = result["data"]
        self.assertTrue(appointment["google_calendar"]["invite_sent"])
        stored = self.service._db.get_appointment(appointment["id"])
        self.assertEqual(stored["google_event_id"], "evt-123")
        self.assertEqual(stored["google_attendee_response_status"], "needsAction")

    def test_save_appointment_succeeds_when_google_metadata_sync_fails(self) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Sara Rojas",
                "identification_type": "CC",
                "identification_number": "778899",
                "phone": "3002223344",
                "email": "sara@example.com",
                "address": "Calle 10",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Toby",
                "species": "Canino",
                "breed": "Criollo",
                "sex": "Macho",
                "age_years": 2,
                "reproductive_status": "No esterilizado",
                "weight_kg": 12.1,
                "notes": "Paciente de prueba.",
            }
        )
        self.service._sync_google_calendar_for_appointment = Mock(
            side_effect=Exception("metadata sync failed")
        )

        result = self.service.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-04-29T11:00",
                "reason": "Control",
                "status": "scheduled",
            }
        )

        self.assertTrue(result["ok"])
        appointment = result["data"]
        self.assertEqual(appointment["google_calendar"]["error"], "metadata sync failed")
        stored = self.service._db.get_appointment(appointment["id"])
        self.assertEqual(stored["reason"], "Control")

    def test_update_appointment_status_succeeds_when_google_metadata_sync_fails(self) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Paula Melo",
                "identification_type": "CC",
                "identification_number": "334455",
                "phone": "3005556677",
                "email": "paula@example.com",
                "address": "Carrera 8",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Luna",
                "species": "Felino",
                "breed": "Criollo",
                "sex": "Hembra",
                "age_years": 3,
                "reproductive_status": "Esterilizada",
                "weight_kg": 4.2,
                "notes": "Paciente estable.",
            }
        )
        appointment = self.service._db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-04-29T12:00",
                "reason": "Vacunacion",
                "status": "scheduled",
            }
        )
        self.service._sync_google_calendar_for_appointment = Mock(
            side_effect=Exception("metadata sync failed")
        )

        result = self.service.update_appointment_status(appointment["id"], "confirmed")

        self.assertTrue(result["ok"])
        updated = result["data"]
        self.assertEqual(updated["status"], "confirmed")
        self.assertEqual(updated["google_calendar"]["error"], "metadata sync failed")
        stored = self.service._db.get_appointment(appointment["id"])
        self.assertEqual(stored["status"], "confirmed")

    def test_bootstrap_syncs_accepted_google_invitation_to_confirmed(self) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Andrea Ruiz",
                "identification_type": "CC",
                "identification_number": "112233",
                "phone": "3000000000",
                "email": "andrea@example.com",
                "address": "Calle 2",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Luna",
                "species": "Canino",
                "breed": "Mestizo",
                "sex": "Hembra",
                "age_years": 3,
                "reproductive_status": "Esterilizada",
                "weight_kg": 15.2,
                "notes": "Paciente estable.",
            }
        )
        appointment = self.service._db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-04-30T09:00",
                "reason": "Control general",
                "status": "pending_confirmation",
            }
        )
        self.service._db.update_appointment_google_sync(
            appointment["id"],
            event_id="evt-accepted",
            event_url="https://calendar.google.com/event?eid=accepted",
            sync_status="confirmed",
            sync_error="",
        )
        self.service._db.save_settings(
            {
                **self.service._db.get_settings(),
                "google_calendar_enabled": True,
            }
        )
        self.service._google_calendar.get_appointment_attendee_response = Mock(
            return_value={
                "synced": True,
                "event_id": "evt-accepted",
                "event_url": "https://calendar.google.com/event?eid=accepted",
                "status": "confirmed",
                "attendee_response_status": "accepted",
            }
        )
        self.service._google_calendar.status = Mock(return_value={"connected": True})

        result = self.service.bootstrap(sections={"appointments"})

        self.assertTrue(result["ok"])
        appointments = result["data"]["appointments"]
        updated = next(item for item in appointments if item["id"] == appointment["id"])
        self.assertEqual(updated["status"], "confirmed")
        self.assertEqual(updated["google_attendee_response_status"], "accepted")

    def test_bootstrap_keeps_waiting_room_status_when_google_invitation_is_accepted(self) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Camila Perez",
                "identification_type": "CC",
                "identification_number": "445566",
                "phone": "3011111111",
                "email": "camila@example.com",
                "address": "Calle 3",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Nina",
                "species": "Canino",
                "breed": "Poodle",
                "sex": "Hembra",
                "age_years": 5,
                "reproductive_status": "Esterilizada",
                "weight_kg": 8.3,
                "notes": "Paciente estable.",
            }
        )
        appointment = self.service._db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-05-01T11:00",
                "reason": "Revision",
                "status": "waiting_room",
            }
        )
        self.service._db.update_appointment_google_sync(
            appointment["id"],
            event_id="evt-waiting-room",
            event_url="https://calendar.google.com/event?eid=waiting",
            sync_status="confirmed",
            sync_error="",
        )
        self.service._db.save_settings(
            {
                **self.service._db.get_settings(),
                "google_calendar_enabled": True,
            }
        )
        self.service._google_calendar.get_appointment_attendee_response = Mock(
            return_value={
                "synced": True,
                "event_id": "evt-waiting-room",
                "event_url": "https://calendar.google.com/event?eid=waiting",
                "status": "confirmed",
                "attendee_response_status": "accepted",
            }
        )
        self.service._google_calendar.status = Mock(return_value={"connected": True})

        result = self.service.bootstrap(sections={"appointments"})

        self.assertTrue(result["ok"])
        appointments = result["data"]["appointments"]
        updated = next(item for item in appointments if item["id"] == appointment["id"])
        self.assertEqual(updated["status"], "waiting_room")
        self.assertEqual(updated["google_attendee_response_status"], "accepted")

    def test_bootstrap_syncs_declined_google_invitation_to_cancelled(self) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Felipe Gomez",
                "identification_type": "CC",
                "identification_number": "778811",
                "phone": "3004445566",
                "email": "felipe@example.com",
                "address": "Calle 4",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Rocky",
                "species": "Canino",
                "breed": "Mestizo",
                "sex": "Macho",
                "age_years": 4,
                "reproductive_status": "Castrado",
                "weight_kg": 18.4,
                "notes": "Paciente estable.",
            }
        )
        appointment = self.service._db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-05-02T09:30",
                "reason": "Control",
                "status": "confirmed",
            }
        )
        self.service._db.update_appointment_google_sync(
            appointment["id"],
            event_id="evt-declined",
            event_url="https://calendar.google.com/event?eid=declined",
            sync_status="confirmed",
            sync_error="",
        )
        self.service._db.save_settings(
            {
                **self.service._db.get_settings(),
                "google_calendar_enabled": True,
            }
        )
        self.service._google_calendar.get_appointment_attendee_response = Mock(
            return_value={
                "synced": True,
                "event_id": "evt-declined",
                "event_url": "https://calendar.google.com/event?eid=declined",
                "status": "confirmed",
                "attendee_response_status": "declined",
            }
        )
        self.service._google_calendar.status = Mock(return_value={"connected": True})

        result = self.service.bootstrap(sections={"appointments"})

        self.assertTrue(result["ok"])
        updated = next(item for item in result["data"]["appointments"] if item["id"] == appointment["id"])
        self.assertEqual(updated["status"], "cancelled")
        self.assertEqual(updated["google_attendee_response_status"], "declined")

    def test_bootstrap_syncs_pending_google_invitation_to_pending_confirmation(self) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Mariana Lopez",
                "identification_type": "CC",
                "identification_number": "223344",
                "phone": "3001112233",
                "email": "mariana@example.com",
                "address": "Carrera 5",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Moka",
                "species": "Felino",
                "breed": "Criollo",
                "sex": "Hembra",
                "age_years": 2,
                "reproductive_status": "No esterilizada",
                "weight_kg": 3.8,
                "notes": "Paciente sana.",
            }
        )
        appointment = self.service._db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-05-03T14:00",
                "reason": "Vacunacion",
                "status": "confirmed",
            }
        )
        self.service._db.update_appointment_google_sync(
            appointment["id"],
            event_id="evt-needs-action",
            event_url="https://calendar.google.com/event?eid=needsaction",
            sync_status="confirmed",
            sync_error="",
        )
        self.service._db.save_settings(
            {
                **self.service._db.get_settings(),
                "google_calendar_enabled": True,
            }
        )
        self.service._google_calendar.get_appointment_attendee_response = Mock(
            return_value={
                "synced": True,
                "event_id": "evt-needs-action",
                "event_url": "https://calendar.google.com/event?eid=needsaction",
                "status": "confirmed",
                "attendee_response_status": "needsAction",
            }
        )
        self.service._google_calendar.status = Mock(return_value={"connected": True})

        result = self.service.bootstrap(sections={"appointments"})

        self.assertTrue(result["ok"])
        updated = next(item for item in result["data"]["appointments"] if item["id"] == appointment["id"])
        self.assertEqual(updated["status"], "pending_confirmation")
        self.assertEqual(updated["google_attendee_response_status"], "needsAction")

    @patch("lativet.api.send_email")
    def test_appointment_reminder_reports_smtp_auth_failure(self, mocked_send_email) -> None:
        owner = self.service._db.save_owner(
            {
                "full_name": "Laura Torres",
                "identification_type": "CC",
                "identification_number": "998877",
                "phone": "3001234567",
                "email": "laura@example.com",
                "address": "Calle 1",
            }
        )
        patient = self.service._db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Milo",
                "species": "Felino",
                "breed": "Criollo",
                "sex": "Macho",
                "age_years": 4,
                "reproductive_status": "Castrado",
                "weight_kg": 4.1,
                "notes": "Paciente estable.",
            }
        )
        appointment = self.service._db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-04-29T10:00",
                "reason": "Vacunacion",
                "status": "scheduled",
            }
        )
        self.service._db.save_settings(
            {
                **self.service._db.get_settings(),
                "smtp_enabled": True,
                "smtp_from": "clinic@example.com",
                "smtp_username": "auth@example.com",
                "smtp_host": "smtp.gmail.com",
                "smtp_port": 587,
            }
        )
        self.service._db.set_secret_setting("smtp_app_password", "secret")
        mocked_send_email.side_effect = smtplib.SMTPAuthenticationError(
            535, b"5.7.8 Username and Password not accepted"
        )

        result = self.service.send_appointment_reminder(appointment["id"])

        self.assertTrue(result["ok"])
        reminder = result["data"]
        self.assertFalse(reminder["email"]["sent"])
        self.assertEqual(reminder["email"]["reason"], "smtp_auth_failed")


class GoogleCalendarBridgeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.bridge = GoogleCalendarBridge(Path(self.tempdir.name))

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_load_credentials_clears_token_when_google_revokes_refresh_token(self) -> None:
        token_payload = {
            "token": "expired-token",
            "refresh_token": "revoked-refresh-token",
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": "client-id",
            "client_secret": "client-secret",
            "scopes": ["https://www.googleapis.com/auth/calendar.events"],
        }
        self.bridge._token_path.write_text(str(token_payload).replace("'", '"'), encoding="utf-8")

        class FakeCredentials:
            expired = True
            refresh_token = "revoked-refresh-token"
            valid = False

            def refresh(self, request) -> None:
                raise Exception(
                    "('invalid_grant: Bad Request', {'error': 'invalid_grant', 'error_description': 'Bad Request'})"
                )

        with patch.object(self.bridge, "_require_google_packages"), patch(
            "google.oauth2.credentials.Credentials.from_authorized_user_file",
            return_value=FakeCredentials(),
        ):
            with self.assertRaises(ValidationError) as context:
                self.bridge._load_credentials(allow_refresh=True)

        self.assertIn("vencio o fue revocada", str(context.exception))
        self.assertFalse(self.bridge._token_path.exists())
