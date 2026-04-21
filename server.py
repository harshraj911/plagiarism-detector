#!/usr/bin/env python3
"""
Plagiarism Detector - Backend Server
Proxies requests to the Copyleaks API to avoid CORS issues.
API Keys from config:
  - Key 1 (account email/id): 973d45e7-f15d-436f-ad6b-777578180a35
  - Key 2 (Copyleaks API Key): d530dfee-c119-478d-80c7-1951f9f0be35
"""

import json
import uuid
import time
import urllib.request
import urllib.error
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# ──────────────────────────────────────────────────────────────────────────────
# Copyleaks Credentials
# ──────────────────────────────────────────────────────────────────────────────
# The user-provided API credentials:
COPYLEAKS_EMAIL   = "hraj48147@gmail.com"                      # Copyleaks account email
COPYLEAKS_API_KEY = "d530dfee-c119-478d-80c7-1951f9f0be35"    # Copyleaks API Key

COPYLEAKS_AUTH_URL = "https://id.copyleaks.com/v3/account/login/api"
COPYLEAKS_SCAN_URL = "https://api.copyleaks.com/v3/businesses/submit/file/{scan_id}"
COPYLEAKS_RESULT_URL = "https://api.copyleaks.com/v3/businesses/{scan_id}/report/results"

PORT = 5050

# In-memory token cache
_token_cache = {"token": None, "expires_at": 0}
_scans = {}   # scan_id -> {"status": ..., "result": ...}


def get_access_token():
    """Obtain (or return cached) Copyleaks access token."""
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["token"]

    payload = json.dumps({"email": COPYLEAKS_EMAIL, "key": COPYLEAKS_API_KEY}).encode()
    req = urllib.request.Request(
        COPYLEAKS_AUTH_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            token = data.get("access_token") or data.get("token", "")
            expires_in = data.get("expires_in", 3600)
            _token_cache["token"] = token
            _token_cache["expires_at"] = now + expires_in
            return token
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"Auth failed [{e.code}]: {body}")


def poll_scan_result(scan_id, token):
    """Background thread that polls Copyleaks until scan is complete."""
    url = COPYLEAKS_RESULT_URL.format(scan_id=scan_id)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    max_polls = 40
    for _ in range(max_polls):
        time.sleep(5)
        req = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                _scans[scan_id]["status"] = "complete"
                _scans[scan_id]["result"] = data
                return
        except urllib.error.HTTPError as e:
            if e.code == 404:
                continue  # still processing
            body = e.read().decode()
            _scans[scan_id]["status"] = "error"
            _scans[scan_id]["error"] = f"Error [{e.code}]: {body}"
            return
        except Exception as ex:
            _scans[scan_id]["status"] = "error"
            _scans[scan_id]["error"] = str(ex)
            return
    _scans[scan_id]["status"] = "timeout"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

    def send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path):
        import mimetypes
        mime, _ = mimetypes.guess_type(path)
        mime = mime or "text/plain"
        try:
            with open(path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            self.send_json(404, {"error": "File not found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))

        if self.path == "/" or self.path == "/index.html":
            self.send_file(os.path.join(base_dir, "index.html"))
        elif self.path == "/style.css":
            self.send_file(os.path.join(base_dir, "style.css"))
        elif self.path == "/app.js":
            self.send_file(os.path.join(base_dir, "app.js"))
        elif self.path.startswith("/api/status/"):
            scan_id = self.path.split("/api/status/")[1]
            info = _scans.get(scan_id)
            if not info:
                self.send_json(404, {"error": "Scan not found"})
            else:
                self.send_json(200, info)
        else:
            self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/api/scan":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                payload = json.loads(body)
                text = payload.get("text", "").strip()
                if not text:
                    self.send_json(400, {"error": "No text provided"})
                    return

                token = get_access_token()
                scan_id = str(uuid.uuid4())

                # Base64-encode the text as required by Copyleaks
                import base64
                encoded = base64.b64encode(text.encode()).decode()

                scan_payload = json.dumps({
                    "base64": encoded,
                    "filename": "submission.txt",
                    "properties": {
                        "webhooks": {
                            "status": f"http://localhost:{PORT}/api/webhook/{{STATUS}}/{scan_id}"
                        }
                    }
                }).encode()

                url = COPYLEAKS_SCAN_URL.format(scan_id=scan_id)
                req = urllib.request.Request(
                    url,
                    data=scan_payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    resp.read()  # Consume response

                _scans[scan_id] = {"status": "processing", "result": None}

                # Start background polling
                t = threading.Thread(target=poll_scan_result, args=(scan_id, token), daemon=True)
                t.start()

                self.send_json(200, {"scan_id": scan_id, "status": "processing"})

            except RuntimeError as e:
                self.send_json(502, {"error": str(e)})
            except Exception as e:
                self.send_json(500, {"error": str(e)})
        else:
            self.send_json(404, {"error": "Not found"})


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"✅ Plagiarism Detector server running at http://localhost:{PORT}")
    print(f"   Using Copyleaks API Key: {COPYLEAKS_API_KEY[:8]}...")
    print("   Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
