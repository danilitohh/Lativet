from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BRAND_ORANGE = colors.HexColor("#F28A52")
BRAND_ORANGE_SOFT = colors.HexColor("#FCE7D9")
BRAND_BLUE_SOFT = colors.HexColor("#E8F5FC")
BRAND_NEUTRAL_SOFT = colors.HexColor("#EEF1F4")
BRAND_TEXT = colors.HexColor("#4C3E36")
BRAND_MUTED = colors.HexColor("#6F675F")
BRAND_BORDER = colors.HexColor("#E3D8D0")
ROW_ALT = colors.HexColor("#FFF6F0")

EMAIL_TEMPLATE_VARIABLES = [
    "invoice_number",
    "document_number",
    "document_label",
    "document_name",
    "document_type",
    "pet_name",
    "owner_name",
    "owner_phone",
    "owner_document",
    "recipient_email",
    "issue_date",
    "due_date",
    "payment_method",
    "cash_account",
    "status",
    "subtotal",
    "discount",
    "total",
    "clinic_name",
    "clinic_address",
    "clinic_phone",
    "clinic_email",
]

_TOKEN_RE = re.compile(r"\{([a-zA-Z0-9_]+)\}")


def format_currency(value: float | int | str | None) -> str:
    amount = float(value or 0)
    return f"${amount:,.0f}".replace(",", ".")


def build_clinic_context(settings: dict | None) -> dict[str, str]:
    data = settings or {}
    return {
        "name": str(data.get("clinic_name") or "Lativet").strip(),
        "address": str(data.get("clinic_address") or "").strip(),
        "phone": str(data.get("clinic_phone") or "").strip(),
        "email": str(data.get("clinic_email") or data.get("smtp_from") or "").strip(),
        "footer_note": str(data.get("billing_footer") or "").strip(),
    }


def build_billing_email_context(settings: dict | None, document: dict) -> dict[str, str]:
    clinic = build_clinic_context(settings)
    document_type = str(document.get("document_type") or "factura").strip().lower()
    document_label = "Cotizacion" if document_type == "cotizacion" else "Factura"
    payment_method = str(document.get("payment_method") or "Pendiente").strip() or "Pendiente"
    cash_account = str(document.get("cash_account") or "").strip()
    return {
        "invoice_number": str(document.get("document_number") or "").strip(),
        "document_number": str(document.get("document_number") or "").strip(),
        "document_label": document_label,
        "document_name": document_label.lower(),
        "document_type": document_type,
        "pet_name": str(document.get("patient_name") or document.get("patient_name_snapshot") or "").strip(),
        "owner_name": str(document.get("owner_name") or document.get("owner_name_snapshot") or "").strip(),
        "owner_phone": str(
            document.get("owner_phone") or document.get("owner_phone_snapshot") or ""
        ).strip(),
        "owner_document": str(
            document.get("owner_document") or document.get("owner_document_snapshot") or ""
        ).strip(),
        "recipient_email": str(document.get("recipient_email") or "").strip(),
        "issue_date": str(document.get("issue_date") or "").strip(),
        "due_date": str(document.get("due_date") or "").strip(),
        "payment_method": payment_method,
        "cash_account": cash_account,
        "status": str(document.get("status") or "").strip(),
        "subtotal": format_currency(document.get("subtotal") or 0),
        "discount": format_currency(document.get("discount") or 0),
        "total": format_currency(document.get("total") or 0),
        "clinic_name": clinic["name"],
        "clinic_address": clinic["address"],
        "clinic_phone": clinic["phone"],
        "clinic_email": clinic["email"],
    }


def render_billing_template(template: str, context: dict[str, str], fallback: str) -> str:
    source = str(template or "").strip() or fallback
    if not source:
        return ""

    def _replace(match: re.Match[str]) -> str:
        key = match.group(1)
        return str(context.get(key, ""))

    return _TOKEN_RE.sub(_replace, source)


def _safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", str(value or "").strip())
    return cleaned.strip("._") or "archivo"


def _styles():
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "BillingTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=23,
            textColor=BRAND_TEXT,
            spaceAfter=4 * mm,
        ),
        "section": ParagraphStyle(
            "BillingSection",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=BRAND_TEXT,
            spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "BillingBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=12,
            textColor=BRAND_TEXT,
        ),
        "muted": ParagraphStyle(
            "BillingMuted",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=11,
            textColor=BRAND_MUTED,
        ),
        "small": ParagraphStyle(
            "BillingSmall",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=10,
            textColor=BRAND_MUTED,
        ),
    }


