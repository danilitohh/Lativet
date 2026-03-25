from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from lativet.api import LativetService


BASE_DIR = Path(__file__).resolve().parents[1]


class ServiceBootstrapTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.service = LativetService(BASE_DIR, Path(self.tempdir.name))

    def tearDown(self) -> None:
        self.service.close()
        self.tempdir.cleanup()

    def test_bootstrap_uses_non_refreshing_google_calendar_status(self) -> None:
        self.service._google_calendar.status = Mock(return_value={"connected": False})

        result = self.service.bootstrap(sections={"settings"})
        payload = result["data"]

        self.assertIn("settings", payload)
        self.service._google_calendar.status.assert_called_once_with(
            payload.get("settings"), refresh_connection=False
        )
