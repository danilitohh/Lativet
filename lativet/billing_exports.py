from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Circle, Drawing, Line, String
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
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


BRAND_ORANGE_HEX = "#F28A52"
BRAND_BLUE_HEX = "#67B8E8"
BRAND_ORANGE = colors.HexColor(BRAND_ORANGE_HEX)
BRAND_ORANGE_SOFT = colors.HexColor("#FCE7D9")
BRAND_ORANGE_BORDER = colors.HexColor("#F6C6A8")
BRAND_BLUE = colors.HexColor(BRAND_BLUE_HEX)
BRAND_BLUE_SOFT = colors.HexColor("#E8F5FC")
BRAND_BLUE_BORDER = colors.HexColor("#B7DBF0")
BRAND_NEUTRAL_SOFT = colors.HexColor("#EEF1F4")
BRAND_TEXT = colors.HexColor("#4C3E36")
BRAND_MUTED = colors.HexColor("#6F675F")
BRAND_BORDER = colors.HexColor("#E3D8D0")
ROW_ALT = colors.HexColor("#FFF6F0")
PAGE_FOOTER_BAR = colors.HexColor("#CBE7F7")

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
        "clinic_name": ParagraphStyle(
            "BillingClinicName",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15.5,
            leading=18,
            textColor=BRAND_ORANGE,
            spaceAfter=1 * mm,
        ),
        "clinic_meta": ParagraphStyle(
            "BillingClinicMeta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=BRAND_TEXT,
        ),
        "document_chip_title": ParagraphStyle(
            "BillingDocumentChipTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=22,
            textColor=BRAND_ORANGE,
        ),
        "document_chip_number": ParagraphStyle(
            "BillingDocumentChipNumber",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=21,
            textColor=BRAND_TEXT,
        ),
        "card_title": ParagraphStyle(
            "BillingCardTitle",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=15,
            textColor=BRAND_TEXT,
        ),
        "card_label": ParagraphStyle(
            "BillingCardLabel",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.8,
            leading=12,
            textColor=BRAND_TEXT,
        ),
        "card_value": ParagraphStyle(
            "BillingCardValue",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.4,
            leading=12,
            textColor=BRAND_MUTED,
        ),
        "payment_method": ParagraphStyle(
            "BillingPaymentMethod",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=16,
            textColor=BRAND_ORANGE,
            alignment=TA_CENTER,
        ),
        "summary_label": ParagraphStyle(
            "BillingSummaryLabel",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.2,
            leading=12,
            textColor=BRAND_TEXT,
        ),
        "summary_value": ParagraphStyle(
            "BillingSummaryValue",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.2,
            leading=12,
            textColor=BRAND_TEXT,
            alignment=TA_RIGHT,
        ),
        "summary_total_label": ParagraphStyle(
            "BillingSummaryTotalLabel",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=15,
            textColor=colors.white,
        ),
        "summary_total_value": ParagraphStyle(
            "BillingSummaryTotalValue",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=18,
            textColor=colors.white,
            alignment=TA_RIGHT,
        ),
        "footer_note": ParagraphStyle(
            "BillingFooterNote",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.6,
            leading=12,
            textColor=BRAND_MUTED,
            alignment=TA_CENTER,
        ),
        "line_item": ParagraphStyle(
            "BillingLineItem",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11,
            textColor=BRAND_TEXT,
        ),
        "line_cell": ParagraphStyle(
            "BillingLineCell",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11,
            textColor=BRAND_TEXT,
            alignment=TA_RIGHT,
        ),
    }


def _build_logo(logo_path: Path | None, width_mm: float, height_mm: float):
    if not logo_path or not logo_path.exists():
        return None
    image = Image(str(logo_path))
    max_width = width_mm * mm
    max_height = height_mm * mm
    source_width = float(getattr(image, "imageWidth", 0) or 1)
    source_height = float(getattr(image, "imageHeight", 0) or 1)
    ratio = source_width / source_height if source_height else 1
    target_width = max_width
    target_height = target_width / ratio if ratio else max_height
    if target_height > max_height:
        target_height = max_height
        target_width = target_height * ratio if ratio else max_width
    image.drawWidth = target_width
    image.drawHeight = target_height
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


