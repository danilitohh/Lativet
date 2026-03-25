from __future__ import annotations

from pathlib import Path

import os
from flask import Flask, jsonify, request, send_from_directory, session

from .api import LativetService


def create_app(base_dir: Path | None = None, data_dir: Path | None = None) -> Flask:
    project_dir = Path(base_dir or Path(__file__).resolve().parent.parent)
    runtime_data_dir = Path(data_dir or project_dir / "data")
    frontend_dir = project_dir / "frontend"
    images_dir = project_dir / "images"
    exports_dir = runtime_data_dir / "exports"

    service = None
    service_error: Exception | None = None

    def init_service() -> LativetService | None:
        nonlocal service, service_error
        if service is not None:
            return service
        try:
            service = LativetService(project_dir, runtime_data_dir)
            service_error = None
            app.extensions["lativet_service"] = service
            return service
        except Exception as exc:
            service_error = exc
            service = None
            return None
    app = Flask(__name__)
    app.secret_key = (
        os.getenv("ADMIN_SESSION_SECRET")
        or os.getenv("FLASK_SECRET_KEY")
        or "lativet-session"
    )
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    if os.getenv("SESSION_COOKIE_SECURE", "").lower() in {"1", "true", "on", "yes", "si", "s"}:
        app.config["SESSION_COOKIE_SECURE"] = True
    app.json.ensure_ascii = False
    app.extensions["lativet_service"] = service

    admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "").strip()

    def admin_configured() -> bool:
        return bool(admin_email and admin_password)

    def is_authenticated() -> bool:
        return bool(session.get("admin_authenticated") or session.get("user_authenticated"))

    def is_admin() -> bool:
        return bool(session.get("admin_authenticated"))

    def current_user() -> dict | None:
        if session.get("admin_authenticated"):
            return {
                "id": "admin",
                "full_name": "Administrador",
                "email": admin_email or "admin",
                "role": "Administrador",
                "permissions": ["*"],
                "is_admin": True,
            }
        user_id = session.get("user_id")
        if not user_id:
            return None
        if init_service() is None:
            session.pop("user_authenticated", None)
            session.pop("user_id", None)
            return None
        try:
            user = init_service().get_user(user_id) if init_service() else None
        except Exception:
            session.pop("user_authenticated", None)
            session.pop("user_id", None)
            return None
        if not user or not user.get("is_active"):
            session.pop("user_authenticated", None)
            session.pop("user_id", None)
            return None
        user["is_admin"] = False
        return user

    def payload() -> dict:
        return request.get_json(silent=True) or {}

    def respond(result: dict):
        status_code = 200 if result.get("ok") else 400
        return jsonify(result), status_code

    def service_unavailable():
        detail = f": {service_error}" if service_error else ""
        return (
            jsonify({"ok": False, "error": f"Servicio no disponible{detail}."}),
            503,
        )

    @app.before_request
    def enforce_auth():
        if not request.path.startswith("/api/"):
            return None
        if request.path in (
            "/api/auth/status",
            "/api/auth/login",
            "/api/google-calendar/callback",
        ):
            return None
        if init_service() is None:
            return service_unavailable()
        if admin_configured() and not is_authenticated():
            return jsonify({"ok": False, "error": "No autorizado"}), 401
        return None

    def send_cached(directory: Path, filename: str, cache_control: str | None = None):
        response = send_from_directory(directory, filename)
        if cache_control:
            response.headers["Cache-Control"] = cache_control
        return response

    @app.get("/")
    def index():
        return send_cached(frontend_dir, "index.html", "no-store")

    @app.get("/styles.css")
    def styles():
        return send_cached(frontend_dir, "styles.css", "public, max-age=31536000, immutable")

    @app.get("/app.js")
    def javascript():
        return send_cached(frontend_dir, "app.js", "public, max-age=31536000, immutable")

    @app.get("/images/<path:filename>")
    def images(filename: str):
        return send_cached(images_dir, filename, "public, max-age=31536000, immutable")

    @app.get("/exports/<path:filename>")
    def exports(filename: str):
        return send_from_directory(exports_dir, filename, as_attachment=True)

    @app.get("/api/bootstrap")
    def bootstrap():
        lite = request.args.get("lite", "").lower() in {"1", "true", "yes", "si"}
        sections_raw = (request.args.get("sections") or "").strip()
        sections = {item for item in sections_raw.split(",") if item.strip()} if sections_raw else None
        if init_service() is None:
            return service_unavailable()
        return respond(init_service().bootstrap(lite=lite, sections=sections))

    @app.get("/api/auth/status")
    def auth_status():
        user = current_user()
        return respond(
            {
                "ok": True,
                "data": {
                    "requires_login": admin_configured(),
                    "authenticated": is_authenticated(),
                    "user": user,
                },
            }
        )

    @app.post("/api/auth/login")
    def auth_login():
        if not admin_configured():
            session["admin_authenticated"] = True
            return respond({"ok": True, "data": {"authenticated": True}})
        body = payload()
        email = (body.get("email") or "").strip().lower()
        password = (body.get("password") or "").strip()
        if email == admin_email and password == admin_password:
            session["admin_authenticated"] = True
            session.pop("user_authenticated", None)
            session.pop("user_id", None)
            return respond(
                {
                    "ok": True,
                    "data": {"authenticated": True, "user": current_user()},
                }
            )
        if init_service() is None:
            return service_unavailable()
        try:
            user = init_service().authenticate_user(email, password)
        except Exception:
            user = None
        if user:
            session.pop("admin_authenticated", None)
            session["user_authenticated"] = True
            session["user_id"] = user["id"]
            user["is_admin"] = False
            return respond(
                {
                    "ok": True,
                    "data": {"authenticated": True, "user": user},
                }
            )
        return jsonify({"ok": False, "error": "Credenciales invalidas."}), 401

    @app.post("/api/auth/logout")
    def auth_logout():
        session.clear()
        return respond({"ok": True, "data": {"authenticated": False}})

    @app.post("/api/settings")
    def save_settings():
        return respond(service.save_settings(payload()))

    @app.post("/api/owners")
    def save_owner():
        return respond(service.save_owner(payload()))

    @app.delete("/api/owners/<owner_id>")
    def delete_owner(owner_id: str):
        return respond(service.delete_owner(owner_id))

    @app.post("/api/providers")
    def save_provider():
        return respond(service.save_provider(payload()))

    @app.post("/api/users")
    def save_user():
        if not is_admin():
            return jsonify({"ok": False, "error": "Solo administradores."}), 403
        return respond(service.save_user(payload()))

    @app.patch("/api/users/<user_id>/status")
    def update_user_status(user_id: str):
        if not is_admin():
            return jsonify({"ok": False, "error": "Solo administradores."}), 403
        is_active = bool(payload().get("is_active"))
        return respond(service.update_user_status(user_id, is_active))

    @app.post("/api/patients")
    def save_patient():
        return respond(service.save_patient(payload()))

    @app.delete("/api/patients/<patient_id>")
    def delete_patient(patient_id: str):
        return respond(service.delete_patient(patient_id))

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

    @app.delete("/api/appointments/<appointment_id>")
    def delete_appointment(appointment_id: str):
        return respond(service.delete_appointment(appointment_id))

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