def _build_logo(logo_path: Path | None, width_mm: float, height_mm: float):
    if not logo_path or not logo_path.exists():
        return None
    image = Image(str(logo_path))
    image.drawWidth = width_mm * mm
    image.drawHeight = height_mm * mm
    image.hAlign = "LEFT"
    return image


def _kv_table(rows: list[tuple[str, Any]], widths: tuple[float, float], background=BRAND_NEUTRAL_SOFT):
    data = [[f"<b>{label}</b>", str(value or "-")] for label, value in rows]
    table = Table(data, colWidths=[widths[0] * mm, widths[1] * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.6, BRAND_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, BRAND_BORDER),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("TEXTCOLOR", (0, 0), (-1, -1), BRAND_TEXT),
                ("FONTSIZE", (0, 0), (-1, -1), 8.7),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _list_table(
    headers: list[str],
    rows: list[list[Any]],
    col_widths: list[float],
    *,
    empty_message: str,
) -> Table:
    body_rows = rows or [[empty_message] + [""] * (len(headers) - 1)]
    data = [headers] + body_rows
    table = Table(data, colWidths=[width * mm for width in col_widths], repeatRows=1)
    style_commands: list[tuple] = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_ORANGE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.1),
        ("LEADING", (0, 0), (-1, 0), 10),
        ("BOX", (0, 0), (-1, -1), 0.6, BRAND_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BRAND_BORDER),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 7.8),
        ("LEADING", (0, 1), (-1, -1), 10),
        ("TEXTCOLOR", (0, 1), (-1, -1), BRAND_TEXT),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 1:
            style_commands.append(("BACKGROUND", (0, row_index), (-1, row_index), ROW_ALT))
    if not rows:
        style_commands.extend(
            [
                ("SPAN", (0, 1), (-1, 1)),
                ("ALIGN", (0, 1), (-1, 1), "LEFT"),
                ("TEXTCOLOR", (0, 1), (-1, 1), BRAND_MUTED),
            ]
        )
    table.setStyle(TableStyle(style_commands))
    return table


def _document_identity(document: dict) -> tuple[str, str]:
    document_type = str(document.get("document_type") or "factura").strip().lower()
    label = "Cotizacion" if document_type == "cotizacion" else "Factura"
    filename_prefix = "cotizacion" if document_type == "cotizacion" else "factura"
    number = str(document.get("document_number") or "sin_numero").strip() or "sin_numero"
    return label, f"{filename_prefix}_{_safe_filename(number)}.pdf"