def _format_display_date(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "-"
    date_value = raw.split("T", 1)[0]
    for parser in (datetime.fromisoformat,):
        try:
            return parser(date_value).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return raw


def _paragraph(text: Any, style: ParagraphStyle) -> Paragraph:
    value = escape(str(text or "-")).replace("\n", "<br/>")
    return Paragraph(value, style)


def _badge(letter: str, color_value: colors.Color) -> Drawing:
    size = 16 * mm
    center = size / 2
    drawing = Drawing(size, size)
    drawing.add(
        Circle(
            center,
            center,
            6.5 * mm,
            strokeColor=color_value,
            fillColor=colors.white,
            strokeWidth=1.2,
        )
    )
    drawing.add(
        String(
            center,
            center - 3.2,
            str(letter or "").strip()[:1].upper() or "•",
            fontName="Helvetica-Bold",
            fontSize=10,
            fillColor=color_value,
            textAnchor="middle",
        )
    )
    return drawing


def _build_info_card(
    *,
    title: str,
    accent_color: colors.Color,
    accent_hex: str,
    badge_letter: str,
    rows: list[tuple[str, Any]],
    width_mm: float,
    styles: dict[str, ParagraphStyle],
) -> Table:
    header = Table(
        [[
            _badge(badge_letter, accent_color),
            Paragraph(f'<font color="{accent_hex}"><b>{escape(title)}</b></font>', styles["card_title"]),
        ]],
        colWidths=[18 * mm, (width_mm - 30) * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LINEBELOW", (1, 0), (1, 0), 0.8, accent_color),
                ("BOTTOMPADDING", (1, 0), (1, 0), 6),
            ]
        )
    )
    detail_rows = [
        [_paragraph(f"{label}:", styles["card_label"]), _paragraph(value, styles["card_value"])]
        for label, value in rows
    ]
    details = Table(detail_rows, colWidths=[30 * mm, (width_mm - 42) * mm])
    details.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    outer = Table([[[header, Spacer(1, 3 * mm), details]]], colWidths=[width_mm * mm])
    outer.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, accent_color),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return outer


def _build_document_chip(
    document_label: str,
    document_number: str,
    styles: dict[str, ParagraphStyle],
) -> Table:
    chip = Table(
        [
            [_paragraph(document_label.upper(), styles["document_chip_title"])],
            [_paragraph(f"# {document_number or '-'}", styles["document_chip_number"])],
        ],
        colWidths=[44 * mm],
    )
    chip.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.9, BRAND_ORANGE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("LINEBELOW", (0, 0), (0, 0), 0.8, BRAND_ORANGE),
                ("BOTTOMPADDING", (0, 0), (0, 0), 8),
                ("TOPPADDING", (0, 1), (0, 1), 8),
            ]
        )
    )
    return chip


def _build_billing_lines_table(
    lines: list[dict],
    styles: dict[str, ParagraphStyle],
) -> Table:
    rows = [
        [
            _paragraph(line.get("item_name") or "-", styles["line_item"]),
            _paragraph(f"{float(line.get('quantity') or 0):g}", styles["line_cell"]),
            _paragraph(format_currency(line.get("unit_price") or 0), styles["line_cell"]),
            _paragraph(format_currency(line.get("line_total") or 0), styles["line_cell"]),
        ]
        for line in lines
    ]
    if not rows:
        rows = [[
            _paragraph("No hay lineas registradas.", styles["card_value"]),
            "",
            "",
            "",
        ]]
    table = Table(
        [["Producto/Servicio", "Cantidad", "Valor unitario", "Total"], *rows],
        colWidths=[96 * mm, 22 * mm, 31 * mm, 33 * mm],
        repeatRows=1,
    )
    style_commands: list[tuple] = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_ORANGE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("LEADING", (0, 0), (-1, 0), 11),
        ("BOX", (0, 0), (-1, -1), 0.8, BRAND_ORANGE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, BRAND_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
    ]
    for row_index in range(1, len(rows) + 1):
        if row_index % 2 == 1:
            style_commands.append(("BACKGROUND", (0, row_index), (-1, row_index), ROW_ALT))
    if not lines:
        style_commands.extend(
            [
                ("SPAN", (0, 1), (-1, 1)),
                ("ALIGN", (0, 1), (-1, 1), "LEFT"),
            ]
        )
    table.setStyle(TableStyle(style_commands))
    return table


