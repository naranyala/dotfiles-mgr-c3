#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

VCPKG_TRIPLET="x64-linux"
VCPKG_INSTALLED="$PROJECT_DIR/vendor/vcpkg_installed/$VCPKG_TRIPLET"

# Check vcpkg deps are installed
if [ ! -d "$VCPKG_INSTALLED" ]; then
    echo "vcpkg dependencies not installed. Running vcpkg-install.sh first..."
    bash "$PROJECT_DIR/vcpkg-install.sh"
fi

echo "=== Building dotfiles-manager ==="

# Platform-specific pkg-config
if [[ "$(uname)" == "Linux" ]]; then
    PKG_DEPS="gtk+-3.0 webkit2gtk-4.1"
fi

VCPKG_INC="-I$VCPKG_INSTALLED/include"
VCPKG_LIB="-L$VCPKG_INSTALLED/lib"

# Static libraries from vcpkg
VCPKG_LIBS=""
for lib in cjson archive git2 sqlite3 yaml sodium whereami tinyfiledialogs; do
    if [ -f "$VCPKG_INSTALLED/lib/lib${lib}.a" ]; then
        VCPKG_LIBS="$VCPKG_LIBS $VCPKG_INSTALLED/lib/lib${lib}.a"
    elif [ -f "$VCPKG_INSTALLED/lib/lib${lib}.so" ]; then
        VCPKG_LIBS="$VCPKG_LIBS -l${lib}"
    fi
done
VCPKG_LIBS="$VCPKG_LIBS -lgit2"

# Add libzip
if [ -f "$PROJECT_DIR/vendor/libzip.a" ]; then
    VCPKG_LIBS="$VCPKG_LIBS $PROJECT_DIR/vendor/libzip.a"
fi

# Add sqlite
if [ -f "$PROJECT_DIR/vendor/sqlite/libsqlite3.a" ]; then
    VCPKG_LIBS="$VCPKG_LIBS $PROJECT_DIR/vendor/sqlite/libsqlite3.a"
fi

echo "Compiling webview C++ wrapper..."
c++ -c webview/core/src/webview.cc -o webview.o -std=c++11 \
    -DWEBVIEW_GTK -DWEBVIEW_API=extern \
    -Iwebview/core/include \
    $VCPKG_INC \
    $(pkg-config --cflags $PKG_DEPS)

echo "Compiling C3 application..."
c3c compile \
    src/main.c3 \
    src/shared/json_utils.c3 \
    src/bindings/webview.c3 \
    src/bindings/cjson.c3 \
    src/bindings/sqlite.c3 \
    src/bindings/sqlite3.c3 \
    src/bindings/libgit2.c3 \
    src/bindings/archive.c3 \
    src/bindings/yaml.c3 \
    src/bindings/sodium.c3 \
    src/bindings/whereami.c3 \
    src/bindings/tinyfiledialogs.c3 \
    src/bindings/libzip.c3 \
    src/core/rpc.c3 \
    src/core/errors.c3 \
    src/core/plugin.c3 \
    src/features/ping/ping.c3 \
    src/features/system/system.c3 \
    src/features/git/repo.c3 \
    src/features/workspace/workspace.c3 \
    src/features/shell/shell.c3 \
    src/features/man/man.c3 \
    src/features/sqlite/sqlite.c3 \
    webview.o \
    -o dotfiles-mgr \
    -z "$VCPKG_INC $VCPKG_LIB $VCPKG_LIBS \
        $(pkg-config --libs $PKG_DEPS) \
        -lstdc++ -lpthread -lz -lm -ldl"

echo ""
echo "Build successful! Executable is 'dotfiles-mgr'"

# Build test binary if test file exists
if [ -f "$PROJECT_DIR/tests/test_rpc_handlers.c3" ]; then
    echo ""
    echo "Compiling test binary..."
    c3c compile \
        src/tests/test_rpc_handlers.c3 \
        src/shared/json_utils.c3 \
        src/bindings/webview.c3 \
        src/bindings/cjson.c3 \
        src/bindings/sqlite.c3 \
        src/bindings/sqlite3.c3 \
        src/bindings/libgit2.c3 \
        src/bindings/archive.c3 \
        src/bindings/yaml.c3 \
        src/bindings/sodium.c3 \
        src/bindings/whereami.c3 \
        src/bindings/tinyfiledialogs.c3 \
        src/bindings/libzip.c3 \
        src/core/rpc.c3 \
        src/core/errors.c3 \
        src/core/plugin.c3 \
        src/features/ping/ping.c3 \
        src/features/system/system.c3 \
        src/features/git/repo.c3 \
        src/features/workspace/workspace.c3 \
        src/features/shell/shell.c3 \
        src/features/sqlite/sqlite.c3 \
        webview.o \
        -o test_rpc \
        -z "$VCPKG_INC $VCPKG_LIB $VCPKG_LIBS \
            $(pkg-config --libs $PKG_DEPS) \
            -lstdc++ -lpthread -lz -lm -ldl"

    if [ $? -eq 0 ]; then
        echo "Test binary built: ./test_rpc"
    else
        echo "Test build failed!"
    fi
fi
