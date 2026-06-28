#!/bin/bash
set -euo pipefail

DEPS_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DEPS_DIR"

OUT_DIR="$DEPS_DIR/out"
mkdir -p "$OUT_DIR"

CFLAGS="-O2 -fPIC -I$OUT_DIR/include"
LDFLAGS="-L$OUT_DIR/lib"

# ── 1. cJSON ────────────────────────────────────────────────
echo "[1/6] Building cJSON..."
if [ ! -f "$OUT_DIR/lib/libcjson.a" ]; then
    cd "$DEPS_DIR/cJSON"
    mkdir -p build && cd build
    cmake .. -DCMAKE_INSTALL_PREFIX="$OUT_DIR" -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DBUILD_SHARED_LIBS=OFF -DCJSON_BUILD_TESTS=OFF -DCJSON_BUILD_SHARED_LIBS=OFF
    make -j"$(nproc)"
    make install
    cd "$DEPS_DIR"
fi

# ── 2. libarchive ───────────────────────────────────────────
echo "[2/6] Building libarchive..."
if [ ! -f "$OUT_DIR/lib/libarchive.a" ]; then
    cd "$DEPS_DIR/libarchive"
    mkdir -p build && cd build
    cmake .. -DCMAKE_INSTALL_PREFIX="$OUT_DIR" -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DBUILD_SHARED_LIBS=OFF -DENABLE_TEST=OFF -DENABLE_TAR=ON -DENABLE_CPIO=OFF -DENABLE_UNZIP=ON -DENABLE_CAT=OFF
    make -j"$(nproc)"
    make install
    cd "$DEPS_DIR"
fi

# ── 3. libgit2 ──────────────────────────────────────────────
echo "[3/6] Building libgit2..."
if [ ! -f "$OUT_DIR/lib/libgit2.a" ]; then
    cd "$DEPS_DIR/libgit2"
    mkdir -p build && cd build
    cmake .. -DCMAKE_INSTALL_PREFIX="$OUT_DIR" -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DBUILD_SHARED_LIBS=OFF -DBUILD_TESTS=OFF -DBUILD_CLI=OFF
    make -j"$(nproc)"
    make install
    cd "$DEPS_DIR"
fi

# ── 4. SQLite3 (amalgamation, compile directly) ─────────────
echo "[4/6] Building SQLite3..."
if [ ! -f "$OUT_DIR/lib/libsqlite3.a" ]; then
    mkdir -p "$OUT_DIR/lib" "$OUT_DIR/include"
    cp "$DEPS_DIR/sqlite/sqlite3.h" "$OUT_DIR/include/"
    cp "$DEPS_DIR/sqlite/sqlite3.c" "$OUT_DIR/lib/"
    cd "$OUT_DIR/lib"
    gcc -O2 -fPIC -c sqlite3.c -o sqlite3.o
    ar rcs libsqlite3.a sqlite3.o
    rm -f sqlite3.o sqlite3.c
    cd "$DEPS_DIR"
fi

# ── 5. libyaml ──────────────────────────────────────────────
echo "[5/6] Building libyaml..."
if [ ! -f "$OUT_DIR/lib/libyaml.a" ]; then
    cd "$DEPS_DIR/libyaml"
    mkdir -p build && cd build
    cmake .. -DCMAKE_INSTALL_PREFIX="$OUT_DIR" -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DBUILD_SHARED_LIBS=OFF -DBUILD_TESTS=OFF
    make -j"$(nproc)"
    make install
    cd "$DEPS_DIR"
fi

# ── 6. libsodium ────────────────────────────────────────────
echo "[6/6] Building libsodium..."
if [ ! -f "$OUT_DIR/lib/libsodium.a" ]; then
    cd "$DEPS_DIR/libsodium"
    if [ -f "autogen.sh" ]; then
        ./autogen.sh -s
    fi
    ./configure --prefix="$OUT_DIR" --disable-shared --enable-static --with-pic
    make -j"$(nproc)"
    make install
    cd "$DEPS_DIR"
fi

echo ""
echo "=== All dependencies built ==="
echo ""
echo "Headers: $OUT_DIR/include/"
echo "Static:  $OUT_DIR/lib/"
echo ""
ls -la "$OUT_DIR/lib/"
