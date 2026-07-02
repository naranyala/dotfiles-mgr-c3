"""
Llama Server — stdlib-only HTTP wrapper around llama-server binary.

Zero framework dependencies. Uses only:
  - http.server (stdlib)
  - json (stdlib)
  - subprocess (stdlib)

Requires: llama-server binary on PATH (from llama.cpp).
Install:  brew install llama.cpp  OR  build from https://github.com/ggerganov/llama.cpp

Run:      cd python && uv run --package llama-server python llama-server/server.py

WARNING: Do NOT add FastAPI, uvicorn, or llama-cpp-python.
         Keep this file tiny. The heavy lifting is done by the C binary.
"""

import http.server
import json
import os
import signal
import subprocess
import sys
from pathlib import Path

PORT = int(os.environ.get("LLAMA_PORT", 8081))
MODEL_DIR = Path.home() / ".cache" / "llm-models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ── State ──────────────────────────────────────────────────────
llama_proc = None          # subprocess.Popen for llama-server
llama_port = 8080          # internal port the binary listens on
loaded_model = None


def find_llama_server():
    """Find llama-server binary on PATH."""
    for name in ["llama-server", "llama.cpp", "server"]:
        for p in os.environ.get("PATH", "/usr/bin").split(":"):
            full = Path(p) / name
            if full.is_file() and os.access(full, os.X_OK):
                return str(full)
    return None


def start_llama(model_path, ctx=2048):
    """Start llama-server subprocess."""
    global llama_proc, loaded_model
    binary = find_llama_server()
    if not binary:
        return {"error": "llama-server binary not found on PATH. Install llama.cpp."}
    if llama_proc and llama_proc.poll() is None:
        return {"error": "Server already running. POST /unload first."}

    cmd = [binary, "-m", model_path, "--port", str(llama_port), "-c", str(ctx), "--host", "127.0.0.1"]
    try:
        llama_proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        loaded_model = os.path.basename(model_path)
        return {"ok": True, "model": loaded_model, "pid": llama_proc.pid}
    except Exception as e:
        return {"error": str(e)}


def stop_llama():
    """Stop llama-server subprocess."""
    global llama_proc, loaded_model
    if llama_proc and llama_proc.poll() is None:
        llama_proc.terminate()
        try:
            llama_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            llama_proc.kill()
    llama_proc = None
    loaded_model = None
    return {"ok": True}


def proxy_request(method, path, body=None):
    """Forward request to the llama-server binary."""
    import urllib.request
    import urllib.error
    url = f"http://127.0.0.1:{llama_port}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()}
    except Exception as e:
        return {"error": str(e)}


# ── HTTP Handler ───────────────────────────────────────────────
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[llama] {args[0]}" if args else "")

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
            running = llama_proc is not None and llama_proc.poll() is None
            self._json(200, {"status": "ok", "model_loaded": running, "model": loaded_model})
        elif self.path == "/models":
            ggufs = [{"name": f.name, "path": str(f), "size_mb": round(f.stat().st_size / 1e6)}
                     for f in MODEL_DIR.glob("*.gguf")]
            self._json(200, {"models": ggufs, "directory": str(MODEL_DIR)})
        elif self.path.startswith("/v1/") or self.path.startswith("/completion"):
            # Proxy GET requests to llama-server
            self._json(200, proxy_request("GET", self.path))
        else:
            self._json(404, {"error": "Not found"})

    def do_POST(self):
        body = self._read_body()
        if self.path == "/load":
            path = (body or {}).get("path", "")
            if not path:
                ggufs = sorted(MODEL_DIR.glob("*.gguf"), key=lambda f: f.stat().st_size)
                if not ggufs:
                    self._json(400, {"error": f"No .gguf models in {MODEL_DIR}"})
                    return
                path = str(ggufs[0])
            if not os.path.exists(path):
                self._json(404, {"error": f"Not found: {path}"})
                return
            self._json(200, start_llama(path))
        elif self.path == "/unload":
            self._json(200, stop_llama())
        elif self.path == "/generate":
            if not (llama_proc and llama_proc.poll() is None):
                self._json(400, {"error": "No model loaded"})
                return
            prompt = (body or {}).get("prompt", "")
            max_tokens = (body or {}).get("max_tokens", 256)
            result = proxy_request("POST", "/completion", {
                "prompt": prompt, "n_predict": max_tokens, "temperature": (body or {}).get("temperature", 0.7)
            })
            self._json(200, {"text": result.get("content", ""), "usage": {}})
        else:
            # Proxy other POST to llama-server
            self._json(200, proxy_request("POST", self.path, body))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


# ── Main ───────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  Llama Server (stdlib-only, zero frameworks)")
    print("=" * 50)
    print(f"  Port:       {PORT}")
    print(f"  Binary:     {find_llama_server() or 'NOT FOUND — install llama.cpp'}")
    print(f"  Model dir:  {MODEL_DIR}")
    print(f"  Models:     {len(list(MODEL_DIR.glob('*.gguf')))} .gguf files")
    print()
    print("  WARNING: This server uses only Python stdlib.")
    print("  Do NOT install FastAPI, uvicorn, or llama-cpp-python.")
    print("  The heavy inference is done by the llama-server C binary.")
    print("=" * 50)

    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        stop_llama()
        server.server_close()
