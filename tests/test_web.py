from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from lativet.web import create_app


BASE_DIR = Path(__file__).resolve().parents[1]


class WebSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.app = create_app(BASE_DIR, Path(self.tempdir.name))
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        service = self.app.extensions.get("lativet_service")
        if service is not None:
            service.close()
        self.tempdir.cleanup()

    def assert_ok(self, response):
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        payload = response.get_json()
        self.assertTrue(payload["ok"])
        return payload["data"]

    def test_home_and_bootstrap(self) -> None:
        home = self.client.get("/")
        self.assertEqual(home.status_code, 200)
        self.assertIn(b"Lativet", home.data)
        home.close()

        snapshot = self.assert_ok(self.client.get("/api/bootstrap"))
        self.assertIn("dashboard", snapshot)
        self.assertIn("compliance", snapshot)

    def test_vercel_requires_persistent_database_config(self) -> None:
        with patch.dict(
            os.environ,
            {
                "VERCEL": "1",
                "DATABASE_URL": "",
                "POSTGRES_URL": "",
                "POSTGRES_PRISMA_URL": "",
                "POSTGRES_URL_NON_POOLING": "",
            },
            clear=False,
        ):
            tempdir = tempfile.TemporaryDirectory()
            app = create_app(BASE_DIR, Path(tempdir.name))
            client = app.test_client()
            try:
                response = client.get("/api/bootstrap")
                self.assertEqual(response.status_code, 503, response.get_data(as_text=True))
                payload = response.get_json()
                self.assertFalse(payload["ok"])
                self.assertIn("DATABASE_URL/POSTGRES_URL", payload["error"])
                self.assertIn("Vercel", payload["error"])
            finally:
                service = app.extensions.get("lativet_service")
                if service is not None:
                    service.close()
                tempdir.cleanup()

    def test_full_http_operational_flow(self) -> None:
        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Maria Gomez",
                    "identification_type": "CC",
                    "identification_number": "123456",
                    "phone": "3000000000",
                    "email": "maria@example.com",
                },
            )
        )

        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner["id"],
                    "name": "Luna",
                    "species": "Canino",
                    "breed": "Mestizo",
                    "sex": "Hembra",
                    "weight_kg": "15.2",
                },
            )
        )

        appointment = self.assert_ok(
            self.client.post(
                "/api/appointments",
                json={
                    "patient_id": patient["id"],
                    "appointment_at": "2026-03-21T09:00",
                    "reason": "Control general",
                    "status": "scheduled",
                },
            )
        )
        self.assertEqual(appointment["status"], "scheduled")

        updated_appointment = self.assert_ok(
            self.client.patch(
                f"/api/appointments/{appointment['id']}/status",
                json={"status": "confirmed"},
            )
        )
        self.assertEqual(updated_appointment["status"], "confirmed")

        record = self.assert_ok(
            self.client.post(
                "/api/records",
                json={
                    "patient_id": patient["id"],
                    "opened_at": "2026-03-21T09:10",
                    "reason_for_consultation": "Halitosis y revision general.",
                    "anamnesis": "Sin procedimientos recientes.",
                    "physical_exam_summary": "Mucosas rosadas. Hallazgos compatibles con enfermedad periodontal.",
                    "presumptive_diagnosis": "Enfermedad periodontal",
                    "procedures_plan": "Limpieza dental bajo anestesia.",
                    "recommendations": "Ayuno previo y control posterior.",
                    "consent_required": True,
                    "consent_summary": "Consentimiento anestesico firmado.",
                    "professional_name": "Dr. Perez",
                    "professional_license": "MV-100",
                    "finalize": True,
                },
            )
        )
        self.assertEqual(record["status"], "finalized")

        evolution = self.assert_ok(
            self.client.post(
                "/api/evolutions",
                json={
                    "record_id": record["id"],
                    "evolution_at": "2026-03-22T10:00",
                    "plan": "Paciente estable. Continuar analgesia tres dias.",
                    "author_name": "Dr. Perez",
                    "author_license": "MV-100",
                },
            )
        )
        self.assertEqual(evolution["record_status"], "finalized")

        consent = self.assert_ok(
            self.client.post(
                "/api/consents",
                json={
                    "patient_id": patient["id"],
                    "consent_type": "Anestesia",
                    "procedure_name": "Limpieza dental",
                    "risks_explained": "Riesgo anestesico y recuperacion.",
                    "owner_statement": "Autorizo el procedimiento.",
                    "owner_signature_name": "Maria Gomez",
                    "owner_identification": "123456",
                    "professional_name": "Dr. Perez",
                    "professional_license": "MV-100",
                    "signed_at": "2026-03-21T08:40",
                },
            )
        )
        self.assertIn("pdf", consent)

        if consent["pdf"].get("url"):
            pdf_response = self.client.get(consent["pdf"]["url"])
            self.assertEqual(pdf_response.status_code, 200)
            pdf_response.close()

        backup = self.assert_ok(self.client.post("/api/backups", json={}))
        self.assertTrue(backup["path"].endswith(".sqlite3"))

    def test_http_supports_owner_and_patient_delete_via_post_fallback(self) -> None:
        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Borrar Owner",
                    "identification_type": "CC",
                    "identification_number": "998877",
                    "phone": "3009988776",
                    "email": "delete-owner@example.com",
                    "address": "Calle 77",
                },
            )
        )
        deleted_owner = self.assert_ok(
            self.client.post(f"/api/owners/{owner['id']}/delete", json={})
        )
        self.assertTrue(deleted_owner["deleted"])

        owner_with_pet = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Borrar Patient",
                    "identification_type": "CC",
                    "identification_number": "887766",
                    "phone": "3008877665",
                    "email": "delete-patient@example.com",
                    "address": "Carrera 44",
                },
            )
        )
        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner_with_pet["id"],
                    "name": "Copo",
                    "species": "Canino",
                    "breed": "Mestizo",
                    "sex": "Macho",
                    "age_years": "2",
                    "weight_kg": "9.4",
                    "reproductive_status": "Esterilizado",
                    "notes": "Paciente de prueba.",
                },
            )
        )
        deleted_patient = self.assert_ok(
            self.client.post(f"/api/patients/{patient['id']}/delete", json={})
        )
        self.assertTrue(deleted_patient["deleted"])

    def test_http_supports_consultations_availability_and_grooming(self) -> None:
        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Paula Rios",
                    "identification_type": "CC",
                    "identification_number": "998877",
                    "phone": "3001231234",
                },
            )
        )
        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner["id"],
                    "name": "Bruno",
                    "species": "Canino",
                    "sex": "Macho",
                },
            )
        )
        record = self.assert_ok(
            self.client.post(
                "/api/records",
                json={
                    "patient_id": patient["id"],
                    "opened_at": "2026-03-24T10:00",
                    "care_area": "Hospitalizacion",
                    "reason_for_consultation": "Control postoperatorio",
                    "anamnesis": "Paciente en recuperacion.",
                    "physical_exam_summary": "Estable.",
                    "presumptive_diagnosis": "Posoperatorio normal",
                    "procedures_plan": "Seguimiento y curacion.",
                    "recommendations": "Monitoreo diario.",
                    "professional_name": "Dr. Soto",
                    "professional_license": "MV-400",
                    "finalize": True,
                },
            )
        )
        consultation = self.assert_ok(
            self.client.post(
                "/api/consultations",
                json={
                    "record_id": record["id"],
                    "consultation_at": "2026-03-24T10:30",
                    "consultation_type": "Seguimiento",
                    "title": "Curacion diaria",
                    "summary": "Se realiza limpieza de herida.",
                    "professional_name": "Dr. Soto",
                    "professional_license": "MV-400",
                },
            )
        )
        self.assertEqual(consultation["consultation_type"], "Seguimiento")

        availability = self.assert_ok(
            self.client.post(
                "/api/availability",
                json={
                    "scope": "general",
                    "professional_name": "Agenda principal",
                    "day_of_week": "1",
                    "start_time": "08:00",
                    "end_time": "10:00",
                    "slot_minutes": "30",
                },
            )
        )
        self.assertEqual(availability["scope"], "general")

        grooming = self.assert_ok(
            self.client.post(
                "/api/grooming",
                json={
                    "patient_id": patient["id"],
                    "service_at": "2026-03-24T14:00",
                    "document_type": "Orden",
                    "service_name": "Corte higienico",
                    "stylist_name": "Mafe",
                    "status": "scheduled",
                },
            )
        )
        self.assertEqual(grooming["service_name"], "Corte higienico")

        snapshot = self.assert_ok(self.client.get("/api/bootstrap"))
        self.assertEqual(len(snapshot["consultations"]), 1)
        self.assertEqual(len(snapshot["availability_rules"]), 1)
        self.assertEqual(len(snapshot["grooming_documents"]), 1)
        self.assertIn("reports", snapshot)
        self.assertIn("requests", snapshot)

    @patch("lativet.api.send_email")
    def test_control_reminder_job_sends_due_emails(self, mocked_send_email) -> None:
        bootstrap = self.client.get("/api/bootstrap")
        self.assertEqual(bootstrap.status_code, 200, bootstrap.get_data(as_text=True))
        service = self.app.extensions.get("lativet_service")
        self.assertIsNotNone(service)
        service._db.save_settings(
            {
                **service._db.get_settings(),
                "clinic_name": "Lativet",
                "smtp_enabled": True,
                "smtp_from": "clinic@example.com",
                "smtp_host": "smtp.gmail.com",
                "smtp_port": 587,
                "smtp_app_password": "app-secret",
            }
        )

        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Andrea Velez",
                    "identification_type": "CC",
                    "identification_number": "447799",
                    "phone": "3004477990",
                    "email": "andrea@example.com",
                    "address": "Calle 14",
                },
            )
        )
        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner["id"],
                    "name": "Nube",
                    "species": "Felino",
                    "breed": "Mestizo",
                    "sex": "Hembra",
                    "age_years": "3",
                    "weight_kg": "4.1",
                    "reproductive_status": "Esterilizado",
                    "notes": "Paciente de seguimiento.",
                },
            )
        )
        record = self.assert_ok(
            self.client.post(
                "/api/records",
                json={
                    "patient_id": patient["id"],
                    "opened_at": "2026-03-24T09:00",
                    "reason_for_consultation": "Control digestivo",
                    "anamnesis": "Paciente estable.",
                    "physical_exam_summary": "Sin novedades.",
                    "presumptive_diagnosis": "Control",
                    "procedures_plan": "Seguimiento.",
                    "recommendations": "Control posterior.",
                    "professional_name": "Dra. Perez",
                    "professional_license": "MV-900",
                },
            )
        )
        consultation = self.assert_ok(
            self.client.post(
                "/api/consultations",
                json={
                    "record_id": record["id"],
                    "consultation_at": "2026-03-24T10:15",
                    "consultation_type": "Consulta",
                    "title": "Consulta general",
                    "summary": "Paciente en control.",
                    "next_control": "2026-03-25",
                    "professional_name": "Dra. Perez",
                    "professional_license": "MV-900",
                },
            )
        )
        self.assertTrue(consultation["control_reminder"]["scheduled"])
        self.assertEqual(
            consultation["control_reminder"]["scheduled_for"], "2026-03-25"
        )

        job = self.assert_ok(
            self.client.get("/api/jobs/control-reminders?date=2026-03-25")
        )
        self.assertEqual(job["processed"], 1)
        self.assertEqual(job["sent"], 1)
        mocked_send_email.assert_called_once()
        _, kwargs = mocked_send_email.call_args
        self.assertIn("control", kwargs["subject"].lower())
        self.assertIn("control", kwargs["body"].lower())

    @patch("lativet.api.send_email")
    def test_vaccination_reminder_job_sends_vaccination_email(self, mocked_send_email) -> None:
        bootstrap = self.client.get("/api/bootstrap")
        self.assertEqual(bootstrap.status_code, 200, bootstrap.get_data(as_text=True))
        service = self.app.extensions.get("lativet_service")
        self.assertIsNotNone(service)
        service._db.save_settings(
            {
                **service._db.get_settings(),
                "clinic_name": "Lativet",
                "smtp_enabled": True,
                "smtp_from": "clinic@example.com",
                "smtp_host": "smtp.gmail.com",
                "smtp_port": 587,
                "smtp_app_password": "app-secret",
            }
        )

        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Sandra Mena",
                    "identification_type": "CC",
                    "identification_number": "118822",
                    "phone": "3001188220",
                    "email": "sandra@example.com",
                    "address": "Carrera 19",
                },
            )
        )
        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner["id"],
                    "name": "Mia",
                    "species": "Canino",
                    "breed": "Mestizo",
                    "sex": "Hembra",
                    "age_years": "2",
                    "weight_kg": "8.3",
                    "reproductive_status": "Esterilizado",
                    "notes": "Paciente vacunacion.",
                },
            )
        )
        record = self.assert_ok(
            self.client.post(
                "/api/records",
                json={
                    "patient_id": patient["id"],
                    "opened_at": "2026-03-24T09:00",
                    "reason_for_consultation": "Vacunacion anual",
                    "anamnesis": "Paciente estable.",
                    "physical_exam_summary": "Sin novedades.",
                    "presumptive_diagnosis": "Vacunacion preventiva",
                    "procedures_plan": "Aplicar vacuna anual.",
                    "recommendations": "Refuerzo posterior.",
                    "professional_name": "Dra. Perez",
                    "professional_license": "MV-900",
                },
            )
        )
        consultation = self.assert_ok(
            self.client.post(
                "/api/consultations",
                json={
                    "record_id": record["id"],
                    "consultation_at": "2026-03-24T10:15",
                    "consultation_type": "Vacunacion",
                    "title": "Rabia anual",
                    "summary": "Paciente vacunada.",
                    "next_control": "2026-03-25",
                    "professional_name": "Dra. Perez",
                    "professional_license": "MV-900",
                },
            )
        )
        self.assertTrue(consultation["control_reminder"]["scheduled"])
        self.assertEqual(consultation["control_reminder"]["label"], "vacunacion")

        job = self.assert_ok(
            self.client.get("/api/jobs/control-reminders?date=2026-03-25")
        )
        self.assertEqual(job["processed"], 1)
        self.assertEqual(job["sent"], 1)
        self.assertEqual(job["items"][0]["kind"], "vaccination")
        mocked_send_email.assert_called_once()
        _, kwargs = mocked_send_email.call_args
        self.assertIn("vacunacion", kwargs["subject"].lower())
        self.assertIn("vacunacion", kwargs["body"].lower())
        self.assertIn("Rabia anual", kwargs["body"])

    def test_http_supports_google_calendar_config_and_availability_delete(self) -> None:
        config = self.assert_ok(
            self.client.post(
                "/api/google-calendar/config",
                json={
                    "google_calendar_enabled": True,
                    "google_calendar_id": "primary",
                    "agenda_timezone": "America/Bogota",
                },
            )
        )
        self.assertTrue(config["enabled"])
        self.assertEqual(config["calendar_id"], "primary")

        availability = self.assert_ok(
            self.client.post(
                "/api/availability",
                json={
                    "professional_name": "Agenda general",
                    "day_of_week": "1",
                    "start_time": "08:00",
                    "end_time": "10:00",
                    "slot_minutes": "30",
                },
            )
        )
        deleted = self.assert_ok(
            self.client.delete(f"/api/availability/{availability['id']}")
        )
        self.assertTrue(deleted["deleted"])

        snapshot = self.assert_ok(self.client.get("/api/bootstrap"))
        self.assertIn("google_calendar", snapshot)
        self.assertEqual(snapshot["google_calendar"]["calendar_id"], "primary")
        self.assertEqual(len(snapshot["availability_rules"]), 0)

    def test_http_supports_billing_inventory_and_cash(self) -> None:
        home = self.client.get("/")
        self.assertEqual(home.status_code, 200)
        self.assertIn(b"Ventas", home.data)
        home.close()

        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Nora Gil",
                    "identification_type": "CC",
                    "identification_number": "112233",
                    "phone": "3001122334",
                    "email": "nora@example.com",
                },
            )
        )
        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner["id"],
                    "name": "Toby",
                    "species": "Canino",
                    "sex": "Macho",
                },
            )
        )
        provider = self.assert_ok(
            self.client.post(
                "/api/providers",
                json={
                    "name": "Distribuciones Vet",
                    "contact_name": "Laura",
                    "phone": "6017654321",
                    "email": "compras@example.com",
                },
            )
        )
        item = self.assert_ok(
            self.client.post(
                "/api/catalog-items",
                json={
                    "provider_id": provider["id"],
                    "name": "Desparasitante",
                    "category": "Medicamento",
                    "purchase_cost": "80",
                    "margin_percent": "25",
                    "presentation_total": "4",
                    "stock_quantity": "2",
                    "min_stock": "1",
                    "track_inventory": True,
                },
            )
        )
        self.assertEqual(item["unit_cost"], 20.0)
        self.assertEqual(item["unit_price"], 25.0)

        quote = self.assert_ok(
            self.client.post(
                "/api/billing-documents",
                json={
                    "document_type": "cotizacion",
                    "patient_id": patient["id"],
                    "issue_date": "2026-03-24",
                    "payment_method": "Pendiente",
                    "lines": [{"catalog_item_id": item["id"], "quantity": 1}],
                },
            )
        )
        self.assertEqual(quote["status"], "Cotizacion")

        invoice = self.assert_ok(
            self.client.post(
                "/api/billing-documents",
                json={
                    "document_type": "factura",
                    "patient_id": patient["id"],
                    "issue_date": "2026-03-25",
                    "payment_method": "Pendiente",
                    "cash_account": "caja_menor",
                    "lines": [{"catalog_item_id": item["id"], "quantity": 3}],
                },
            )
        )
        self.assertEqual(invoice["status"], "Pendiente")
        self.assertEqual(invoice["document_number"], "0002")

        payment = self.assert_ok(
            self.client.post(
                "/api/billing-payments",
                json={
                    "document_id": invoice["id"],
                    "payment_date": "2026-03-26",
                    "amount": str(invoice["balance_due"]),
                    "payment_method": "Efectivo",
                    "cash_account": "caja_menor",
                    "note": "Pago total",
                },
            )
        )
        self.assertEqual(payment["document_status"], "Pagado")

        adjustment = self.assert_ok(
            self.client.post(
                "/api/stock-adjustments",
                json={
                    "item_id": item["id"],
                    "movement_type": "entrada",
                    "quantity": "5",
                    "movement_date": "2026-03-26",
                    "note": "Ingreso por compra",
                },
            )
        )
        self.assertEqual(adjustment["balance_after"], 4.0)

        cash = self.assert_ok(
            self.client.post(
                "/api/cash-movements",
                json={
                    "movement_type": "gasto",
                    "concept": "Pago proveedor",
                    "amount": "40",
                    "movement_date": "2026-03-26",
                    "cash_account": "caja_mayor",
                    "category": "Compra",
                },
            )
        )
        self.assertEqual(cash["movement_type"], "gasto")

        snapshot = self.assert_ok(self.client.get("/api/bootstrap"))
        self.assertEqual(len(snapshot["providers"]), 1)
        self.assertEqual(len(snapshot["catalog_items"]), 1)
        self.assertEqual(len(snapshot["billing_documents"]), 2)
        self.assertEqual(len(snapshot["cash_movements"]), 2)
        self.assertEqual(len(snapshot["stock_movements"]), 2)
        self.assertEqual(snapshot["billing_summary"]["documents_total"], 2)
        self.assertEqual(snapshot["reports"]["totals"]["billing_documents"], 2)
        self.assertEqual(snapshot["reports"]["totals"]["providers"], 1)
        self.assertEqual(snapshot["reports"]["totals"]["catalog_items"], 1)


if __name__ == "__main__":
    unittest.main()
