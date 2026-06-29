#!/bin/bash
set -euo pipefail

PKG_DEPS=""
if [ "$(uname)" = "Linux" ]; then
    PKG_DEPS="gtk+-3.0 webkit2gtk-4.1"
fi

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VCPKG_TRIPLET="x64-linux"
VCPKG_INSTALLED="$PROJECT_DIR/vendor/vcpkg_installed/$VCPKG_TRIPLET"

VCPKG_INC="-I$VCPKG_INSTALLED/include"
VCPKG_LIB="-L$VCPKG_INSTALLED/lib"

VCPKG_LIBS=""
for lib in cjson archive git2 sqlite3 yaml sodium whereami tinyfiledialogs; do
    if [ -f "$VCPKG_INSTALLED/lib/lib${lib}.a" ]; then
        VCPKG_LIBS="$VCPKG_LIBS $VCPKG_INSTALLED/lib/lib${lib}.a"
    elif [ -f "$VCPKG_INSTALLED/lib/lib${lib}.so" ]; then
        VCPKG_LIBS="$VCPKG_LIBS -l${lib}"
    fi
done
VCPKG_LIBS="$VCPKG_LIBS -lgit2"

if [ -f "$PROJECT_DIR/vendor/libzip.a" ]; then
    VCPKG_LIBS="$VCPKG_LIBS $PROJECT_DIR/vendor/libzip.a"
fi

echo "Running C3 Tests..."
c3c compile-test src webview.o \
    -z "$VCPKG_INC $VCPKG_LIB $VCPKG_LIBS \
        $(pkg-config --libs $PKG_DEPS) \
        -lstdc++ -lpthread -lz -lm -ldl"
