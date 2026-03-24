from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BRAND_DARK = colors.HexColor("#206491")
BRAND_SOFT = colors.HexColor("#79BEDF")
ACCENT = colors.HexColor("#F9A876")


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def _slug(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "document"


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _format_dt(value: str | None) -> str:
    parsed = _parse_iso(value)
    if parsed is None:
        return value or "N/D"
    return parsed.strftime("%Y-%m-%d %H:%M")


def _template_clauses(consent_type: str) -> list[str]:
    base = [
        "Declaro que recibi explicacion clara sobre el procedimiento, objetivos, alternativas y riesgos razonables.",
        "Entiendo que la medicina veterinaria no garantiza resultados y que pueden presentarse complicaciones aun con manejo adecuado.",
        "Autorizo la atencion de urgencia si durante el acto medico surge un riesgo inmediato para la vida o bienestar del paciente.",
        "Autorizo el tratamiento de datos personales para fines asistenciales, administrativos y de archivo clinico, con acceso restringido.",
        "Declaro que tuve oportunidad de hacer preguntas y que fueron respondidas antes de firmar este consentimiento.",
    ]

    consent_type = (consent_type or "").strip().lower()
    specific: list[str] = []
    if "anest" in consent_type:
        specific = [
            "Entiendo los riesgos propios de anestesia o sedacion (reacciones adversas, arritmias, paro cardio-respiratorio, entre otros).",
            "Autorizo la monitorizacion y el uso de medicamentos de soporte segun criterio profesional.",
        ]
    elif "eut" in consent_type:
        specific = [
            "Confirmo que la decision de eutanasia fue discutida y que comprendo el objetivo de evitar sufrimiento.",
            "Autorizo la aplicacion de farmacos necesarios para realizar el procedimiento de forma humanitaria.",
        ]
    elif "hosp" in consent_type:
        specific = [
            "Autorizo la hospitalizacion/observacion, administracion de medicamentos y procedimientos necesarios segun evolucion.",
            "Entiendo que la hospitalizacion implica riesgos (estres, infecciones asociadas, cambios en respuesta clinica).",
        ]
    elif "cirug" in consent_type:
        specific = [
            "Autorizo el procedimiento quirurgico descrito y comprendo riesgos como sangrado, infeccion, dehiscencia y complicaciones anestesicas.",
            "Autorizo procedimientos adicionales razonables si durante la cirugia se identifican hallazgos que lo justifiquen.",
        ]
    elif "riesgo" in consent_type:
        specific = [
            "Entiendo que el tratamiento propuesto puede tener efectos adversos y que se revisaron alternativas.",
            "Me comprometo a seguir indicaciones y controles para reducir riesgos y detectar eventos adversos.",
        ]
    else:
        specific = [
            "Autorizo el procedimiento descrito y acepto los riesgos razonables informados.",
        ]

    return base + specific


@dataclass(frozen=True)
class ConsentBundle:
    settings: dict
    owner: dict
    patient: dict
    consent: dict
    compliance: dict | None = None


def build_consent_pdf(
    bundle: ConsentBundle,
    output_dir: Path,
    logo_path: Path | None = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    consent = bundle.consent
    patient = bundle.patient

    signed_at = consent.get("signed_at") or consent.get("created_at")
    signed_dt = _parse_iso(signed_at) or datetime.now()
    filename = (
        f"consent-{signed_dt:%Y%m%d-%H%M}-"
        f"{_slug(patient.get('name', 'paciente'))}-"
        f"{_slug(consent.get('consent_type', 'consentimiento'))}-"
        f"{consent.get('id', '')[:8]}.pdf"
    )
    output_path = output_dir / filename

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DocTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=BRAND_DARK,
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=BRAND_DARK,
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#1a2a36"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Muted",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#51606d"),
        )
    )

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2.1 * cm,
        rightMargin=2.1 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title="Consentimiento informado",
        author=bundle.settings.get("clinic_name") or "Lativet",
    )

    story: list[object] = []

    if logo_path and logo_path.exists():
        try:
            story.append(Image(str(logo_path), width=6.0 * cm, height=2.2 * cm))
            story.append(Spacer(1, 6))
        except Exception:
            pass

    clinic_name = bundle.settings.get("clinic_name") or "Clinica veterinaria"
    consent_type = consent.get("consent_type") or "Consentimiento"
    story.append(Paragraph(_escape(clinic_name), styles["DocTitle"]))
    story.append(
        Paragraph(
            _escape(f"Consentimiento informado - {consent_type}"),
            styles["SectionTitle"],
        )
    )
    story.append(
        Paragraph(
            _escape(
                f"Fecha y hora de firma: {_format_dt(consent.get('signed_at'))}  |  "
                f"ID: {consent.get('id', 'N/D')}"
            ),
            styles["Muted"],
        )
    )
    story.append(Spacer(1, 10))

    clinic_table = Table(
        [
            ["Registro/NIT", bundle.settings.get("clinic_registration") or "N/D"],
            ["Direccion", bundle.settings.get("clinic_address") or "N/D"],
            ["Telefono", bundle.settings.get("clinic_phone") or "N/D"],
            ["Correo", bundle.settings.get("clinic_email") or "N/D"],
        ],
        colWidths=[4.2 * cm, 11.5 * cm],
    )
    clinic_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_SOFT),
                ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_DARK),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d9e6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c8d9e6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6fbff")]),
            ]
        )
    )
    story.append(Paragraph("Datos de la clinica", styles["SectionTitle"]))
    story.append(clinic_table)

    owner = bundle.owner
    owner_table = Table(
        [
            ["Nombre", owner.get("full_name") or "N/D"],
            [
                "Identificacion",
                f"{owner.get('identification_type') or ''} {owner.get('identification_number') or ''}".strip()
                or "N/D",
            ],
            ["Telefono", owner.get("phone") or "N/D"],
            ["Correo", owner.get("email") or "N/D"],
            ["Direccion", owner.get("address") or "N/D"],
        ],
        colWidths=[4.2 * cm, 11.5 * cm],
    )
    owner_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_SOFT),
                ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_DARK),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d9e6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c8d9e6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6fbff")]),
            ]
        )
    )
    story.append(Paragraph("Datos del tutor/propietario", styles["SectionTitle"]))
    story.append(owner_table)

    patient_table = Table(
        [
            ["Nombre", patient.get("name") or "N/D"],
            ["Especie", patient.get("species") or "N/D"],
            ["Raza", patient.get("breed") or "N/D"],
            ["Sexo", patient.get("sex") or "N/D"],
            ["Nacimiento", patient.get("birth_date") or "N/D"],
            ["Microchip", patient.get("microchip") or "N/D"],
        ],
        colWidths=[4.2 * cm, 11.5 * cm],
    )
    patient_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_SOFT),
                ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_DARK),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8d9e6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c8d9e6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6fbff")]),
            ]
        )
    )
    story.append(Paragraph("Datos del paciente", styles["SectionTitle"]))
    story.append(patient_table)

    story.append(Paragraph("Procedimiento", styles["SectionTitle"]))
    story.append(Paragraph(_escape(consent.get("procedure_name") or "N/D"), styles["Body"]))

    story.append(Paragraph("Informacion brindada", styles["SectionTitle"]))
    story.append(
        Paragraph(
            _escape(f"<b>Riesgos explicados:</b> {consent.get('risks_explained') or 'N/D'}"),
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            _escape(f"<b>Beneficios esperados:</b> {consent.get('benefits_expected') or 'N/D'}"),
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            _escape(f"<b>Alternativas:</b> {consent.get('alternatives') or 'N/D'}"),
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            _escape(f"<b>Costo estimado:</b> {consent.get('cost_estimate') or 'N/D'}"),
            styles["Body"],
        )
    )

    story.append(Paragraph("Manifestacion del tutor", styles["SectionTitle"]))
    story.append(Paragraph(_escape(consent.get("owner_statement") or "N/D"), styles["Body"]))

    story.append(Paragraph("Autorizaciones", styles["SectionTitle"]))
    for clause in _template_clauses(consent.get("consent_type") or ""):
        story.append(Paragraph(_escape(f"- {clause}"), styles["Body"]))

    if consent.get("notes"):
        story.append(Paragraph("Notas", styles["SectionTitle"]))
        story.append(Paragraph(_escape(consent.get("notes") or ""), styles["Body"]))

    story.append(Spacer(1, 12))
    signature_table = Table(
        [
            ["Tutor/Propietario", "Profesional"],
            [
                f"{consent.get('owner_signature_name') or ''}\nID: {consent.get('owner_identification') or ''}",
                f"{consent.get('professional_name') or ''}\nLic: {consent.get('professional_license') or ''}",
            ],
            ["Firma: ____________________", "Firma: ____________________"],
        ],
        colWidths=[7.85 * cm, 7.85 * cm],
    )
    signature_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_DARK),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2c1ae")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2c1ae")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(signature_table)

    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            _escape(
                "Aviso: Este PDF es un modelo base generado por software para archivo clinico y entrega al tutor. "
                "No sustituye revision juridica ni la politica interna de datos de la clinica."
            ),
            styles["Muted"],
        )
    )

    compliance = bundle.compliance or {}
    sources = compliance.get("sources") if isinstance(compliance, dict) else None
    if sources:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Fuentes consultadas", styles["SectionTitle"]))
        for src in sources:
            title = (src or {}).get("title") or "Fuente"
            url = (src or {}).get("url") or ""
            story.append(Paragraph(_escape(f"- {title} {url}".strip()), styles["Muted"]))

    doc.build(story)
    return output_path
