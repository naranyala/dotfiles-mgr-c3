#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; exit 1; }

# ── Subcommands ─────────────────────────────────────────────────
cmd_build() {
    info "Building dotfiles-manager..."

    # Dependencies
    if [ ! -f deps/out/lib/libcjson.a ]; then
        info "Building dependencies..."
        bash deps/download.sh
        bash deps/build.sh
    fi

    # Webview C++ wrapper
    info "Compiling webview C++ wrapper..."
    PKG_DEPS=""
    [ "$(uname)" = "Linux" ] && PKG_DEPS="gtk+-3.0 webkit2gtk-4.1"

    c++ -c webview/core/src/webview.cc -o webview.o -std=c++11 \
        -DWEBVIEW_GTK -DWEBVIEW_STATIC -DWEBVIEW_IMPLEMENTATION \
        -Iwebview/core/include \
        $(pkg-config --cflags $PKG_DEPS 2>/dev/null) \
        || fail "Failed to compile webview wrapper"
    ok "webview.o compiled"

    # C3 application
    info "Compiling C3 application..."
    c3c compile src webview.o \
        -o dotfiles-mgr \
        -z "deps/out/lib/libcjson.a \
            deps/out/lib/libarchive.a \
            deps/out/lib/libgit2.a \
            deps/out/lib/libsqlite3.a \
            deps/out/lib/libyaml.a \
            deps/out/lib/libsodium.a \
            $(pkg-config --libs $PKG_DEPS 2>/dev/null) \
            -lstdc++ -lpthread -lz -lm -ldl -lgssapi_krb5 -lssl -lcrypto" \
        || fail "Failed to compile C3 application"
    ok "Build successful → ./dotfiles-mgr"
}

cmd_run() {
    [ -f "./dotfiles-mgr" ] || cmd_build
    info "Running dotfiles-mgr..."
    exec ./dotfiles-mgr
}

cmd_longest() {
    echo "=== Files With Longest Lines (C3 / C / JS) ==="
    echo "    Showing files where any line exceeds 100 chars"
    echo ""

    scan_dir() {
        local label="$1"; shift
        echo "--- $label ---"
        find "$@" -type f 2>/dev/null | sort | while read f; do
            max=$(awk 'length > m { m = length } END { print m+0 }' "$f")
            if [ "$max" -gt 100 ] 2>/dev/null; then
                printf "%4d|%s\n" "$max" "$f"
            fi
        done | sort -t'|' -k1 -rn | head -15 | while IFS='|' read -r line file; do
            printf "  %4d  %s\n" "$line" "$file"
        done
        echo ""
    }

    scan_dir "C3 Files" src -name '*.c3'
    scan_dir "C/C++ Files" src webview -name '*.c' -o -name '*.cc' -o -name '*.h'
    scan_dir "JS Files" frontend/src -name '*.js'
    echo "=== Done ==="
}

cmd_clean() {
    info "Cleaning build artifacts..."
    rm -f webview.o dotfiles-mgr
    ok "Cleaned"
}

cmd_help() {
    cat <<'EOF'
Usage: ./build.sh [command]

Commands:
  build      Build the project (default)
  run        Build if needed, then run
  longest    List files with longest lines (C3/C/JS)
  clean      Remove build artifacts
  help       Show this help
EOF
}

# ── Dispatch ────────────────────────────────────────────────────
case "${1:-build}" in
    build)   cmd_build ;;
    run)     cmd_run ;;
    longest) cmd_longest ;;
    clean)   cmd_clean ;;
    help|-h|--help) cmd_help ;;
    *)       fail "Unknown command: $1 (try './build.sh help')" ;;
esac
