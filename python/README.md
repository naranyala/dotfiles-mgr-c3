# Python Services — Minimal Stack Policy

## Philosophy

**Avoid big stacks. Pick the tiny solution if possible.**

Every dependency is a liability: attack surface, version conflicts, install time, binary size. When a stdlib module does the job, use it. When a small pure-Python package works, prefer it over a large native one.

## Toolchain: uv

All Python services use [uv](https://docs.astral.sh/uv/) as the package manager and runner.

```bash
# First time setup (from python/ directory)
cd python
uv sync

# Run a service
uv run --package llama-server python llama-server/server.py
uv run --package tts-runner python tts-runner/server.py

# Add a dependency to a service
cd python/tts-runner
uv add <package>
```

No `pip install` — uv handles venvs, locks, and installs.

## Rules

1. **No web frameworks.** Use `http.server` (stdlib). FastAPI/uvicorn/Flask are overkill for local tool servers.
2. **No auto-install.** Never `pip install` at runtime. Print what's missing and exit.
3. **No heavy native deps.** Avoid packages that compile C/C++ at install time unless truly necessary.
4. **Prefer subprocess over binding.** If a C binary exists (e.g., `llama-server`), wrap it with `subprocess` instead of pulling in a Python binding that recompiles the world.
5. **One external dep max per service.** If you need more, justify each one.

## Project Structure

```
python/
├── pyproject.toml          # uv workspace root
├── llama-server/
│   ├── pyproject.toml      # zero deps
│   └── server.py           # stdlib-only, wraps llama-server binary
└── tts-runner/
    ├── pyproject.toml      # edge-tts only
    └── server.py           # stdlib + edge-tts
```

## Current Services

| Service | Port | External Deps | Why |
|---------|------|---------------|-----|
| `llama-server/` | 8081 | **none** | stdlib wraps the `llama-server` C binary |
| `tts-runner/` | 8082 | `edge-tts` (~100KB) | Pure Python, no native build, free TTS API |

## What We Rejected

| Package | Size | Why Rejected |
|---------|------|--------------|
| FastAPI | ~5MB | Overkill for local JSON endpoints |
| uvicorn | ~3MB | `http.server` is sufficient |
| llama-cpp-python | ~50MB | Compiles llama.cpp at install; use the binary directly |
| pyttsx3 | ~1MB | Depends on platform TTS engines, inconsistent |
| torch+TTS | ~2GB | Absurd for a simple TTS wrapper |
