"""A tiny stdlib HTTP server. No framework, no install, no build step.

    python -m centric.server
    -> http://127.0.0.1:8000

Endpoints
    GET  /api/portfolio?interest_cap=&utilisation=&max_extension=&grace=
    GET  /api/borrower/<id>?...same controls...
    GET  /api/health
Static files are served from ../web.
"""

from __future__ import annotations

import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from . import optimizer
from .data import get_borrower, load_portfolio
from .portfolio import analyse, replay

WEB_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")


def _controls(query: dict) -> dict:
    """Parse the policy dials out of a query string, with sane fallbacks."""
    def num(key, default, lo, hi):
        try:
            v = float(query.get(key, [default])[0])
        except (TypeError, ValueError):
            return default
        return max(lo, min(hi, v))

    return {
        "utilisation": num("utilisation", optimizer.DEFAULT_UTILISATION, 0.5, 1.0),
        "grace_months": int(num("grace", 0, 0, 6)),
        "max_extension": int(num("max_extension", optimizer.DEFAULT_MAX_EXTENSION, 0, 12)),
        "npv_floor": num("npv_floor", optimizer.DEFAULT_NPV_FLOOR, 0.80, 1.05),
        "interest_cap": num("interest_cap", optimizer.DEFAULT_INTEREST_CAP, 1.0, 2.0),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "CENTRIC/0.1"

    def log_message(self, fmt, *args):      # quieter console
        pass

    # --- helpers ---------------------------------------------------------
    def _json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _static(self, path: str):
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        full = os.path.normpath(os.path.join(WEB_ROOT, rel))
        if not full.startswith(WEB_ROOT) or not os.path.isfile(full):
            self._json({"error": "not found"}, 404)
            return
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        with open(full, "rb") as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # --- routing ---------------------------------------------------------
    def do_GET(self):
        parsed = urlparse(self.path)
        path, query = parsed.path, parse_qs(parsed.query)

        if path == "/api/health":
            return self._json({"ok": True, "borrowers": len(load_portfolio())})

        if path == "/api/portfolio":
            try:
                return self._json(replay(**_controls(query)))
            except Exception as exc:                      # noqa: BLE001
                return self._json({"error": str(exc)}, 500)

        if path.startswith("/api/borrower/"):
            bid = path.rsplit("/", 1)[-1]
            try:
                return self._json(analyse(get_borrower(bid), **_controls(query)))
            except KeyError:
                return self._json({"error": f"no such borrower: {bid}"}, 404)
            except Exception as exc:                      # noqa: BLE001
                return self._json({"error": str(exc)}, 500)

        if path.startswith("/api/"):
            return self._json({"error": "unknown endpoint"}, 404)

        return self._static(path)


def serve(host: str = "127.0.0.1", port: int = 8000):
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"CENTRIC lender console → http://{host}:{port}")
    print("Ctrl-C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Run the CENTRIC demo server.")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    serve(args.host, args.port)
