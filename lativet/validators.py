from __future__ import annotations

import json
from datetime import date, datetime


class ValidationError(ValueError):
    pass


def _strip(value: object) -> str:
    return str(value or "").strip()


def required_text(data: dict, key: str, label: str) -> str:
    value = _strip(data.get(key))
    if not value:
        raise ValidationError(f"El campo '{label}' es obligatorio.")
    return value


def optional_text(data: dict, key: str) -> str:
    return _strip(data.get(key))


def optional_float(data: dict, key: str) -> float | None:
    value = _strip(data.get(key))
    if not value:
        return None
    try:
        return round(float(value), 2)
    except ValueError as exc:
        raise ValidationError(f"El campo '{key}' debe ser numerico.") from exc


def optional_int(data: dict, key: str) -> int | None:
    value = _strip(data.get(key))
    if not value:
        return None
    try:
        return int(value)
    except ValueError as exc:
        raise ValidationError(f"El campo '{key}' debe ser entero.") from exc


def parse_date(value: str, label: str) -> str:
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise ValidationError(f"El campo '{label}' debe tener formato YYYY-MM-DD.") from exc


def parse_datetime(value: str, label: str) -> str:
    try:
        return datetime.fromisoformat(value).replace(microsecond=0).isoformat(timespec="seconds")
    except ValueError as exc:
        raise ValidationError(
            f"El campo '{label}' debe tener formato de fecha y hora valido."
        ) from exc


def parse_time(value: str, label: str) -> str:
    text = _strip(value)
    try:
        return datetime.strptime(text, "%H:%M").strftime("%H:%M")
    except ValueError as exc:
        raise ValidationError(f"El campo '{label}' debe tener formato HH:MM.") from exc


def optional_date(data: dict, key: str, label: str) -> str | None:
    value = _strip(data.get(key))
    if not value:
        return None
    return parse_date(value, label)


def optional_datetime(data: dict, key: str, label: str) -> str | None:
    value = _strip(data.get(key))
    if not value:
        return None
    return parse_datetime(value, label)


def to_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return _strip(value).lower() in {"1", "true", "on", "yes", "si", "s"}


def validate_settings(payload: dict) -> dict:
    retention_years = optional_int(payload, "retention_years")
    if retention_years is None:
        retention_years = 15
    if retention_years < 5 or retention_years > 30:
        raise ValidationError("La retencion debe estar entre 5 y 30 anos.")
    smtp_port = optional_int(payload, "smtp_port")
    if smtp_port is None:
        smtp_port = 587
    if smtp_port < 1 or smtp_port > 65535:
        raise ValidationError("El puerto SMTP debe estar entre 1 y 65535.")
    agenda_timezone = optional_text(payload, "agenda_timezone") or "America/Bogota"
    return {
        "clinic_name": required_text(payload, "clinic_name", "Nombre de la clinica"),
        "clinic_registration": optional_text(payload, "clinic_registration"),
        "clinic_address": optional_text(payload, "clinic_address"),
        "clinic_phone": optional_text(payload, "clinic_phone"),
        "clinic_email": optional_text(payload, "clinic_email"),
        "agenda_timezone": agenda_timezone,
        "retention_years": retention_years,
        "smtp_enabled": to_bool(payload.get("smtp_enabled")),
        "smtp_from": optional_text(payload, "smtp_from"),
        "smtp_host": optional_text(payload, "smtp_host") or "smtp.gmail.com",
        "smtp_port": smtp_port,
        "smtp_app_password": optional_text(payload, "smtp_app_password"),
        "billing_footer": optional_text(payload, "billing_footer"),
        "billing_default_cash_account": optional_text(payload, "billing_default_cash_account")
        or "caja_menor",
        "email_subject_template": optional_text(payload, "email_subject_template"),
        "email_body_template": optional_text(payload, "email_body_template"),
        "google_calendar_enabled": to_bool(payload.get("google_calendar_enabled")),
        "google_calendar_id": optional_text(payload, "google_calendar_id") or "primary",
    }


