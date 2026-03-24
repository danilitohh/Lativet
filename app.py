from __future__ import annotations

import os
from pathlib import Path

from lativet.web import create_app


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


def main() -> None:
    app = create_app(BASE_DIR, DATA_DIR)
    host = os.getenv("LATIVET_HOST", "127.0.0.1")
    port = int(os.getenv("LATIVET_PORT", "8000"))
    debug = os.getenv("LATIVET_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    main()