def _build_payment_card(
    *,
    document: dict,
    width_mm: float,
    styles: dict[str, ParagraphStyle],
) -> Table:
    payment_method = str(document.get("payment_method") or "Pendiente").strip() or "Pendiente"
    details = Table(
        [
            [_paragraph("Estado", styles["card_label"]), _paragraph(document.get("status") or "-", styles["card_value"])],
            [_paragraph("Caja", styles["card_label"]), _paragraph(document.get("cash_account") or "-", styles["card_value"])],
        ],
        colWidths=[20 * mm, (width_mm - 36) * mm],
    )
    details.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    pill = Table([[Paragraph(f'<font color="{BRAND_ORANGE_HEX}"><b>{escape(payment_method)}</b></font>', styles["payment_method"])]])
    pill.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.9, BRAND_ORANGE_BORDER),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    header = Table(
        [[
            _badge("$", BRAND_BLUE),
            Paragraph(f'<font color="{BRAND_TEXT}"><b>METODO DE PAGO</b></font>', styles["card_title"]),
        ]],
        colWidths=[18 * mm, (width_mm - 30) * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    outer = Table([[[header, Spacer(1, 5 * mm), pill, Spacer(1, 4 * mm), details]]], colWidths=[width_mm * mm])
    outer.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_BLUE_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return outer


def _build_totals_card(
    *,
    document: dict,
    width_mm: float,
    styles: dict[str, ParagraphStyle],
) -> Table:
    rows = [
        [_paragraph("Subtotal", styles["summary_label"]), _paragraph(format_currency(document.get("subtotal") or 0), styles["summary_value"])],
        [_paragraph("Descuento", styles["summary_label"]), _paragraph(format_currency(document.get("discount") or 0), styles["summary_value"])],
    ]
    if float(document.get("amount_paid") or 0):
        rows.append(
            [_paragraph("Abonado", styles["summary_label"]), _paragraph(format_currency(document.get("amount_paid") or 0), styles["summary_value"])]
        )
    if float(document.get("balance_due") or 0):
        rows.append(
            [_paragraph("Saldo", styles["summary_label"]), _paragraph(format_currency(document.get("balance_due") or 0), styles["summary_value"])]
        )
    summary = Table(rows, colWidths=[(width_mm - 48) * mm, 36 * mm])
    summary.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, BRAND_BORDER),
            ]
        )
    )
    total_bar = Table(
        [[
            _paragraph("TOTAL", styles["summary_total_label"]),
            _paragraph(format_currency(document.get("total") or 0), styles["summary_total_value"]),
        ]],
        colWidths=[(width_mm - 48) * mm, 36 * mm],
    )
    total_bar.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_ORANGE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    outer = Table([[[summary, Spacer(1, 4 * mm), total_bar]]], colWidths=[width_mm * mm])
    outer.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_ORANGE_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return outer