def validate_user(payload: dict) -> dict:
    permissions = payload.get("permissions") or []
    if isinstance(permissions, str):
        try:
            permissions = json.loads(permissions)
        except json.JSONDecodeError:
            permissions = []
    if not isinstance(permissions, list):
        permissions = []
    return {
        "id": optional_text(payload, "id"),
        "full_name": required_text(payload, "full_name", "Nombre completo"),
        "email": required_text(payload, "email", "Correo").lower(),
        "role": optional_text(payload, "role") or "Auxiliar",
        "permissions": [str(item) for item in permissions],
        "is_active": to_bool(payload.get("is_active", True)),
        "password": optional_text(payload, "password"),
    }


def validate_owner(payload: dict) -> dict:
    return {
        "id": optional_text(payload, "id"),
        "full_name": required_text(payload, "full_name", "Nombre completo"),
        "identification_type": required_text(payload, "identification_type", "Tipo de identificacion"),
        "identification_number": required_text(
            payload, "identification_number", "Numero de identificacion"
        ),
        "phone": required_text(payload, "phone", "Telefono"),
        "alternate_phone": optional_text(payload, "alternate_phone"),
        "email": optional_text(payload, "email"),
        "address": optional_text(payload, "address"),
    }


def validate_patient(payload: dict) -> dict:
    birth_date = optional_date(payload, "birth_date", "Fecha de nacimiento")
    return {
        "id": optional_text(payload, "id"),
        "owner_id": required_text(payload, "owner_id", "Propietario"),
        "name": required_text(payload, "name", "Nombre del paciente"),
        "species": required_text(payload, "species", "Especie"),
        "breed": optional_text(payload, "breed"),
        "sex": required_text(payload, "sex", "Sexo"),
        "birth_date": birth_date,
        "color": optional_text(payload, "color"),
        "reproductive_status": optional_text(payload, "reproductive_status"),
        "microchip": optional_text(payload, "microchip"),
        "weight_kg": optional_float(payload, "weight_kg"),
        "allergies": optional_text(payload, "allergies"),
        "chronic_conditions": optional_text(payload, "chronic_conditions"),
        "vaccination_status": optional_text(payload, "vaccination_status"),
        "deworming_status": optional_text(payload, "deworming_status"),
        "notes": optional_text(payload, "notes"),
    }


def validate_appointment(payload: dict) -> dict:
    duration_minutes = optional_int(payload, "duration_minutes")
    if duration_minutes is None:
        duration_minutes = 30
    if duration_minutes < 15 or duration_minutes > 240:
        raise ValidationError("La duracion de la cita debe estar entre 15 y 240 minutos.")
    return {
        "id": optional_text(payload, "id"),
        "patient_id": required_text(payload, "patient_id", "Paciente"),
        "appointment_at": parse_datetime(
            required_text(payload, "appointment_at", "Fecha y hora"), "Fecha y hora"
        ),
        "reason": required_text(payload, "reason", "Motivo"),
        "status": optional_text(payload, "status") or "scheduled",
        "professional_name": optional_text(payload, "professional_name"),
        "duration_minutes": duration_minutes,
        "notes": optional_text(payload, "notes"),
    }


def validate_consent(payload: dict) -> dict:
    return {
        "id": optional_text(payload, "id"),
        "patient_id": required_text(payload, "patient_id", "Paciente"),
        "record_id": optional_text(payload, "record_id"),
        "consultation_id": optional_text(payload, "consultation_id"),
        "consent_type": required_text(payload, "consent_type", "Tipo de consentimiento"),
        "procedure_name": required_text(payload, "procedure_name", "Procedimiento"),
        "risks_explained": required_text(payload, "risks_explained", "Riesgos explicados"),
        "benefits_expected": optional_text(payload, "benefits_expected"),
        "alternatives": optional_text(payload, "alternatives"),
        "cost_estimate": optional_text(payload, "cost_estimate"),
        "owner_statement": required_text(payload, "owner_statement", "Manifestacion del tutor"),
        "owner_signature_name": required_text(
            payload, "owner_signature_name", "Nombre de quien autoriza"
        ),
        "owner_identification": required_text(
            payload, "owner_identification", "Identificacion de quien autoriza"
        ),
        "professional_name": required_text(payload, "professional_name", "Profesional"),
        "professional_license": required_text(
            payload, "professional_license", "Matricula profesional"
        ),
        "signed_at": parse_datetime(
            required_text(payload, "signed_at", "Fecha de firma"), "Fecha de firma"
        ),
        "notes": optional_text(payload, "notes"),
    }