def build_billing_document_pdf(
    *,
    output_dir: Path,
    settings: dict,
    document: dict,
    lines: list[dict],
    logo_path: Path | None = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    styles = _styles()
    clinic = build_clinic_context(settings)
    document_label, filename = _document_identity(document)
    pdf_path = output_dir / filename

    story: list[Any] = []
    logo = _build_logo(logo_path, 36, 18)
    header_right = [
        Paragraph(f"<b>{clinic['name'] or 'Lativet'}</b>", styles["body"]),
        Paragraph(clinic["address"] or "-", styles["muted"]),
        Paragraph(clinic["phone"] or "-", styles["muted"]),
        Paragraph(clinic["email"] or "-", styles["muted"]),
    ]
    header_data = [[logo or "", header_right]]
    header_table = Table(header_data, colWidths=[42 * mm, 130 * mm])
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_BORDER),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(document_label, styles["title"]))
    story.append(Paragraph(f"Documento {document.get('document_number') or '-'}", styles["muted"]))
    story.append(Spacer(1, 3 * mm))

    left_meta = _kv_table(
        [
            ("Paciente", document.get("patient_name") or document.get("patient_name_snapshot") or "-"),
            ("Propietario", document.get("owner_name") or document.get("owner_name_snapshot") or "-"),
            ("Telefono", document.get("owner_phone") or document.get("owner_phone_snapshot") or "-"),
            ("Documento", document.get("owner_document") or document.get("owner_document_snapshot") or "-"),
        ],
        widths=(28, 60),
        background=BRAND_NEUTRAL_SOFT,
    )
    right_meta = _kv_table(
        [
            ("Emision", document.get("issue_date") or "-"),
            ("Vence", document.get("due_date") or "-"),
            ("Estado", document.get("status") or "-"),
            ("Pago", document.get("payment_method") or "Pendiente"),
        ],
        widths=(24, 32),
        background=BRAND_ORANGE_SOFT,
    )
    meta_table = Table([[left_meta, right_meta]], colWidths=[97 * mm, 75 * mm])
    meta_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(meta_table)
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("Detalle del documento", styles["section"]))
    item_rows = [
        [
            str(line.get("item_name") or "-"),
            f"{float(line.get('quantity') or 0):g}",
            format_currency(line.get("unit_price") or 0),
            format_currency(line.get("line_total") or 0),
        ]
        for line in lines
    ]
    story.append(
        _list_table(
            ["Item", "Cantidad", "Valor unitario", "Total"],
            item_rows,
            [90, 22, 30, 30],
            empty_message="No hay lineas registradas.",
        )
    )
    story.append(Spacer(1, 5 * mm))

    payments = document.get("payments") or []
    if payments:
        story.append(Paragraph("Abonos registrados", styles["section"]))
        payment_rows = [
            [
                str(payment.get("payment_date") or "-"),
                str(payment.get("payment_method") or "-"),
                str(payment.get("cash_account") or "-"),
                format_currency(payment.get("amount") or 0),
                str(payment.get("note") or "-"),
            ]
            for payment in payments
        ]
        story.append(
            _list_table(
                ["Fecha", "Metodo", "Caja", "Monto", "Nota"],
                payment_rows,
                [24, 28, 28, 24, 68],
                empty_message="No hay pagos registrados.",
            )
        )
        story.append(Spacer(1, 5 * mm))

    totals = _kv_table(
        [
            ("Subtotal", format_currency(document.get("subtotal") or 0)),
            ("Descuento", format_currency(document.get("discount") or 0)),
            ("Total", format_currency(document.get("total") or 0)),
            ("Abonado", format_currency(document.get("amount_paid") or 0)),
            ("Saldo", format_currency(document.get("balance_due") or 0)),
        ],
        widths=(34, 28),
        background=BRAND_BLUE_SOFT,
    )
    story.append(Paragraph("Totales", styles["section"]))
    story.append(totals)

    notes = str(document.get("notes") or "").strip()
    if notes:
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph("Notas", styles["section"]))
        story.append(Paragraph(notes.replace("\n", "<br/>"), styles["body"]))

    footer_note = clinic["footer_note"]
    if footer_note:
        story.append(Spacer(1, 5 * mm))
        story.append(Paragraph(footer_note.replace("\n", "<br/>"), styles["small"]))

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title=f"{document_label} {document.get('document_number') or ''}".strip(),
    )
    doc.build(story)
    return pdf_path


