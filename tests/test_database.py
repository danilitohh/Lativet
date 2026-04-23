from __future__ import annotations

import os
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from lativet.database import (
    Database,
    should_manage_postgres_runtime_schema,
    should_run_postgres_startup_checks,
)
from lativet.validators import ValidationError


class DatabaseSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.db = Database(Path(self.tempdir.name))

    def tearDown(self) -> None:
        self.db.close()
        self.tempdir.cleanup()

    def test_full_operational_flow(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Maria Gomez",
                "identification_type": "CC",
                "identification_number": "123456",
                "phone": "3000000000",
                "email": "maria@example.com",
                "address": "Calle 1",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Luna",
                "species": "Canino",
                "breed": "Mestizo",
                "sex": "Hembra",
                "weight_kg": "15.2",
            }
        )
        appointment = self.db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-03-20T09:00",
                "reason": "Control general",
                "status": "scheduled",
            }
        )
        self.assertEqual(appointment["status"], "scheduled")

        consent = self.db.save_consent(
            {
                "patient_id": patient["id"],
                "consent_type": "Anestesia",
                "procedure_name": "Limpieza dental",
                "risks_explained": "Riesgo anestesico y recuperacion.",
                "owner_statement": "Autorizo el procedimiento.",
                "owner_signature_name": "Maria Gomez",
                "owner_identification": "123456",
                "professional_name": "Dr. Perez",
                "professional_license": "MV-100",
                "signed_at": "2026-03-20T08:40",
            }
        )
        self.assertEqual(consent["patient_name"], "Luna")

        record = self.db.save_clinical_record(
            {
                "patient_id": patient["id"],
                "opened_at": "2026-03-20T09:10",
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
            },
            finalize=True,
        )
        self.assertEqual(record["status"], "finalized")
        self.assertTrue(record["retention_until"].startswith("2041-03-20"))

        evolution = self.db.save_evolution(
            {
                "record_id": record["id"],
                "evolution_at": "2026-03-25T10:00",
                "plan": "Paciente estable. Continuar analgesia tres dias.",
                "author_name": "Dr. Perez",
                "author_license": "MV-100",
            }
        )
        self.assertEqual(evolution["record_status"], "finalized")

        snapshot = self.db.bootstrap()
        self.assertEqual(len(snapshot["owners"]), 1)
        self.assertEqual(len(snapshot["patients"]), 1)
        self.assertEqual(len(snapshot["records"]), 1)
        self.assertEqual(snapshot["records"][0]["evolutions_count"], 1)

    def test_finalized_record_cannot_be_edited(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Carlos Ruiz",
                "identification_type": "CC",
                "identification_number": "7890",
                "phone": "3110000000",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Max",
                "species": "Felino",
                "sex": "Macho",
            }
        )
        record = self.db.save_clinical_record(
            {
                "patient_id": patient["id"],
                "reason_for_consultation": "Vomito",
                "anamnesis": "Inicio hoy.",
                "physical_exam_summary": "Paciente alerta.",
                "presumptive_diagnosis": "Gastroenteritis",
                "procedures_plan": "Manejo conservador.",
                "recommendations": "Dieta blanda.",
                "professional_name": "Dra. Mora",
                "professional_license": "MV-200",
            },
            finalize=True,
        )

        with self.assertRaises(ValidationError):
            self.db.save_clinical_record(
                {
                    "id": record["id"],
                    "patient_id": patient["id"],
                    "reason_for_consultation": "Cambio no permitido",
                    "anamnesis": "No aplica",
                    "physical_exam_summary": "No aplica",
                    "presumptive_diagnosis": "No aplica",
                    "procedures_plan": "No aplica",
                    "recommendations": "No aplica",
                    "professional_name": "Dra. Mora",
                    "professional_license": "MV-200",
                }
            )

    def test_can_delete_owner_without_dependencies(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Andrea Salas",
                "identification_type": "CC",
                "identification_number": "901122",
                "phone": "3001112233",
                "email": "andrea@example.com",
                "address": "Calle 9",
            }
        )
        deleted = self.db.delete_owner(owner["id"])
        self.assertTrue(deleted["deleted"])
        self.assertEqual(len(self.db.list_owners()), 0)

    def test_owner_delete_is_blocked_when_it_has_patients(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Patricia Leon",
                "identification_type": "CC",
                "identification_number": "778899",
                "phone": "3005551111",
                "email": "patricia@example.com",
                "address": "Carrera 5",
            }
        )
        self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Toby",
                "species": "Canino",
                "breed": "Mestizo",
                "sex": "Macho",
                "age_years": "4",
                "weight_kg": "12.4",
                "reproductive_status": "Esterilizado",
                "notes": "Sin antecedentes.",
            }
        )
        with self.assertRaises(ValidationError):
            self.db.delete_owner(owner["id"])

    def test_patient_delete_is_blocked_when_it_has_related_records(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Natalia Mena",
                "identification_type": "CC",
                "identification_number": "445577",
                "phone": "3002223344",
                "email": "natalia@example.com",
                "address": "Avenida 10",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Moka",
                "species": "Felino",
                "breed": "Criollo",
                "sex": "Hembra",
                "age_years": "2",
                "weight_kg": "3.6",
                "reproductive_status": "No esterilizado",
                "notes": "Paciente sana.",
            }
        )
        self.db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-03-20T09:00",
                "reason": "Control",
                "status": "scheduled",
            }
        )
        with self.assertRaises(ValidationError):
            self.db.delete_patient(patient["id"])

    def test_can_delete_patient_without_dependencies(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Camilo Duarte",
                "identification_type": "CC",
                "identification_number": "334455",
                "phone": "3006667788",
                "email": "camilo@example.com",
                "address": "Transversal 8",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Nala",
                "species": "Canino",
                "breed": "French Poodle",
                "sex": "Hembra",
                "age_years": "5",
                "weight_kg": "6.2",
                "reproductive_status": "Esterilizado",
                "notes": "Paciente activa.",
            }
        )
        deleted = self.db.delete_patient(patient["id"])
        self.assertTrue(deleted["deleted"])
        self.assertEqual(len(self.db.list_patients()), 0)

    def test_can_delete_catalog_item_without_dependencies(self) -> None:
        item = self.db.save_catalog_item(
            {
                "name": "Shampoo duplicado",
                "category": "Peluqueria",
                "purchase_cost": "10",
                "margin_percent": "30",
                "presentation_total": "1",
                "stock_quantity": "3",
                "min_stock": "1",
                "track_inventory": True,
            }
        )

        deleted = self.db.delete_catalog_item(item["id"])

        self.assertTrue(deleted["deleted"])
        self.assertEqual(deleted["id"], item["id"])
        with self.assertRaises(ValidationError):
            self.db.get_catalog_item(item["id"])
        self.assertEqual(self.db.list_catalog_items(), [])

    def test_can_hide_catalog_item_with_related_documents_or_movements(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Cliente Inventario",
                "identification_type": "CC",
                "identification_number": "908070",
                "phone": "3009080700",
                "email": "inventario@example.com",
                "address": "Calle 90 # 80-70",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Milo",
                "species": "Canino",
                "breed": "Criollo",
                "sex": "Macho",
                "age_years": "4",
                "reproductive_status": "No esterilizado",
                "weight_kg": "14.2",
                "notes": "Paciente para prueba de inventario.",
            }
        )
        item = self.db.save_catalog_item(
            {
                "name": "Antibiotico de prueba",
                "category": "Medicamento",
                "purchase_cost": "12",
                "margin_percent": "25",
                "presentation_total": "1",
                "stock_quantity": "4",
                "min_stock": "1",
                "track_inventory": True,
            }
        )
        self.db.save_billing_document(
            {
                "document_type": "factura",
                "patient_id": patient["id"],
                "issue_date": "2026-03-20",
                "payment_method": "Pendiente",
                "cash_account": "caja_menor",
                "lines": [{"catalog_item_id": item["id"], "quantity": 1}],
            }
        )

        deleted = self.db.delete_catalog_item(item["id"])

        self.assertTrue(deleted["deleted"])
        self.assertEqual(self.db.list_catalog_items(), [])
        self.assertEqual(len(self.db.list_stock_movements()), 1)

    def test_available_slots_summary_counts_without_building_full_calendar(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Luisa Herrera",
                "identification_type": "CC",
                "identification_number": "223344",
                "phone": "3001234567",
                "email": "luisa@example.com",
                "address": "Calle 21",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Kira",
                "species": "Canino",
                "breed": "Criollo",
                "sex": "Hembra",
                "age_years": "3",
                "weight_kg": "8.5",
                "reproductive_status": "Esterilizado",
                "notes": "Paciente estable.",
            }
        )
        self.db.save_availability_rule(
            {
                "professional_name": "Agenda general",
                "day_of_week": str(date.today().weekday()),
                "start_time": "08:00",
                "end_time": "10:00",
                "slot_minutes": "30",
                "location": "Consultorio 1",
            }
        )
        self.db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": f"{date.today().isoformat()}T08:30",
                "reason": "Chequeo",
                "status": "scheduled",
                "duration_minutes": "30",
            }
        )

        self.assertEqual(self.db._get_available_slots_next_days_count(days=1), 3)

    def test_sales_report_summarizes_billing_inventory_and_payments(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Laura Ventas",
                "identification_type": "CC",
                "identification_number": "554433",
                "phone": "3001110099",
                "email": "laura.ventas@example.com",
                "address": "Calle Ventas 12",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Tina",
                "species": "Canino",
                "breed": "Mestizo",
                "sex": "Hembra",
                "age_years": "4",
                "weight_kg": "12.4",
                "reproductive_status": "Esterilizado",
                "notes": "Paciente de ventas.",
            }
        )
        provider = self.db.save_provider(
            {
                "name": "Proveedor Uno",
                "contact_name": "Carlos",
                "phone": "3004455667",
                "email": "proveedor@example.com",
                "notes": "Proveedor principal",
            }
        )
        item = self.db.save_catalog_item(
            {
                "provider_id": provider["id"],
                "name": "Antibiotico oral",
                "category": "Medicamentos",
                "purchase_cost": "20000",
                "margin_percent": "50",
                "presentation_total": "10",
                "stock_quantity": "5",
                "min_stock": "4",
                "track_inventory": True,
                "notes": "Controlado",
            }
        )
        document = self.db.save_billing_document(
            {
                "patient_id": patient["id"],
                "document_type": "factura",
                "issue_date": "2026-04-10",
                "due_date": "2026-04-15",
                "payment_method": "Pendiente",
                "cash_account": "caja_menor",
                "discount": "0",
                "recipient_email": "laura.ventas@example.com",
                "lines": [{"catalog_item_id": item["id"], "quantity": "2"}],
            }
        )
        payment = self.db.register_billing_payment(
            {
                "document_id": document["id"],
                "payment_date": "2026-04-11",
                "amount": "3000",
                "payment_method": "Transferencia",
                "cash_account": "transferencia",
                "note": "Abono parcial",
            }
        )
        self.assertEqual(payment["document_status"], "Pendiente")

        self.db.save_cash_movement(
            {
                "movement_type": "gasto",
                "concept": "Compra de insumos",
                "amount": "5000",
                "movement_date": "2026-04-11",
                "cash_account": "caja_mayor",
                "category": "Proveedor",
                "notes": "Compra manual",
            }
        )

        report = self.db.get_sales_report("2026-04-01", "2026-04-30")
        self.assertEqual(report["summary"]["facturas_periodo"], 1)
        self.assertEqual(len(report["documents"]), 1)
        self.assertEqual(len(report["payments"]), 1)
        self.assertGreater(report["summary"]["cartera_pendiente"], 0)
        self.assertEqual(report["summary"]["low_stock_count"], 1)
        self.assertTrue(any(item["name"] == "Antibiotico oral" for item in report["low_stock_items"]))

    def test_runtime_schema_management_defaults_off_on_vercel(self) -> None:
        with patch.dict(os.environ, {"VERCEL": "1"}, clear=False):
            os.environ.pop("LATIVET_POSTGRES_MANAGE_RUNTIME_SCHEMA", None)
            self.assertFalse(should_manage_postgres_runtime_schema())

    def test_runtime_schema_management_can_be_forced_on(self) -> None:
        with patch.dict(
            os.environ,
            {"VERCEL": "1", "LATIVET_POSTGRES_MANAGE_RUNTIME_SCHEMA": "1"},
            clear=False,
        ):
            self.assertTrue(should_manage_postgres_runtime_schema())

    def test_postgres_startup_checks_default_off_on_vercel(self) -> None:
        with patch.dict(os.environ, {"VERCEL": "1"}, clear=False):
            os.environ.pop("LATIVET_POSTGRES_STARTUP_CHECKS", None)
            self.assertFalse(should_run_postgres_startup_checks())

    def test_postgres_startup_checks_can_be_forced_on(self) -> None:
        with patch.dict(
            os.environ,
            {"VERCEL": "1", "LATIVET_POSTGRES_STARTUP_CHECKS": "1"},
            clear=False,
        ):
            self.assertTrue(should_run_postgres_startup_checks())

    def test_consultations_availability_and_grooming_are_reported(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Laura Torres",
                "identification_type": "CC",
                "identification_number": "111222",
                "phone": "3001112233",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Nina",
                "species": "Canino",
                "sex": "Hembra",
            }
        )
        record = self.db.save_clinical_record(
            {
                "patient_id": patient["id"],
                "opened_at": "2026-03-24T09:00",
                "care_area": "Ambulatorio",
                "history_focus": "Dermatologia",
                "reason_for_consultation": "Prurito",
                "anamnesis": "Evolucion de 3 dias.",
                "physical_exam_summary": "Lesiones cutaneas leves.",
                "presumptive_diagnosis": "Dermatitis",
                "procedures_plan": "Terapia topica y examen complementario.",
                "recommendations": "Control en 7 dias.",
                "professional_name": "Dra. Velez",
                "professional_license": "MV-300",
            },
            finalize=True,
        )
        consultation = self.db.save_consultation(
            {
                "record_id": record["id"],
                "consultation_at": "2026-03-24T09:30",
                "consultation_type": "Examen de laboratorio",
                "title": "Citologia de piel",
                "summary": "Se toma muestra para citologia.",
                "professional_name": "Dra. Velez",
                "professional_license": "MV-300",
            }
        )
        consent = self.db.save_consent(
            {
                "patient_id": patient["id"],
                "record_id": record["id"],
                "consultation_id": consultation["id"],
                "consent_type": "Procedimiento invasivo",
                "procedure_name": "Toma de muestra",
                "risks_explained": "Molestia local.",
                "owner_statement": "Autorizo.",
                "owner_signature_name": "Laura Torres",
                "owner_identification": "111222",
                "professional_name": "Dra. Velez",
                "professional_license": "MV-300",
                "signed_at": "2026-03-24T09:20",
            }
        )
        self.assertEqual(consent["consultation_label"], "Citologia de piel")

        rule = self.db.save_availability_rule(
            {
                "scope": "personal",
                "professional_name": "Dra. Velez",
                "day_of_week": "1",
                "start_time": "08:00",
                "end_time": "12:00",
                "slot_minutes": "30",
                "location": "Consultorio 2",
            }
        )
        self.assertEqual(rule["professional_name"], "Dra. Velez")

        grooming = self.db.save_grooming_document(
            {
                "patient_id": patient["id"],
                "service_at": "2026-03-24T15:00",
                "document_type": "Ficha",
                "service_name": "Bano medicado",
                "stylist_name": "Sara",
                "status": "completed",
                "recommendations": "Repetir en 15 dias.",
            }
        )
        self.assertEqual(grooming["status"], "completed")

        snapshot = self.db.bootstrap()
        self.assertEqual(len(snapshot["consultations"]), 1)
        self.assertEqual(len(snapshot["availability_rules"]), 1)
        self.assertEqual(len(snapshot["grooming_documents"]), 1)
        self.assertIn("reports", snapshot)
        self.assertIn("requests", snapshot)
        self.assertEqual(snapshot["reports"]["totals"]["consultations"], 1)
        self.assertEqual(snapshot["requests"]["orders"][0]["id"], consultation["id"])

    def test_consultation_next_control_creates_and_removes_reminder(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Sofia Rojas",
                "identification_type": "CC",
                "identification_number": "778811",
                "phone": "3007778811",
                "email": "sofia@example.com",
                "address": "Carrera 12",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Milo",
                "species": "Canino",
                "breed": "Mestizo",
                "sex": "Macho",
                "age_years": "4",
                "weight_kg": "14.2",
                "reproductive_status": "Esterilizado",
                "notes": "Paciente estable.",
            }
        )
        record = self.db.save_clinical_record(
            {
                "patient_id": patient["id"],
                "opened_at": "2026-03-24T09:00",
                "reason_for_consultation": "Control posterior",
                "anamnesis": "Paciente estable.",
                "physical_exam_summary": "Sin novedades.",
                "presumptive_diagnosis": "Control",
                "procedures_plan": "Seguimiento.",
                "recommendations": "Volver en unos dias.",
                "professional_name": "Dra. Arias",
                "professional_license": "MV-550",
            },
            finalize=False,
        )

        consultation = self.db.save_consultation(
            {
                "record_id": record["id"],
                "consultation_at": "2026-03-24T10:00",
                "consultation_type": "Consulta",
                "title": "Control posterior",
                "summary": "Paciente sin complicaciones.",
                "next_control": "2026-03-30",
                "professional_name": "Dra. Arias",
                "professional_license": "MV-550",
            }
        )
        reminder = self.db.get_control_reminder_for_consultation(consultation["id"])
        self.assertIsNotNone(reminder)
        self.assertEqual(reminder["scheduled_for"], "2026-03-30")
        self.assertEqual(reminder["status"], "pending")

        updated_consultation = self.db.save_consultation(
            {
                "id": consultation["id"],
                "record_id": record["id"],
                "consultation_at": "2026-03-24T10:00",
                "consultation_type": "Consulta",
                "title": "Control posterior",
                "summary": "Paciente sin complicaciones.",
                "next_control": "",
                "professional_name": "Dra. Arias",
                "professional_license": "MV-550",
            }
        )
        self.assertEqual(updated_consultation["id"], consultation["id"])
        self.assertIsNone(
            self.db.get_control_reminder_for_consultation(consultation["id"])
        )

    def test_delete_consultation_removes_record_and_reminder(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Carlos Pardo",
                "identification_type": "CC",
                "identification_number": "445566",
                "phone": "3001122334",
                "email": "carlos@example.com",
                "address": "Calle 9",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Nala",
                "species": "Felino",
                "breed": "Mestizo",
                "sex": "Hembra",
                "age_years": "3",
                "weight_kg": "4.1",
                "reproductive_status": "Esterilizada",
                "notes": "Paciente tranquila.",
            }
        )
        record = self.db.save_clinical_record(
            {
                "patient_id": patient["id"],
                "opened_at": "2026-03-26T08:00",
                "reason_for_consultation": "Seguimiento",
                "anamnesis": "Sin cambios recientes.",
                "physical_exam_summary": "Estable.",
                "presumptive_diagnosis": "Control",
                "procedures_plan": "Observacion.",
                "recommendations": "Continuar manejo.",
                "professional_name": "Dra. Gomez",
                "professional_license": "MV-220",
            },
            finalize=False,
        )
        consultation = self.db.save_consultation(
            {
                "record_id": record["id"],
                "consultation_at": "2026-03-26T09:00",
                "consultation_type": "Documento",
                "title": "Orden de laboratorio",
                "summary": "Motivo de la orden: Control.",
                "indications": "Solicitudes: Hemograma",
                "next_control": "2026-04-02",
                "professional_name": "Dra. Gomez",
                "professional_license": "MV-220",
            }
        )

        deleted = self.db.delete_consultation(consultation["id"])

        self.assertEqual(deleted["id"], consultation["id"])
        self.assertEqual(self.db.list_consultations(), [])
        self.assertIsNone(
            self.db.get_control_reminder_for_consultation(consultation["id"])
        )
        with self.assertRaises(ValidationError):
            self.db.delete_consultation(consultation["id"])

    def test_vaccination_next_control_creates_vaccination_reminder(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Camila Torres",
                "identification_type": "CC",
                "identification_number": "889922",
                "phone": "3008899221",
                "email": "camila@example.com",
                "address": "Calle 21",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Nina",
                "species": "Felino",
                "breed": "Mestizo",
                "sex": "Hembra",
                "age_years": "2",
                "weight_kg": "3.9",
                "reproductive_status": "Esterilizado",
                "notes": "Paciente sana.",
            }
        )
        record = self.db.save_clinical_record(
            {
                "patient_id": patient["id"],
                "opened_at": "2026-03-24T09:00",
                "reason_for_consultation": "Refuerzo anual",
                "anamnesis": "Paciente estable.",
                "physical_exam_summary": "Sin novedades.",
                "presumptive_diagnosis": "Vacunacion preventiva",
                "procedures_plan": "Aplicar vacuna anual.",
                "recommendations": "Volver para refuerzo.",
                "professional_name": "Dra. Arias",
                "professional_license": "MV-550",
            },
            finalize=False,
        )

        consultation = self.db.save_consultation(
            {
                "record_id": record["id"],
                "consultation_at": "2026-03-24T10:00",
                "consultation_type": "Vacunacion",
                "title": "Triple felina",
                "summary": "Aplicacion de vacuna.",
                "next_control": "2026-04-24",
                "professional_name": "Dra. Arias",
                "professional_license": "MV-550",
            }
        )
        reminder = self.db.get_control_reminder_for_consultation(consultation["id"])
        self.assertIsNotNone(reminder)
        self.assertEqual(reminder["scheduled_for"], "2026-04-24")
        self.assertEqual(reminder["consultation_type"], "Vacunacion")
        self.assertEqual(reminder["consultation_title"], "Triple felina")

    def test_deworming_next_control_creates_deworming_reminder(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Luis Herrera",
                "identification_type": "CC",
                "identification_number": "778899",
                "phone": "3007788990",
                "email": "luis@example.com",
                "address": "Calle 45",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Toby",
                "species": "Canino",
                "breed": "Mestizo",
                "sex": "Macho",
                "age_years": "4",
                "weight_kg": "11.4",
                "reproductive_status": "Esterilizado",
                "notes": "Paciente para desparasitacion.",
            }
        )
        record = self.db.save_clinical_record(
            {
                "patient_id": patient["id"],
                "opened_at": "2026-03-24T11:00",
                "reason_for_consultation": "Desparasitacion preventiva",
                "anamnesis": "Paciente estable.",
                "physical_exam_summary": "Sin novedades.",
                "presumptive_diagnosis": "Prevencion antiparasitaria",
                "procedures_plan": "Aplicar desparasitante.",
                "recommendations": "Repetir segun cronograma.",
                "professional_name": "Dra. Arias",
                "professional_license": "MV-550",
            },
            finalize=False,
        )

        consultation = self.db.save_consultation(
            {
                "record_id": record["id"],
                "consultation_at": "2026-03-24T12:00",
                "consultation_type": "Desparasitacion",
                "title": "Simparica Trio",
                "summary": "Aplicacion de desparasitante.",
                "next_control": "2026-04-10",
                "professional_name": "Dra. Arias",
                "professional_license": "MV-550",
            }
        )
        reminder = self.db.get_control_reminder_for_consultation(consultation["id"])
        self.assertIsNotNone(reminder)
        self.assertEqual(reminder["scheduled_for"], "2026-04-10")
        self.assertEqual(reminder["consultation_type"], "Desparasitacion")
        self.assertEqual(reminder["consultation_title"], "Simparica Trio")

    def test_appointments_follow_general_availability_and_prevent_overlap(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Celia Vargas",
                "identification_type": "CC",
                "identification_number": "445566",
                "phone": "3004455667",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Milo",
                "species": "Canino",
                "sex": "Macho",
            }
        )
        rule = self.db.save_availability_rule(
            {
                "professional_name": "Agenda general",
                "day_of_week": "1",
                "start_time": "08:00",
                "end_time": "10:00",
                "slot_minutes": "30",
                "location": "Consultorio 1",
            }
        )
        appointment = self.db.save_appointment(
            {
                "patient_id": patient["id"],
                "appointment_at": "2026-03-24T08:30",
                "reason": "Vacunacion anual",
                "status": "scheduled",
                "duration_minutes": "30",
            }
        )
        self.assertEqual(appointment["professional_name"], "Agenda general")

        with self.assertRaises(ValidationError):
            self.db.save_appointment(
                {
                    "patient_id": patient["id"],
                    "appointment_at": "2026-03-24T08:45",
                    "reason": "Fuera de bloque",
                    "status": "scheduled",
                    "duration_minutes": "30",
                }
            )

        with self.assertRaises(ValidationError):
            self.db.save_appointment(
                {
                    "patient_id": patient["id"],
                    "appointment_at": "2026-03-24T08:30",
                    "reason": "Cruce de agenda",
                    "status": "scheduled",
                    "duration_minutes": "30",
                }
            )

        deleted = self.db.delete_availability_rule(rule["id"])
        self.assertTrue(deleted["deleted"])

    def test_billing_flow_updates_inventory_cash_and_reports(self) -> None:
        owner = self.db.save_owner(
            {
                "full_name": "Diego Perez",
                "identification_type": "CC",
                "identification_number": "555444",
                "phone": "3005554444",
                "email": "diego@example.com",
            }
        )
        patient = self.db.save_patient(
            {
                "owner_id": owner["id"],
                "name": "Kira",
                "species": "Canino",
                "sex": "Hembra",
            }
        )
        provider = self.db.save_provider(
            {
                "name": "Proveedor Central",
                "contact_name": "Sandra",
                "phone": "6010000000",
                "email": "proveedor@example.com",
            }
        )
        item = self.db.save_catalog_item(
            {
                "provider_id": provider["id"],
                "name": "Antibiotico oral",
                "category": "Medicamento",
                "purchase_cost": "100",
                "margin_percent": "50",
                "presentation_total": "2",
                "stock_quantity": "1",
                "min_stock": "2",
                "track_inventory": True,
            }
        )
        self.assertEqual(item["unit_cost"], 50.0)
        self.assertEqual(item["unit_price"], 75.0)
        self.assertEqual(item["profit_amount"], 25.0)

        quote = self.db.save_billing_document(
            {
                "document_type": "cotizacion",
                "patient_id": patient["id"],
                "issue_date": "2026-03-20",
                "payment_method": "Pendiente",
                "lines": [{"catalog_item_id": item["id"], "quantity": 1}],
            }
        )
        self.assertEqual(quote["status"], "Cotizacion")
        self.assertEqual(self.db.get_catalog_item(item["id"])["stock_quantity"], 1.0)
        self.assertEqual(len(self.db.list_cash_movements()), 0)
        self.assertEqual(len(self.db.list_stock_movements()), 0)

        invoice = self.db.save_billing_document(
            {
                "document_type": "factura",
                "patient_id": patient["id"],
                "issue_date": "2026-03-21",
                "payment_method": "Pendiente",
                "cash_account": "caja_menor",
                "initial_payment_amount": "20",
                "initial_payment_method": "Efectivo",
                "initial_payment_cash_account": "caja_menor",
                "lines": [{"catalog_item_id": item["id"], "quantity": 2}],
            }
        )
        self.assertEqual(invoice["document_number"], "0002")
        self.assertEqual(invoice["status"], "Pendiente")
        self.assertEqual(invoice["amount_paid"], 20.0)
        self.assertEqual(self.db.get_catalog_item(item["id"])["stock_quantity"], -1.0)
        self.assertEqual(len(self.db.list_stock_movements()), 1)
        self.assertEqual(len(self.db.list_cash_movements()), 1)
        self.assertEqual(self.db.get_requests_summary()["billing_documents"][0]["id"], invoice["id"])

        payment = self.db.register_billing_payment(
            {
                "document_id": invoice["id"],
                "payment_date": "2026-03-22",
                "amount": str(invoice["balance_due"]),
                "payment_method": "Transferencia",
                "cash_account": "transferencia",
                "note": "Pago final",
            }
        )
        self.assertEqual(payment["document_status"], "Pagado")

        with self.assertRaises(ValidationError):
            self.db.register_billing_payment(
                {
                    "document_id": invoice["id"],
                    "payment_date": "2026-03-23",
                    "amount": "1",
                    "payment_method": "Efectivo",
                    "cash_account": "caja_menor",
                    "note": "Intento extra",
                }
            )

        with self.assertRaises(ValidationError):
            self.db.adjust_catalog_stock(
                {
                    "item_id": item["id"],
                    "movement_type": "salida",
                    "quantity": "1",
                    "movement_date": "2026-03-23",
                    "note": "Ajuste no permitido",
                }
            )

        adjustment = self.db.adjust_catalog_stock(
            {
                "item_id": item["id"],
                "movement_type": "entrada",
                "quantity": "5",
                "movement_date": "2026-03-23",
                "note": "Reposicion",
            }
        )
        self.assertEqual(adjustment["balance_after"], 4.0)

        cash = self.db.save_cash_movement(
            {
                "movement_type": "gasto",
                "concept": "Compra de insumos",
                "amount": "30",
                "movement_date": "2026-03-23",
                "cash_account": "caja_mayor",
                "category": "Compra",
            }
        )
        self.assertEqual(cash["movement_type"], "gasto")

        snapshot = self.db.bootstrap()
        self.assertEqual(len(snapshot["providers"]), 1)
        self.assertEqual(len(snapshot["catalog_items"]), 1)
        self.assertEqual(len(snapshot["billing_documents"]), 2)
        self.assertEqual(len(snapshot["cash_movements"]), 3)
        self.assertEqual(len(snapshot["stock_movements"]), 2)
        self.assertEqual(snapshot["billing_summary"]["documents_total"], 2)
        self.assertEqual(snapshot["billing_summary"]["facturas_total"], 1)
        self.assertEqual(snapshot["reports"]["totals"]["billing_documents"], 2)
        self.assertEqual(snapshot["reports"]["totals"]["providers"], 1)
        self.assertEqual(snapshot["reports"]["totals"]["catalog_items"], 1)

    def test_cash_session_tracks_opening_and_closing_totals(self) -> None:
        opened = self.db.open_cash_session(
            {
                "session_date": "2026-03-27",
                "cash_account": "caja_menor",
                "opening_amount": "150000",
                "opening_notes": "Base del dia",
            }
        )
        self.assertEqual(opened["status"], "open")
        self.assertEqual(opened["opening_amount"], 150000.0)
        self.assertEqual(opened["expected_closing_amount"], 150000.0)

        self.db.save_cash_movement(
            {
                "movement_type": "ingreso",
                "concept": "Venta mostrador",
                "amount": "50000",
                "movement_date": "2026-03-27",
                "cash_account": "caja_menor",
                "category": "Venta",
            }
        )
        self.db.save_cash_movement(
            {
                "movement_type": "gasto",
                "concept": "Pago transporte",
                "amount": "10000",
                "movement_date": "2026-03-27",
                "cash_account": "caja_menor",
                "category": "Operacion",
            }
        )

        closed = self.db.close_cash_session(
            {
                "session_date": "2026-03-27",
                "cash_account": "caja_menor",
                "closing_amount": "192000",
                "closing_notes": "Conteo final",
            }
        )
        self.assertEqual(closed["status"], "closed")
        self.assertEqual(closed["income_total"], 50000.0)
        self.assertEqual(closed["expense_total"], 10000.0)
        self.assertEqual(closed["expected_closing_amount"], 190000.0)
        self.assertEqual(closed["difference_amount"], 2000.0)

        sessions = self.db.list_cash_sessions()
        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0]["cash_account_label"], "Caja menor")

        snapshot = self.db.bootstrap()
        self.assertEqual(len(snapshot["cash_sessions"]), 1)

        with self.assertRaises(ValidationError):
            self.db.open_cash_session(
                {
                    "session_date": "2026-03-27",
                    "cash_account": "caja_menor",
                    "opening_amount": "50000",
                }
            )


if __name__ == "__main__":
    unittest.main()