def validate_clinical_record(payload: dict) -> dict:
    return {
        "id": optional_text(payload, "id"),
        "patient_id": required_text(payload, "patient_id", "Paciente"),
        "opened_at": optional_datetime(payload, "opened_at", "Fecha de apertura"),
        "care_area": optional_text(payload, "care_area"),
        "history_focus": optional_text(payload, "history_focus"),
        "reason_for_consultation": optional_text(payload, "reason_for_consultation"),
        "anamnesis": optional_text(payload, "anamnesis"),
        "history_notes": optional_text(payload, "history_notes"),
        "temperature_c": optional_float(payload, "temperature_c"),
        "heart_rate_bpm": optional_int(payload, "heart_rate_bpm"),
        "respiratory_rate_bpm": optional_int(payload, "respiratory_rate_bpm"),
        "weight_kg": optional_float(payload, "weight_kg"),
        "body_condition": optional_text(payload, "body_condition"),
        "hydration_status": optional_text(payload, "hydration_status"),
        "physical_exam_summary": optional_text(payload, "physical_exam_summary"),
        "presumptive_diagnosis": optional_text(payload, "presumptive_diagnosis"),
        "differential_diagnosis": optional_text(payload, "differential_diagnosis"),
        "definitive_diagnosis": optional_text(payload, "definitive_diagnosis"),
        "procedures_plan": optional_text(payload, "procedures_plan"),
        "medications": optional_text(payload, "medications"),
        "lab_requests": optional_text(payload, "lab_requests"),
        "prognosis": optional_text(payload, "prognosis"),
        "recommendations": optional_text(payload, "recommendations"),
        "attachments_summary": optional_text(payload, "attachments_summary"),
        "consent_required": to_bool(payload.get("consent_required")),
        "consent_summary": optional_text(payload, "consent_summary"),
        "professional_name": required_text(payload, "professional_name", "Profesional"),
        "professional_license": required_text(
            payload, "professional_license", "Matricula profesional"
        ),
    }


def validate_consultation(payload: dict) -> dict:
    return {
        "id": optional_text(payload, "id"),
        "record_id": required_text(payload, "record_id", "Historia clinica"),
        "consultation_at": optional_datetime(payload, "consultation_at", "Fecha de consulta")
        or datetime.now().replace(microsecond=0).isoformat(timespec="seconds"),
        "consultation_type": required_text(payload, "consultation_type", "Tipo de consulta"),
        "title": required_text(payload, "title", "Titulo"),
        "summary": required_text(payload, "summary", "Resumen"),
        "indications": optional_text(payload, "indications"),
        "attachments_summary": optional_text(payload, "attachments_summary"),
        "document_reference": optional_text(payload, "document_reference"),
        "referred_to": optional_text(payload, "referred_to"),
        "consent_required": to_bool(payload.get("consent_required")),
        "consent_id": optional_text(payload, "consent_id"),
        "professional_name": required_text(payload, "professional_name", "Profesional"),
        "professional_license": required_text(
            payload, "professional_license", "Matricula profesional"
        ),
    }


def validate_availability_rule(payload: dict) -> dict:
    day_of_week = optional_int(payload, "day_of_week")
    if day_of_week is None or day_of_week < 0 or day_of_week > 6:
        raise ValidationError("El dia de la semana debe estar entre 0 y 6.")
    slot_minutes = optional_int(payload, "slot_minutes")
    if slot_minutes is None:
        slot_minutes = 30
    if slot_minutes < 15 or slot_minutes > 240:
        raise ValidationError("La duracion por bloque debe estar entre 15 y 240 minutos.")
    start_time = parse_time(required_text(payload, "start_time", "Hora inicial"), "Hora inicial")
    end_time = parse_time(required_text(payload, "end_time", "Hora final"), "Hora final")
    if end_time <= start_time:
        raise ValidationError("La hora final debe ser mayor que la hora inicial.")
    return {
        "id": optional_text(payload, "id"),
        "scope": "general",
        "professional_name": optional_text(payload, "professional_name") or "Agenda general",
        "day_of_week": day_of_week,
        "start_time": start_time,
        "end_time": end_time,
        "slot_minutes": slot_minutes,
        "location": optional_text(payload, "location"),
        "notes": optional_text(payload, "notes"),
    }


