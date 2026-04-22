from __future__ import annotations

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
