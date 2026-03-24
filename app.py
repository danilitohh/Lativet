from __future__ import annotations

import os
from pathlib import Path

from lativet.web import create_app


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = str(BASE_DIR / "data")
if os.getenv("VERCEL"):
    DEFAULT_DATA_DIR = "/tmp/lativet"
DATA_DIR = Path(os.getenv("LATIVET_DATA_DIR", DEFAULT_DATA_DIR))

# Entry point for WSGI servers (Vercel, gunicorn, etc.)
app = create_app(BASE_DIR, DATA_DIR)


def main() -> None:
    host = os.getenv("LATIVET_HOST", "127.0.0.1")
    port = int(os.getenv("LATIVET_PORT", "8000"))
    debug = os.getenv("LATIVET_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    main()