def validate_google_calendar_config(payload: dict) -> dict:
    return {
        "google_calendar_enabled": to_bool(payload.get("google_calendar_enabled")),
        "google_calendar_id": optional_text(payload, "google_calendar_id") or "primary",
        "agenda_timezone": optional_text(payload, "agenda_timezone") or "America/Bogota",
        "credentials_json": optional_text(payload, "credentials_json"),
    }


def validate_grooming_document(payload: dict) -> dict:
    status = optional_text(payload, "status") or "scheduled"
    if status not in {"scheduled", "in_progress", "completed", "cancelled"}:
        raise ValidationError("El estado de peluqueria no es valido.")
    return {
        "id": optional_text(payload, "id"),
        "patient_id": required_text(payload, "patient_id", "Paciente"),
        "service_at": optional_datetime(payload, "service_at", "Fecha de servicio")
        or datetime.now().replace(microsecond=0).isoformat(timespec="seconds"),
        "document_type": required_text(payload, "document_type", "Tipo de documento"),
        "service_name": required_text(payload, "service_name", "Servicio"),
        "stylist_name": required_text(payload, "stylist_name", "Responsable"),
        "status": status,
        "notes": optional_text(payload, "notes"),
        "recommendations": optional_text(payload, "recommendations"),
        "products_used": optional_text(payload, "products_used"),
        "next_visit_at": optional_datetime(payload, "next_visit_at", "Proxima visita"),
    }


def validate_evolution(payload: dict) -> dict:
    return {
        "record_id": required_text(payload, "record_id", "Historia clinica"),
        "evolution_at": optional_datetime(payload, "evolution_at", "Fecha de evolucion")
        or datetime.now().replace(microsecond=0).isoformat(timespec="seconds"),
        "subjective": optional_text(payload, "subjective"),
        "objective": optional_text(payload, "objective"),
        "assessment": optional_text(payload, "assessment"),
        "plan": required_text(payload, "plan", "Plan"),
        "author_name": required_text(payload, "author_name", "Profesional"),
        "author_license": required_text(payload, "author_license", "Matricula profesional"),
    }


def validate_provider(payload: dict) -> dict:
    return {
        "id": optional_text(payload, "id"),
        "name": required_text(payload, "name", "Proveedor"),
        "contact_name": optional_text(payload, "contact_name"),
        "phone": optional_text(payload, "phone"),
        "email": optional_text(payload, "email"),
        "notes": optional_text(payload, "notes"),
    }


def validate_catalog_item(payload: dict) -> dict:
    purchase_cost = optional_float(payload, "purchase_cost")
    margin_percent = optional_float(payload, "margin_percent")
    presentation_total = optional_float(payload, "presentation_total")
    stock_quantity = optional_float(payload, "stock_quantity")
    min_stock = optional_float(payload, "min_stock")
    return {
        "id": optional_text(payload, "id"),
        "provider_id": optional_text(payload, "provider_id"),
        "name": required_text(payload, "name", "Nombre del item"),
        "category": required_text(payload, "category", "Categoria"),
        "purchase_cost": purchase_cost if purchase_cost is not None else 0.0,
        "margin_percent": margin_percent if margin_percent is not None else 0.0,
        "presentation_total": presentation_total if presentation_total not in (None, 0) else 1.0,
        "stock_quantity": stock_quantity if stock_quantity is not None else 0.0,
        "min_stock": min_stock if min_stock is not None else 0.0,
        "track_inventory": to_bool(payload.get("track_inventory")),
        "notes": optional_text(payload, "notes"),
    }


def validate_billing_document_line(payload: dict) -> dict:
    quantity = optional_float(payload, "quantity")
    if quantity is None or quantity <= 0:
        raise ValidationError("La cantidad del item debe ser mayor a cero.")
    return {
        "catalog_item_id": required_text(payload, "catalog_item_id", "Item de catalogo"),
        "quantity": quantity,
    }


