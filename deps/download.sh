#!/bin/bash
set -euo pipefail

DEPS_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DEPS_DIR"

echo "=== Downloading C libraries for dotfiles-manager ==="

# ── 1. cJSON (JSON parser) ──────────────────────────────────
echo "[1/6] cJSON..."
if [ ! -d "cJSON" ]; then
    git clone --depth 1 https://github.com/DaveGamble/cJSON.git
fi

# ── 2. libarchive (tar/zip/7z extraction) ───────────────────
echo "[2/6] libarchive..."
if [ ! -d "libarchive" ]; then
    git clone --depth 1 https://github.com/libarchive/libarchive.git
fi

# ── 3. libgit2 (git operations) ─────────────────────────────
echo "[3/6] libgit2..."
if [ ! -d "libgit2" ]; then
    git clone --depth 1 https://github.com/libgit2/libgit2.git
fi

# ── 4. SQLite3 (embedded database) ──────────────────────────
echo "[4/6] SQLite3..."
if [ ! -d "sqlite" ]; then
    mkdir -p sqlite
    cd sqlite
    curl -sL "https://www.sqlite.org/2024/sqlite-amalgamation-3470200.zip" -o sqlite.zip
    unzip -o sqlite.zip
    mv sqlite-amalgamation-*/* .
    rmdir sqlite-amalgamation-*
    rm -f sqlite.zip
    cd "$DEPS_DIR"
fi

# ── 5. libyaml (YAML parser) ────────────────────────────────
echo "[5/6] libyaml..."
if [ ! -d "libyaml" ]; then
    git clone --depth 1 https://github.com/yaml/libyaml.git
fi

# ── 6. libsodium (crypto) ───────────────────────────────────
echo "[6/6] libsodium..."
if [ ! -d "libsodium" ]; then
    git clone --depth 1 https://github.com/jedisct1/libsodium.git
fi

echo ""
echo "=== All dependencies downloaded ==="
echo ""
echo "Contents:"
ls -1d */
echo ""
echo "Build integration: see deps/build.sh"
