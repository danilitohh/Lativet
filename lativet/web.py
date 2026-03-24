from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from .api import LativetService


def create_app(base_dir: Path | None = None, data_dir: Path | None = None) -> Flask:
    project_dir = Path(base_dir or Path(__file__).resolve().parent.parent)
    runtime_data_dir = Path(data_dir or project_dir / "data")
    frontend_dir = project_dir / "frontend"
    images_dir = project_dir / "images"
    exports_dir = runtime_data_dir / "exports"

    service = LativetService(project_dir, runtime_data_dir)
    app = Flask(__name__)
    app.json.ensure_ascii = False
    app.extensions["lativet_service"] = service

    def payload() -> dict:
        return request.get_json(silent=True) or {}

    def respond(result: dict):
        status_code = 200 if result.get("ok") else 400
        return jsonify(result), status_code

    @app.get("/")
    def index():
        return send_from_directory(frontend_dir, "index.html")

    @app.get("/styles.css")
    def styles():
        return send_from_directory(frontend_dir, "styles.css")

    @app.get("/app.js")
    def javascript():
        return send_from_directory(frontend_dir, "app.js")

    @app.get("/images/<path:filename>")
    def images(filename: str):
        return send_from_directory(images_dir, filename)

    @app.get("/exports/<path:filename>")
    def exports(filename: str):
        return send_from_directory(exports_dir, filename, as_attachment=True)

    @app.get("/api/bootstrap")
    def bootstrap():
        lite = request.args.get("lite", "").lower() in {"1", "true", "yes", "si"}
        return respond(service.bootstrap(lite=lite))

    @app.post("/api/settings")
    def save_settings():
        return respond(service.save_settings(payload()))

    @app.post("/api/owners")
    def save_owner():
        return respond(service.save_owner(payload()))

    @app.post("/api/providers")
    def save_provider():
        return respond(service.save_provider(payload()))

    @app.post("/api/patients")
    def save_patient():
        return respond(service.save_patient(payload()))

    @app.post("/api/catalog-items")
    def save_catalog_item():
        return respond(service.save_catalog_item(payload()))

    @app.post("/api/appointments")
    def save_appointment():
        return respond(service.save_appointment(payload()))

    @app.post("/api/availability")
    def save_availability():
        return respond(service.save_availability_rule(payload()))

    @app.delete("/api/availability/<rule_id>")
    def delete_availability(rule_id: str):
        return respond(service.delete_availability_rule(rule_id))

    @app.post("/api/cash-movements")
    def save_cash_movement():
        return respond(service.save_cash_movement(payload()))

    @app.post("/api/stock-adjustments")
    def save_stock_adjustment():
        return respond(service.save_stock_adjustment(payload()))

    @app.post("/api/billing-documents")
    def save_billing_document():
        return respond(service.save_billing_document(payload()))

    @app.post("/api/billing-payments")
    def register_billing_payment():
        return respond(service.register_billing_payment(payload()))

    @app.patch("/api/appointments/<appointment_id>/status")
    def update_appointment_status(appointment_id: str):
        status = payload().get("status")
        return respond(service.update_appointment_status(appointment_id, status))

    @app.post("/api/consents")
    def save_consent():
        return respond(service.save_consent(payload()))

    @app.post("/api/records")
    def save_record():
        body = payload()
        finalize = bool(body.pop("finalize", False))
        return respond(service.save_clinical_record(body, finalize=finalize))

    @app.post("/api/consultations")
    def save_consultation():
        return respond(service.save_consultation(payload()))

    @app.post("/api/evolutions")
    def save_evolution():
        return respond(service.save_evolution(payload()))

    @app.post("/api/grooming")
    def save_grooming():
        return respond(service.save_grooming_document(payload()))

    @app.post("/api/backups")
    def backup_database():
        return respond(service.backup_database())

    @app.post("/api/google-calendar/config")
    def save_google_calendar_config():
        return respond(service.save_google_calendar_config(payload()))

    @app.post("/api/google-calendar/connect")
    def connect_google_calendar():
        base_url = request.host_url.rstrip("/")
        redirect_uri = f"{base_url}/api/google-calendar/callback"
        return respond(service.connect_google_calendar(redirect_uri))

    @app.post("/api/google-calendar/disconnect")
    def disconnect_google_calendar():
        return respond(service.disconnect_google_calendar())

    @app.get("/api/google-calendar/callback")
    def google_calendar_callback():
        redirect_uri = request.base_url
        result = service.complete_google_calendar_oauth(redirect_uri, request.url)
        if not result.get("ok"):
            return (
                f"<h2>Error al conectar Google Calendar</h2><p>{result.get('error','')}</p>",
                400,
            )
        return (
            "<h2>Google Calendar conectado</h2>"
            "<p>Ya puedes volver a Lativet y actualizar la pagina.</p>"
        )

    return app
