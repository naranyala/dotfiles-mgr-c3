#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

VCPKG_DIR="$PROJECT_DIR/vendor/vcpkg"
VCPKG="$VCPKG_DIR/vcpkg"
TRIPLET="x64-linux"
INSTALL_PREFIX="$PROJECT_DIR/vendor/vcpkg_installed/$TRIPLET"

mkdir -p "$INSTALL_PREFIX"

PACKAGES=(cjson libarchive libgit2 sqlite3 libyaml libsodium)

echo "=== Installing dependencies via vcpkg ==="

"$VCPKG" install \
    "${PACKAGES[@]}" \
    --triplet "$TRIPLET" \
    --overlay-ports="$VCPKG_DIR/ports" \
    --overlay-triplets="$VCPKG_DIR/triplets" \
    --x-install-root="$PROJECT_DIR/vendor/vcpkg_installed" \
    --no-print-usage

echo ""
echo "=== Installed libraries ==="
ls -1 "$INSTALL_PREFIX/lib/"*.a "$INSTALL_PREFIX/lib/"*.so 2>/dev/null | xargs -I{} basename {} || echo "(checking...)"

echo ""
echo "Include: $INSTALL_PREFIX/include/"
echo "Libs:    $INSTALL_PREFIX/lib/"
