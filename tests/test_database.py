from __future__ import annotations

import tempfile
import unittest
from datetime import date
from pathlib import Path

from lativet.database import Database
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


if __name__ == "__main__":
    unittest.main()
