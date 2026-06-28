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

# Compile libzip from source (vcpkg timed out on it)
LIBZIP_SRC="$PROJECT_DIR/vendor/libzip/lib"
if [ ! -f "$PROJECT_DIR/vendor/libzip.o" ]; then
    echo "Compiling libzip..."
    cc -c "$LIBZIP_SRC"/*.c -o /dev/null 2>/dev/null || true
    # Compile individual needed files
    for f in zip_open zip_close zip_fopen zip_fread zip_fclose zip_stat zip_name_locate \
             zip_file_add zip_source_file zip_source_buffer zip_source_free zip_delete \
             zip_get_name zip_get_num_entries zip_error zip_strerror zip_discard \
             zip_file_rename zip_file_replace zip_file_get_comment zip_get_archive_comment \
             zip_set_archive_comment zip_source_open zip_source_close zip_source_read \
             zip_stat_index zip_stat_init zip_file_strerror zip_source_file_stdio; do
        [ -f "$LIBZIP_SRC/$f.c" ] && cc -c "$LIBZIP_SRC/$f.c" -o "$LIBZIP_SRC/$f.o" \
            -I"$LIBZIP_SRC" -I"$LIBZIP_SRC/.." -DHAVE_CONFIG_H -fPIC 2>/dev/null || true
    done
    # Link into single .o
    ar rcs "$PROJECT_DIR/vendor/libzip.a" "$LIBZIP_SRC"/*.o 2>/dev/null || \
    cc -shared -o "$PROJECT_DIR/vendor/libzip.so" "$LIBZIP_SRC"/*.o -lz 2>/dev/null || true
fi

# Static libraries from vcpkg
VCPKG_LIBS=""
for lib in cjson archive git2 sqlite3 yaml sodium whereami tinyfiledialogs; do
    if [ -f "$VCPKG_INSTALLED/lib/lib${lib}.a" ]; then
        VCPKG_LIBS="$VCPKG_LIBS $VCPKG_INSTALLED/lib/lib${lib}.a"
    elif [ -f "$VCPKG_INSTALLED/lib/lib${lib}.so" ]; then
        VCPKG_LIBS="$VCPKG_LIBS -l${lib}"
    fi
done

# Add libzip (compiled from vendor/)
if [ -f "$PROJECT_DIR/vendor/libzip.a" ]; then
    VCPKG_LIBS="$VCPKG_LIBS $PROJECT_DIR/vendor/libzip.a"
fi

echo "Compiling webview C++ wrapper..."
c++ -c webview/core/src/webview.cc -o webview.o -std=c++11 \
    -DWEBVIEW_GTK \
    -Iwebview/core/include \
    $VCPKG_INC \
    $(pkg-config --cflags $PKG_DEPS)

echo "Compiling C3 application..."
c3c compile \
    main.c3 webview.c3 \
    cjson.c3 sqlite3.c3 libgit2.c3 archive.c3 yaml.c3 sodium.c3 \
    whereami.c3 tinyfiledialogs.c3 libzip.c3 \
    webview.o \
    -z "$VCPKG_INC $VCPKG_LIB $VCPKG_LIBS \
        $(pkg-config --libs $PKG_DEPS) \
        -lstdc++ -lpthread -lz -lm -ldl"

echo ""
echo "Build successful! Executable is 'dotfiles-mgr'"