def _default_billing_footer_note(document_type: str) -> str:
    if document_type == "cotizacion":
        return (
            "Esta cotizacion resume los servicios y procedimientos veterinarios sugeridos para el paciente.\n"
            "Los valores podran ajustarse segun la evolucion clinica, insumos requeridos o cambios autorizados.\n"
            "Cualquier inquietud sera atendida con gusto por nuestro equipo."
        )
    return (
        "Paciente y las necesidades medicas durante su atencion. Cualquier inquietud sera atendida con gusto.\n"
        "La presente factura corresponde a los servicios y procedimientos veterinarios prestados.\n"
        "Los valores pueden variar segun la evolucion clinica del paciente."
    )


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
    document_type = str(document.get("document_type") or "factura").strip().lower()
    logo = _build_logo(logo_path, 76, 46)
    clinic_block = [
        Paragraph(f"<b>{escape(clinic['name'] or 'Lativet')}</b>", styles["clinic_name"]),
        _paragraph(clinic["address"] or "-", styles["clinic_meta"]),
        _paragraph(clinic["phone"] or "-", styles["clinic_meta"]),
        _paragraph(clinic["email"] or "-", styles["clinic_meta"]),
    ]
    header_table = Table(
        [[
            logo or "",
            clinic_block,
            _build_document_chip(document_label, str(document.get("document_number") or ""), styles),
        ]],
        colWidths=[80 * mm, 56 * mm, 46 * mm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LINEBEFORE", (1, 0), (1, 0), 0.9, BRAND_ORANGE),
                ("LEFTPADDING", (1, 0), (1, 0), 8),
                ("LEFTPADDING", (2, 0), (2, 0), 10),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 10 * mm))

    patient_card = _build_info_card(
        title="DATOS DEL PACIENTE",
        accent_color=BRAND_BLUE_BORDER,
        accent_hex=BRAND_BLUE_HEX,
        badge_letter="P",
        rows=[
            ("Paciente", document.get("patient_name") or document.get("patient_name_snapshot") or "-"),
            ("Propietario", document.get("owner_name") or document.get("owner_name_snapshot") or "-"),
            ("Telefono", document.get("owner_phone") or document.get("owner_phone_snapshot") or "-"),
            ("Documento", document.get("owner_document") or document.get("owner_document_snapshot") or "-"),
        ],
        width_mm=86,
        styles=styles,
    )
    billing_card = _build_info_card(
        title=f"DATOS DE LA {document_label.upper()}",
        accent_color=BRAND_ORANGE_BORDER,
        accent_hex=BRAND_ORANGE_HEX,
        badge_letter="F",
        rows=[
            ("Fecha", _format_display_date(document.get("issue_date"))),
            ("Vence", _format_display_date(document.get("due_date"))),
            (f"{document_label} #", document.get("document_number") or "-"),
            ("Estado", document.get("status") or "-"),
        ],
        width_mm=86,
        styles=styles,
    )
    meta_table = Table([[patient_card, billing_card]], colWidths=[86 * mm, 86 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 9 * mm))

    story.append(_build_billing_lines_table(lines, styles))
    story.append(Spacer(1, 8 * mm))

    payment_totals_table = Table(
        [[
            _build_payment_card(document=document, width_mm=86, styles=styles),
            _build_totals_card(document=document, width_mm=86, styles=styles),
        ]],
        colWidths=[86 * mm, 86 * mm],
    )
    payment_totals_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(payment_totals_table)

    notes = str(document.get("notes") or "").strip()
    if notes:
        notes_card = Table(
            [[
                [
                    Paragraph(f'<font color="{BRAND_ORANGE_HEX}"><b>OBSERVACIONES</b></font>', styles["card_title"]),
                    Spacer(1, 3 * mm),
                    _paragraph(notes, styles["body"]),
                ]
            ]],
            colWidths=[182 * mm],
        )
        notes_card.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.8, BRAND_ORANGE_BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(Spacer(1, 8 * mm))
        story.append(notes_card)

    footer_note = clinic["footer_note"] or _default_billing_footer_note(document_type)
    story.append(Spacer(1, 10 * mm))
    divider = Drawing(182 * mm, 8 * mm)
    divider_y = 4 * mm
    divider.add(Line(0, divider_y, 78 * mm, divider_y, strokeColor=BRAND_BORDER, strokeWidth=0.8))
    divider.add(Circle(91 * mm, divider_y, 4 * mm, strokeColor=BRAND_BLUE, fillColor=colors.white, strokeWidth=1))
    divider.add(String(91 * mm, divider_y - 2.8, "L", fontName="Helvetica-Bold", fontSize=9, fillColor=BRAND_BLUE, textAnchor="middle"))
    divider.add(Line(104 * mm, divider_y, 182 * mm, divider_y, strokeColor=BRAND_BORDER, strokeWidth=0.8))
    story.append(divider)
    story.append(_paragraph(footer_note, styles["footer_note"]))
    footer_bar = Table([[""]], colWidths=[182 * mm], rowHeights=[3.5 * mm])
    footer_bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PAGE_FOOTER_BAR)]))
    story.append(Spacer(1, 7 * mm))
    story.append(footer_bar)

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=10 * mm,
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
