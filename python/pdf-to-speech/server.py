"""
PDF-to-Speech server — stdlib HTTP + pdfminer.six + edge-tts.

Zero frameworks. Uses:
  - http.server (stdlib)
  - pdfminer.six (pure Python, ~500KB) for text extraction
  - edge-tts (pure Python, ~100KB) for TTS

Run: cd python && uv run --package pdf-to-speech python pdf-to-speech/server.py
"""

import http.server
import json
import os
import hashlib
from pathlib import Path

try:
    from pdfminer.high_level import extract_text
except ImportError:
    print("[pdf-to-speech] Missing deps. Run: uv sync")
    exit(1)

try:
    import edge_tts
    import asyncio
except ImportError:
    print("[pdf-to-speech] Missing edge-tts. Run: uv sync")
    exit(1)

PORT = int(os.environ.get("PDF2SPEECH_PORT", 8084))
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

_loop = asyncio.new_event_loop()


def run_async(coro):
    return _loop.run_until_complete(coro)


def extract_pdf_text(filepath):
    text = extract_text(filepath)
    return text.strip()


def text_to_hash(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[pdf-to-speech] {args[0]}" if args else "")

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

        if self.path == "/extract":
            # Accept markdown text with a PDF-like path (for demo)
            # In production, would accept multipart file upload
            text = (body or {}).get("text", "")
            if not text.strip():
                self._json(400, {"error": "No text provided"})
                return
            self._json(200, {"ok": True, "text": text, "chars": len(text)})

        elif self.path == "/speak":
            text = (body or {}).get("text", "").strip()
            voice = (body or {}).get("voice", "en-US-AriaNeural")
            rate = (body or {}).get("rate", "+0%")

            if not text:
                self._json(400, {"error": "Text is empty"})
                return

            # Chunk long text (edge-tts has limits)
            chunks = []
            sentences = text.replace('\n', ' ').split('. ')
            current = ""
            for s in sentences:
                if len(current) + len(s) > 3000:
                    if current:
                        chunks.append(current.strip())
                    current = s
                else:
                    current = current + ". " + s if current else s
            if current.strip():
                chunks.append(current.strip())

            filenames = []
            for i, chunk in enumerate(chunks):
                h = text_to_hash(chunk)
                filename = f"speech_{h}_{i}.mp3"
                filepath = OUTPUT_DIR / filename
                try:
                    comm = edge_tts.Communicate(chunk, voice, rate=rate)
                    run_async(comm.save(str(filepath)))
                    filenames.append(filename)
                except Exception as e:
                    self._json(500, {"error": f"Chunk {i} failed: {str(e)}"})
                    return

            self._json(200, {
                "ok": True,
                "files": filenames,
                "chunks": len(chunks),
                "total_chars": len(text),
            })

        elif self.path == "/convert-and-speak":
            text = (body or {}).get("text", "").strip()
            voice = (body or {}).get("voice", "en-US-AriaNeural")
            rate = (body or {}).get("rate", "+0%")

            if not text:
                self._json(400, {"error": "Text is empty"})
                return

            # Convert markdown-like text to plain text
            import re
            plain = re.sub(r'#{1,6}\s+', '', text)  # Remove headings
            plain = re.sub(r'\*\*(.+?)\*\*', r'\1', plain)  # Remove bold
            plain = re.sub(r'\*(.+?)\*', r'\1', plain)  # Remove italic
            plain = re.sub(r'`(.+?)`', r'\1', plain)  # Remove inline code
            plain = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', plain)  # Remove links
            plain = re.sub(r'[-*]\s+', '', plain)  # Remove list markers
            plain = re.sub(r'\n{2,}', '\n', plain)  # Collapse newlines

            h = text_to_hash(plain)
            filename = f"speech_{h}.mp3"
            filepath = OUTPUT_DIR / filename

            try:
                comm = edge_tts.Communicate(plain, voice, rate=rate)
                run_async(comm.save(str(filepath)))
                self._json(200, {"ok": True, "file": filename, "chars": len(plain)})
            except Exception as e:
                self._json(500, {"error": str(e)})
        else:
            self._json(404, {"error": "Not found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


if __name__ == "__main__":
    print("=" * 50)
    print("  PDF-to-Speech (stdlib-only)")
    print("=" * 50)
    print(f"  Port:    {PORT}")
    print(f"  Engine:  pdfminer.six + edge-tts")
    print(f"  Output:  {OUTPUT_DIR}")
    print("=" * 50)

    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        _loop.close()
        server.server_close()
