#!/bin/bash
set -euo pipefail

PKG_DEPS=""
if [ "$(uname)" = "Linux" ]; then
    PKG_DEPS="gtk+-3.0 webkit2gtk-4.1"
fi

echo "Running C3 Tests..."
c3c compile-test src webview.o \
    -z "deps/out/lib/libcjson.a \
        deps/out/lib/libarchive.a \
        deps/out/lib/libgit2.a \
        deps/out/lib/libsqlite3.a \
        deps/out/lib/libyaml.a \
        deps/out/lib/libsodium.a \
        $(pkg-config --libs $PKG_DEPS) \
        -lstdc++ -lpthread -lz -lm -ldl"
