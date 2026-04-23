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

        icon = self.client.get("/iconos/propietarios.png")
        self.assertEqual(icon.status_code, 200)
        self.assertTrue(icon.data)
        self.assertEqual(icon.headers.get("Cache-Control"), "public, max-age=31536000, immutable")
        icon.close()

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

    @patch("lativet.api.send_email_with_attachment")
    def test_sales_endpoints_export_document_report_inventory_and_email(self, mocked_send_email) -> None:
        service = self.app.extensions.get("lativet_service")
        self.assertIsNotNone(service)
        service._db.save_settings(
            {
                **service._db.get_settings(),
                "clinic_name": "Lativet",
                "clinic_address": "Calle 1",
                "clinic_phone": "3000000000",
                "clinic_email": "ventas@example.com",
                "smtp_enabled": True,
                "smtp_from": "ventas@example.com",
                "smtp_host": "smtp.gmail.com",
                "smtp_port": 587,
                "smtp_app_password": "app-secret",
            }
        )

        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Cliente Ventas",
                    "identification_type": "CC",
                    "identification_number": "112233",
                    "phone": "3001230000",
                    "email": "cliente.ventas@example.com",
                    "address": "Avenida 14",
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
                    "age_years": "5",
                    "weight_kg": "11.2",
                    "reproductive_status": "Esterilizado",
                    "notes": "Paciente para ventas.",
                },
            )
        )
        provider = self.assert_ok(
            self.client.post(
                "/api/providers",
                json={
                    "name": "Proveedor Test",
                    "contact_name": "Pablo",
                    "phone": "3015551212",
                    "email": "proveedor.test@example.com",
                    "notes": "Prueba",
                },
            )
        )
        item = self.assert_ok(
            self.client.post(
                "/api/catalog-items",
                json={
                    "provider_id": provider["id"],
                    "name": "Analgésico",
                    "category": "Medicamentos",
                    "purchase_cost": "12000",
                    "margin_percent": "50",
                    "presentation_total": "6",
                    "stock_quantity": "6",
                    "min_stock": "5",
                    "track_inventory": True,
                    "notes": "Inventario de prueba",
                },
            )
        )
        document = self.assert_ok(
            self.client.post(
                "/api/billing-documents",
                json={
                    "patient_id": patient["id"],
                    "document_type": "factura",
                    "issue_date": "2026-04-10",
                    "due_date": "2026-04-15",
                    "payment_method": "Pendiente",
                    "cash_account": "caja_menor",
                    "discount": "0",
                    "recipient_email": "cliente.ventas@example.com",
                    "lines": [{"catalog_item_id": item["id"], "quantity": "2"}],
                },
            )
        )
        payment = self.assert_ok(
            self.client.post(
                "/api/billing-payments",
                json={
                    "document_id": document["id"],
                    "payment_date": "2026-04-11",
                    "amount": "2000",
                    "payment_method": "Efectivo",
                    "cash_account": "caja_menor",
                    "note": "Abono inicial",
                },
            )
        )
        self.assertGreater(payment["document_balance_due"], 0)

        detail = self.assert_ok(self.client.get(f"/api/billing-documents/{document['id']}"))
        self.assertEqual(detail["document_number"], document["document_number"])
        self.assertIn("email_draft", detail)

        document_pdf = self.assert_ok(
            self.client.post(f"/api/billing-documents/{document['id']}/pdf", json={})
        )
        self.assertTrue(document_pdf["url"].startswith("/exports/"))
        self.assertEqual(self.client.get(document_pdf["url"]).status_code, 200)

        payment_pdf = self.assert_ok(
            self.client.post(
                f"/api/billing-documents/{document['id']}/payments/{detail['payments'][0]['id']}/pdf",
                json={},
            )
        )
        self.assertTrue(payment_pdf["url"].startswith("/exports/"))
        self.assertEqual(self.client.get(payment_pdf["url"]).status_code, 200)

        report = self.assert_ok(
            self.client.get("/api/sales-report?start_date=2026-04-01&end_date=2026-04-30")
        )
        self.assertEqual(report["summary"]["facturas_periodo"], 1)
        self.assertEqual(len(report["documents"]), 1)

        report_pdf = self.assert_ok(
            self.client.post(
                "/api/sales-report/pdf",
                json={"start_date": "2026-04-01", "end_date": "2026-04-30"},
            )
        )
        self.assertTrue(report_pdf["url"].startswith("/exports/"))

        inventory_pdf = self.assert_ok(
            self.client.post("/api/inventory-report/pdf", json={"as_of_date": "2026-04-30"})
        )
        self.assertTrue(inventory_pdf["url"].startswith("/exports/"))

        email_result = self.assert_ok(
            self.client.post(
                f"/api/billing-documents/{document['id']}/email",
                json={
                    "recipient_email": "cliente.ventas@example.com",
                    "subject": "Factura de prueba",
                    "body": "Adjuntamos el documento.",
                },
            )
        )
        self.assertTrue(email_result["sent"])
        mocked_send_email.assert_called_once()

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

    @patch("lativet.api.send_email")
    def test_deworming_reminder_job_sends_deworming_email(self, mocked_send_email) -> None:
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
                    "full_name": "Laura Perez",
                    "identification_type": "CC",
                    "identification_number": "998877",
                    "phone": "3009988770",
                    "email": "laura@example.com",
                    "address": "Carrera 12",
                },
            )
        )
        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner["id"],
                    "name": "Rocky",
                    "species": "Canino",
                    "breed": "Mestizo",
                    "sex": "Macho",
                    "age_years": "3",
                    "weight_kg": "12.1",
                    "reproductive_status": "Esterilizado",
                    "notes": "Paciente desparasitacion.",
                },
            )
        )
        record = self.assert_ok(
            self.client.post(
                "/api/records",
                json={
                    "patient_id": patient["id"],
                    "opened_at": "2026-03-24T09:00",
                    "reason_for_consultation": "Desparasitacion preventiva",
                    "anamnesis": "Paciente estable.",
                    "physical_exam_summary": "Sin novedades.",
                    "presumptive_diagnosis": "Prevencion antiparasitaria",
                    "procedures_plan": "Aplicar desparasitante.",
                    "recommendations": "Repetir segun cronograma.",
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
                    "consultation_type": "Desparasitacion",
                    "title": "Simparica Trio",
                    "summary": "Paciente desparasitado.",
                    "next_control": "2026-03-25",
                    "professional_name": "Dra. Perez",
                    "professional_license": "MV-900",
                },
            )
        )
        self.assertTrue(consultation["control_reminder"]["scheduled"])
        self.assertEqual(consultation["control_reminder"]["label"], "desparasitacion")

        job = self.assert_ok(
            self.client.get("/api/jobs/control-reminders?date=2026-03-25")
        )
        self.assertEqual(job["processed"], 1)
        self.assertEqual(job["sent"], 1)
        self.assertEqual(job["items"][0]["kind"], "deworming")
        mocked_send_email.assert_called_once()
        _, kwargs = mocked_send_email.call_args
        self.assertIn("desparasitacion", kwargs["subject"].lower())
        self.assertIn("desparasitacion", kwargs["body"].lower())
        self.assertIn("Simparica Trio", kwargs["body"])

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

    def test_google_calendar_connect_uses_forwarded_public_url(self) -> None:
        with patch(
            "lativet.web.LativetService.connect_google_calendar",
            return_value={"ok": True, "data": {"auth_url": "https://accounts.example.com/o/oauth2/auth"}},
        ) as mocked_connect:
            payload = self.assert_ok(
                self.client.post(
                    "/api/google-calendar/connect",
                    json={},
                    headers={
                        "X-Forwarded-Proto": "https",
                        "X-Forwarded-Host": "clinic.example.com",
                    },
                )
            )

        self.assertIn("auth_url", payload)
        mocked_connect.assert_called_once_with(
            "https://clinic.example.com/api/google-calendar/callback"
        )

    def test_google_calendar_callback_initializes_service_on_cold_start(self) -> None:
        with patch(
            "lativet.web.LativetService.complete_google_calendar_oauth",
            return_value={"ok": True, "data": {"connected": True}},
        ) as mocked_complete:
            response = self.client.get(
                "/api/google-calendar/callback?state=test-state&code=test-code",
                headers={
                    "X-Forwarded-Proto": "https",
                    "X-Forwarded-Host": "clinic.example.com",
                },
            )

        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        self.assertIn("Google Calendar conectado", response.get_data(as_text=True))
        mocked_complete.assert_called_once_with(
            "https://clinic.example.com/api/google-calendar/callback",
            "https://clinic.example.com/api/google-calendar/callback?state=test-state&code=test-code",
        )
        self.assertIsNotNone(self.app.extensions.get("lativet_service"))

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

        extra_payment = self.client.post(
            "/api/billing-payments",
            json={
                "document_id": invoice["id"],
                "payment_date": "2026-03-27",
                "amount": "1",
                "payment_method": "Efectivo",
                "cash_account": "caja_menor",
                "note": "Intento extra",
            },
        )
        self.assertEqual(extra_payment.status_code, 400, extra_payment.get_data(as_text=True))

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

    def test_http_supports_catalog_item_delete_when_unused(self) -> None:
        item = self.assert_ok(
            self.client.post(
                "/api/catalog-items",
                json={
                    "name": "Producto temporal",
                    "category": "Accesorio",
                    "purchase_cost": "15",
                    "margin_percent": "20",
                    "presentation_type": "caja",
                    "presentation_total": "1",
                    "stock_quantity": "1",
                    "min_stock": "0",
                    "track_inventory": True,
                },
            )
        )
        self.assertEqual(item["presentation_type"], "caja")

        deleted = self.assert_ok(self.client.delete(f"/api/catalog-items/{item['id']}"))
        self.assertTrue(deleted["deleted"])
        self.assertEqual(deleted["id"], item["id"])

        snapshot = self.assert_ok(self.client.get("/api/bootstrap"))
        self.assertEqual(snapshot["catalog_items"], [])

    def test_http_hides_catalog_item_delete_when_it_has_history(self) -> None:
        owner = self.assert_ok(
            self.client.post(
                "/api/owners",
                json={
                    "full_name": "Cliente Inventario",
                    "identification_type": "CC",
                    "identification_number": "778899",
                    "phone": "3007788990",
                    "email": "cliente.inventario@example.com",
                    "address": "Calle 77 # 88-99",
                },
            )
        )
        patient = self.assert_ok(
            self.client.post(
                "/api/patients",
                json={
                    "owner_id": owner["id"],
                    "name": "Milo",
                    "species": "Canino",
                    "breed": "Criollo",
                    "sex": "Macho",
                    "age_years": "4",
                    "reproductive_status": "No esterilizado",
                    "weight_kg": "14.2",
                    "notes": "Paciente para prueba de inventario.",
                },
            )
        )
        item = self.assert_ok(
            self.client.post(
                "/api/catalog-items",
                json={
                    "name": "Producto con historial",
                    "category": "Medicamento",
                    "purchase_cost": "30",
                    "margin_percent": "20",
                    "presentation_type": "ampolla",
                    "presentation_total": "1",
                    "stock_quantity": "2",
                    "min_stock": "1",
                    "track_inventory": True,
                },
            )
        )
        self.assertEqual(item["presentation_type"], "ampolla")
        self.assert_ok(
            self.client.post(
                "/api/billing-documents",
                json={
                    "document_type": "factura",
                    "patient_id": patient["id"],
                    "issue_date": "2026-03-28",
                    "payment_method": "Pendiente",
                    "cash_account": "caja_menor",
                    "lines": [{"catalog_item_id": item["id"], "quantity": 1}],
                },
            )
        )

        deleted = self.assert_ok(self.client.delete(f"/api/catalog-items/{item['id']}"))
        self.assertTrue(deleted["deleted"])

        snapshot = self.assert_ok(self.client.get("/api/bootstrap"))
        self.assertEqual(snapshot["catalog_items"], [])
        self.assertEqual(len(snapshot["stock_movements"]), 1)

    def test_http_supports_cash_opening_and_closing(self) -> None:
        opened = self.assert_ok(
            self.client.post(
                "/api/cash-sessions/open",
                json={
                    "session_date": "2026-03-27",
                    "cash_account": "caja_mayor",
                    "opening_amount": "250000",
                    "opening_notes": "Base inicial",
                },
            )
        )
        self.assertEqual(opened["status"], "open")
        self.assertEqual(opened["cash_account"], "caja_mayor")

        self.assert_ok(
            self.client.post(
                "/api/cash-movements",
                json={
                    "movement_type": "ingreso",
                    "concept": "Venta del dia",
                    "amount": "80000",
                    "movement_date": "2026-03-27",
                    "cash_account": "caja_mayor",
                    "category": "Venta",
                },
            )
        )

        closed = self.assert_ok(
            self.client.post(
                "/api/cash-sessions/close",
                json={
                    "session_date": "2026-03-27",
                    "cash_account": "caja_mayor",
                    "closing_amount": "330000",
                    "closing_notes": "Cierre correcto",
                },
            )
        )
        self.assertEqual(closed["status"], "closed")
        self.assertEqual(closed["expected_closing_amount"], 330000.0)
        self.assertEqual(closed["difference_amount"], 0.0)

        snapshot = self.assert_ok(self.client.get("/api/bootstrap"))
        self.assertEqual(len(snapshot["cash_sessions"]), 1)
        self.assertEqual(snapshot["cash_sessions"][0]["cash_account_label"], "Caja mayor")


if __name__ == "__main__":
    unittest.main()
