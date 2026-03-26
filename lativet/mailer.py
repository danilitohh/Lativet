from __future__ import annotations

from dataclasses import dataclass
from email.message import EmailMessage
import smtplib
import ssl


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    username: str
    password: str
    sender: str


def _clean_password(value: str) -> str:
    # Gmail app passwords are often shown with spaces for readability.
    return "".join((value or "").split())


def _send_message(config: SmtpConfig, message: EmailMessage) -> None:
    password = _clean_password(config.password)
    context = ssl.create_default_context()

    if config.port == 465:
        with smtplib.SMTP_SSL(config.host, config.port, context=context, timeout=30) as server:
            server.login(config.username, password)
            server.send_message(message)
        return

    with smtplib.SMTP(config.host, config.port, timeout=30) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(config.username, password)
        server.send_message(message)


def send_email(
    config: SmtpConfig,
    to_address: str,
    subject: str,
    body: str,
) -> None:
    message = EmailMessage()
    message["From"] = config.sender
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)
    _send_message(config, message)


def send_email_with_attachment(
    config: SmtpConfig,
    to_address: str,
    subject: str,
    body: str,
    attachment_path: str,
    attachment_name: str,
) -> None:
    message = EmailMessage()
    message["From"] = config.sender
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)

    with open(attachment_path, "rb") as handle:
        data = handle.read()
    message.add_attachment(
        data,
        maintype="application",
        subtype="pdf",
        filename=attachment_name,
    )
    _send_message(config, message)
