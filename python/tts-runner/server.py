"""
TTS Runner — stdlib-only HTTP server for text-to-speech.

Zero framework dependencies. Uses only:
  - http.server (stdlib)
  - json (stdlib)
  - asyncio (stdlib)

Requires: edge-tts (tiny, pure Python, ~100KB, no native deps).
Install:  uv add edge-tts  (managed by pyproject.toml)

Run:      cd python && uv run --package tts-runner python tts-runner/server.py

WARNING: Do NOT add FastAPI, uvicorn, or pyttsx3.
         edge-tts is the smallest viable TTS option.
         It uses Microsoft Edge's free TTS API — no API key needed.
"""

import asyncio
import http.server
import json
import os
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("[tts] edge-tts not installed. Run: pip install edge-tts")
    sys.exit(1)

PORT = int(os.environ.get("TTS_PORT", 8082))
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# ── Helpers ────────────────────────────────────────────────────
_loop = asyncio.new_event_loop()


def run_async(coro):
    """Run async function from sync context."""
    return _loop.run_until_complete(coro)


# ── HTTP Handler ───────────────────────────────────────────────
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[tts] {args[0]}" if args else "")

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length:
            return json.loads(self.rfile.read(length))
        return None

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"status": "ok"})
        elif self.path == "/voices":
            try:
                voices = run_async(edge_tts.list_voices())
                self._json(200, {"voices": voices})
            except Exception as e:
                self._json(500, {"error": str(e)})
        elif self.path.startswith("/audio/"):
            filename = self.path.split("/audio/", 1)[1]
            filepath = OUTPUT_DIR / filename
            if not filepath.exists():
                self._json(404, {"error": "Not found"})
                return
            data = filepath.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
        else:
            self._json(404, {"error": "Not found"})

    def do_POST(self):
        body = self._read_body()
        if self.path == "/speak":
            text = (body or {}).get("text", "").strip()
            if not text:
                self._json(400, {"error": "Text is empty"})
                return
            voice = (body or {}).get("voice", "en-US-AriaNeural")
            rate = (body or {}).get("rate", "+0%")
            volume = (body or {}).get("volume", "+0%")

            filename = f"tts_{hash(text) & 0xFFFFFF:06x}.mp3"
            filepath = OUTPUT_DIR / filename

            try:
                comm = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
                run_async(comm.save(str(filepath)))
                self._json(200, {"ok": True, "file": filename, "path": str(filepath)})
            except Exception as e:
                self._json(500, {"error": str(e)})
        else:
            self._json(404, {"error": "Not found"})

    def do_DELETE(self):
        if self.path.startswith("/audio/"):
            filename = self.path.split("/audio/", 1)[1]
            filepath = OUTPUT_DIR / filename
            if filepath.exists():
                filepath.unlink()
            self._json(200, {"ok": True})
        else:
            self._json(404, {"error": "Not found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


# ── Main ───────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  TTS Runner (stdlib-only, zero frameworks)")
    print("=" * 50)
    print(f"  Port:       {PORT}")
    print(f"  Engine:     edge-tts (Microsoft Edge free TTS)")
    print(f"  Output:     {OUTPUT_DIR}")
    print()
    print("  WARNING: This server uses only Python stdlib + edge-tts.")
    print("  Do NOT install FastAPI, uvicorn, or pyttsx3.")
    print("  edge-tts is ~100KB, pure Python, no native deps.")
    print("=" * 50)

    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        _loop.close()
        server.server_close()