def validate_billing_document(payload: dict) -> dict:
    document_type = required_text(payload, "document_type", "Tipo de documento").lower()
    if document_type not in {"factura", "cotizacion"}:
        raise ValidationError("El tipo de documento no es valido.")
    discount = optional_float(payload, "discount")
    initial_payment_amount = optional_float(payload, "initial_payment_amount")
    payment_method = required_text(payload, "payment_method", "Metodo de pago")
    lines = payload.get("lines") or []
    if not isinstance(lines, list) or not lines:
        raise ValidationError("Debes agregar al menos una linea al documento.")
    return {
        "id": optional_text(payload, "id"),
        "document_type": document_type,
        "patient_id": required_text(payload, "patient_id", "Paciente"),
        "issue_date": parse_date(required_text(payload, "issue_date", "Fecha de emision"), "Fecha de emision"),
        "due_date": optional_date(payload, "due_date", "Fecha de vencimiento"),
        "recipient_email": optional_text(payload, "recipient_email"),
        "payment_method": payment_method,
        "cash_account": optional_text(payload, "cash_account"),
        "notes": optional_text(payload, "notes"),
        "discount": discount if discount is not None else 0.0,
        "initial_payment_amount": initial_payment_amount if initial_payment_amount is not None else 0.0,
        "initial_payment_date": optional_date(payload, "initial_payment_date", "Fecha de abono"),
        "initial_payment_method": optional_text(payload, "initial_payment_method") or "Efectivo",
        "initial_payment_cash_account": optional_text(payload, "initial_payment_cash_account")
        or "caja_menor",
        "lines": [validate_billing_document_line(line) for line in lines],
    }


def validate_billing_payment(payload: dict) -> dict:
    amount = optional_float(payload, "amount")
    if amount is None or amount <= 0:
        raise ValidationError("El valor del abono debe ser mayor a cero.")
    return {
        "document_id": required_text(payload, "document_id", "Documento"),
        "payment_date": parse_date(required_text(payload, "payment_date", "Fecha de pago"), "Fecha de pago"),
        "amount": amount,
        "payment_method": required_text(payload, "payment_method", "Metodo de pago"),
        "cash_account": required_text(payload, "cash_account", "Cuenta de caja"),
        "note": optional_text(payload, "note"),
    }


def validate_cash_movement(payload: dict) -> dict:
    amount = optional_float(payload, "amount")
    if amount is None or amount <= 0:
        raise ValidationError("El valor del movimiento debe ser mayor a cero.")
    movement_type = required_text(payload, "movement_type", "Tipo de movimiento")
    if movement_type not in {"ingreso", "gasto"}:
        raise ValidationError("El tipo de movimiento debe ser ingreso o gasto.")
    return {
        "id": optional_text(payload, "id"),
        "movement_type": movement_type,
        "concept": required_text(payload, "concept", "Concepto"),
        "amount": amount,
        "movement_date": parse_date(
            required_text(payload, "movement_date", "Fecha de movimiento"),
            "Fecha de movimiento",
        ),
        "cash_account": required_text(payload, "cash_account", "Cuenta de caja"),
        "category": optional_text(payload, "category"),
        "notes": optional_text(payload, "notes"),
    }


def validate_inventory_adjustment(payload: dict) -> dict:
    quantity = optional_float(payload, "quantity")
    if quantity is None or quantity <= 0:
        raise ValidationError("La cantidad del ajuste debe ser mayor a cero.")
    movement_type = required_text(payload, "movement_type", "Tipo de ajuste")
    if movement_type not in {"entrada", "salida"}:
        raise ValidationError("El ajuste debe ser de entrada o salida.")
    return {
        "item_id": required_text(payload, "item_id", "Item de inventario"),
        "movement_type": movement_type,
        "quantity": quantity,
        "movement_date": parse_date(
            required_text(payload, "movement_date", "Fecha de movimiento"),
            "Fecha de movimiento",
        ),
        "note": optional_text(payload, "note"),
    }
