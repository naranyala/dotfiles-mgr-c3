# TODO: Libraries to Download

## Already Installed

- [x] `cjson` — JSON parser
- [x] `libarchive` — tar/zip/7z extraction
- [x] `libgit2` — Git operations
- [x] `sqlite3` — Embedded database
- [x] `libyaml` — YAML parser
- [x] `libsodium` — Encryption/hashing

## HTTP & Network

- [ ] `curl` — HTTP client (downloads, API calls)
- [ ] `libssh2` — SSH protocol (git-over-SSH, remote access)
- [ ] `mbedtls` — Lightweight TLS/SSL

## Compression & Hashing

- [ ] `zstd` — Fast compression (better than gzip)
- [ ] `lz4` — Fast compression/decompression
- [ ] `xxhash` — Fast non-crypto hashing (checksums, dedup)

## Config & Parsing

- [ ] `pcre2` — Regex pattern matching
- [ ] `toml11` — TOML config parser
- [ ] `parson` — Lightweight JSON (simpler alternative to cjson)
- [ ] `libxml2` — XML parser

## Image Handling

- [ ] `libpng` — PNG images
- [ ] `libjpeg-turbo` — JPEG images

## File System & Dialogs ✅

- [x] `whereami` — Find executable path at runtime (vcpkg)
- [x] `tinyfiledialogs` — Native file/folder dialogs (vcpkg)
- [x] `libzip` — ZIP files (vendor clone, compiled from source)

## Data Structures

- [ ] `uthash` — Hash tables, linked lists (header-only)
- [ ] `stb` — Image load/save, utilities (header-only)
- [ ] `lmdb` — Fast key-value store

## Utilities

- [ ] `qrcode` — QR code generation

## Installation

```bash
# Install all at once
cd /media/naranyala/Data/projects-remote/c3written-dotfiles-mgr

VCPKG_DIR="$(pwd)/vendor/vcpkg"
TRIPLET="x64-linux"

"$VCPKG_DIR/vcpkg" install \
    curl libssh2 mbedtls \
    zstd lz4 xxhash \
    pcre2 toml11 parson libxml2 \
    libpng libjpeg-turbo \
    whereami tinyfiledialogs libzip \
    uthash stb lmdb \
    qrcode \
    --triplet "$TRIPLET" \
    --overlay-ports="$VCPKG_DIR/ports" \
    --overlay-triplets="$VCPKG_DIR/triplets" \
    --x-install-root="$(pwd)/vendor/vcpkg_installed" \
    --no-print-usage
```

## C3 Bindings Needed

After download, create `.c3` binding files:

- `curl.c3` — HTTP client bindings
- `libssh2.c3` — SSH bindings
- `compression.c3` — zstd/lz4/xxhash bindings
- `regex.c3` — pcre2 bindings
- `image.c3` — libpng/libjpeg bindings
- `dialog.c3` — tinyfiledialogs bindings
- `lmdb.c3` — key-value store bindings
- `whereami.c3` — ✅ done
- `tinyfiledialogs.c3` — ✅ done
- `libzip.c3` — ✅ done