def build_billing_payment_pdf(
    *,
    output_dir: Path,
    settings: dict,
    document: dict,
    payment: dict,
    logo_path: Path | None = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    styles = _styles()
    clinic = build_clinic_context(settings)
    document_number = str(document.get("document_number") or "sin_numero").strip() or "sin_numero"
    payment_id = str(payment.get("id") or "abono").strip() or "abono"
    pdf_path = output_dir / f"abono_{_safe_filename(document_number)}_{_safe_filename(payment_id)}.pdf"

    story: list[Any] = []
    logo = _build_logo(logo_path, 34, 16)
    header = Table(
        [[logo or "", Paragraph(f"<b>{clinic['name']}</b><br/>{clinic['phone'] or '-'}", styles["body"])]],
        colWidths=[42 * mm, 130 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Comprobante de abono", styles["title"]))
    story.append(
        _kv_table(
            [
                ("Documento", document_number),
                ("Paciente", document.get("patient_name") or document.get("patient_name_snapshot") or "-"),
                ("Propietario", document.get("owner_name") or document.get("owner_name_snapshot") or "-"),
                ("Fecha", payment.get("payment_date") or "-"),
                ("Monto", format_currency(payment.get("amount") or 0)),
                ("Metodo", payment.get("payment_method") or "-"),
                ("Caja", payment.get("cash_account") or "-"),
                ("Saldo restante", format_currency(payment.get("document_balance_due") or document.get("balance_due") or 0)),
                ("Nota", payment.get("note") or "-"),
            ],
            widths=(40, 112),
            background=BRAND_BLUE_SOFT,
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Documento generado automaticamente por Lativet.", styles["small"]))

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title=f"Abono {document_number}".strip(),
    )
    doc.build(story)
    return pdf_path


def _build_summary_table(summary: dict) -> Table:
    rows = [
        ["Total facturado", format_currency(summary.get("total_facturado") or 0)],
        ["Total cobrado", format_currency(summary.get("total_cobrado") or 0)],
        ["Abonos registrados", str(summary.get("abonos_registrados") or 0)],
        ["Cartera pendiente", format_currency(summary.get("cartera_pendiente") or 0)],
        ["Facturas con saldo", str(summary.get("facturas_con_saldo") or 0)],
        ["Cartera vencida", format_currency(summary.get("cartera_vencida") or 0)],
        ["Facturas vencidas", str(summary.get("facturas_vencidas") or 0)],
        ["Otros ingresos", format_currency(summary.get("otros_ingresos") or 0)],
        ["Gastos", format_currency(summary.get("gastos") or 0)],
        ["Utilidad neta", format_currency(summary.get("utilidad") or 0)],
        ["Facturas del periodo", str(summary.get("facturas_periodo") or 0)],
        ["Facturas pendientes", str(summary.get("facturas_pendientes") or 0)],
        ["Items bajo minimo", str(summary.get("low_stock_count") or 0)],
    ]
    return _list_table(["Indicador", "Valor"], rows, [110, 62], empty_message="Sin resumen.")


def build_sales_report_pdf(
    *,
    output_dir: Path,
    settings: dict,
    report: dict,
    logo_path: Path | None = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    styles = _styles()
    clinic = build_clinic_context(settings)
    summary = report.get("summary") or {}
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    start_date = str(summary.get("start_date") or "").replace("-", "")
    end_date = str(summary.get("end_date") or "").replace("-", "")
    pdf_path = output_dir / f"reporte_{start_date}_{end_date}_{stamp}.pdf"

    story: list[Any] = []
    logo = _build_logo(logo_path, 34, 16)
    header = Table(
        [[logo or "", Paragraph(f"<b>{clinic['name']}</b><br/>Reporte de ventas", styles["body"])]],
        colWidths=[42 * mm, 130 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Reporte de ventas", styles["title"]))
    story.append(
        Paragraph(
            f"Periodo: {summary.get('start_date') or '-'} a {summary.get('end_date') or '-'}",
            styles["muted"],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(_build_summary_table(summary))
    story.append(Spacer(1, 5 * mm))

    documents = report.get("documents") or []
    document_rows = [
        [
            row.get("document_number") or "-",
            "Cotizacion" if row.get("document_type") == "cotizacion" else "Factura",
            row.get("issue_date") or "-",
            row.get("patient_name") or row.get("patient_name_snapshot") or "-",
            row.get("owner_name") or row.get("owner_name_snapshot") or "-",
            row.get("status") or "-",
            format_currency(row.get("total") or 0),
        ]
        for row in documents
    ]
    story.append(Paragraph("Documentos del periodo", styles["section"]))
    story.append(
        _list_table(
            ["Numero", "Tipo", "Emision", "Paciente", "Propietario", "Estado", "Total"],
            document_rows,
            [18, 18, 22, 28, 42, 18, 26],
            empty_message="No hay documentos para este rango.",
        )
    )
    story.append(Spacer(1, 5 * mm))

    payments = report.get("payments") or []
    payment_rows = [
        [
            row.get("payment_date") or "-",
            row.get("document_number") or "-",
            row.get("patient_name") or "-",
            row.get("payment_method") or "-",
            row.get("cash_account") or "-",
            format_currency(row.get("amount") or 0),
            format_currency(row.get("balance_after_payment") or 0),
        ]
        for row in payments
    ]
    story.append(Paragraph("Abonos del periodo", styles["section"]))
    story.append(
        _list_table(
            ["Fecha", "Documento", "Paciente", "Metodo", "Caja", "Abono", "Saldo"],
            payment_rows,
            [22, 22, 42, 22, 22, 20, 22],
            empty_message="No hay abonos para este rango.",
        )
    )
    story.append(Spacer(1, 5 * mm))

    outstanding = report.get("outstanding_invoices") or []
    outstanding_rows = [
        [
            row.get("document_number") or "-",
            row.get("patient_name") or row.get("patient_name_snapshot") or "-",
            row.get("owner_name") or row.get("owner_name_snapshot") or "-",
            row.get("due_date") or "-",
            format_currency(row.get("balance_due") or 0),
            str(row.get("days_overdue") or "0"),
        ]
        for row in outstanding
    ]
    story.append(Paragraph("Cartera pendiente", styles["section"]))
    story.append(
        _list_table(
            ["Documento", "Paciente", "Propietario", "Vence", "Saldo", "Mora dias"],
            outstanding_rows,
            [22, 36, 48, 22, 24, 20],
            empty_message="No hay cartera pendiente al corte.",
        )
    )
    story.append(Spacer(1, 5 * mm))

    low_stock = report.get("low_stock_items") or []
    low_stock_rows = [
        [
            row.get("name") or "-",
            row.get("category") or "-",
            f"{float(row.get('stock_quantity') or 0):g}",
            f"{float(row.get('min_stock') or 0):g}",
        ]
        for row in low_stock
    ]
    story.append(Paragraph("Inventario en alerta", styles["section"]))
    story.append(
        _list_table(
            ["Item", "Categoria", "Stock", "Minimo"],
            low_stock_rows,
            [78, 50, 22, 22],
            empty_message="No hay alertas de inventario.",
        )
    )

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title="Reporte de ventas",
    )
    doc.build(story)
    return pdf_path


def build_inventory_pdf(
    *,
    output_dir: Path,
    settings: dict,
    as_of_date: str,
    inventory_items: list[dict],
    low_stock_items: list[dict],
    logo_path: Path | None = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    styles = _styles()
    clinic = build_clinic_context(settings)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_path = output_dir / f"inventario_{str(as_of_date or '').replace('-', '')}_{stamp}.pdf"

    story: list[Any] = []
    logo = _build_logo(logo_path, 34, 16)
    header = Table(
        [[logo or "", Paragraph(f"<b>{clinic['name']}</b><br/>Corte de inventario", styles["body"])]],
        colWidths=[42 * mm, 130 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Reporte de inventario", styles["title"]))
    story.append(Paragraph(f"Corte: {as_of_date or '-'}", styles["muted"]))
    story.append(Spacer(1, 4 * mm))

    tracked_items = [row for row in inventory_items if row.get("track_inventory")]
    metrics = _kv_table(
        [
            ("Items rastreados", len(tracked_items)),
            ("Unidades", f"{sum(float(row.get('stock_quantity') or 0) for row in tracked_items):g}"),
            (
                "Valor costo",
                format_currency(sum(float(row.get("inventory_cost_total") or 0) for row in tracked_items)),
            ),
            (
                "Valor publico",
                format_currency(sum(float(row.get("inventory_public_total") or 0) for row in tracked_items)),
            ),
        ],
        widths=(40, 112),
        background=BRAND_BLUE_SOFT,
    )
    story.append(metrics)
    story.append(Spacer(1, 5 * mm))

    inventory_rows = [
        [
            row.get("name") or "-",
            row.get("category") or "-",
            f"{float(row.get('stock_quantity') or 0):g}",
            f"{float(row.get('min_stock') or 0):g}",
            format_currency(row.get("unit_cost") or 0),
            format_currency(row.get("unit_price") or 0),
            format_currency(row.get("inventory_cost_total") or 0),
            format_currency(row.get("inventory_public_total") or 0),
        ]
        for row in inventory_items
    ]
    story.append(Paragraph("Inventario completo", styles["section"]))
    story.append(
        _list_table(
            ["Item", "Categoria", "Stock", "Min", "Costo U", "Precio", "Valor costo", "Valor publico"],
            inventory_rows,
            [48, 26, 12, 12, 16, 16, 21, 21],
            empty_message="No hay inventario registrado.",
        )
    )
    story.append(Spacer(1, 5 * mm))

    low_rows = [
        [
            row.get("name") or "-",
            row.get("category") or "-",
            f"{float(row.get('stock_quantity') or 0):g}",
            f"{float(row.get('min_stock') or 0):g}",
        ]
        for row in low_stock_items
    ]
    story.append(Paragraph("Inventario en alerta", styles["section"]))
    story.append(
        _list_table(
            ["Item", "Categoria", "Existencia", "Minimo"],
            low_rows,
            [78, 50, 22, 22],
            empty_message="No hay items bajo minimo.",
        )
    )

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title="Inventario",
    )
    doc.build(story)
    return pdf_path
