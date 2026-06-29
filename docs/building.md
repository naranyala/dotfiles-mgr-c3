# Building

## Prerequisites

### Required Tools

- **c3c** -- C3 compiler
- **g++** or **clang++** -- C++ compiler (for webview wrapper)
- **cc** -- C compiler (for libzip)
- **pkg-config** -- library discovery
- **bun** -- JavaScript runtime (for frontend build)

### Required Libraries

System packages (install via package manager):

| Library | Package (Ubuntu) | Package (Arch) |
|---------|------------------|----------------|
| GTK3 | `libgtk-3-dev` | `gtk3` |
| WebKit2GTK | `libwebkit2gtk-4.1-dev` | `webkit2gtk-4.1` |
| pkg-config | `pkg-config` | `pkgconf` |

### vcpkg Dependencies

Installed via `vcpkg-install.sh`:

| Library | Purpose |
|---------|---------|
| cJSON | JSON parsing |
| libarchive | tar/zip/7z extraction |
| libgit2 | Git operations |
| sqlite3 | Embedded database |
| libyaml | YAML parsing |
| libsodium | Encryption/hashing |
| whereami | Find executable path |
| tinyfiledialogs | Native file dialogs |
| libzip | ZIP files (compiled from vendor/) |

## Build Steps

### 1. Install vcpkg dependencies

```bash
bash vcpkg-install.sh
```

This runs vcpkg to install all required C libraries into `vendor/vcpkg_installed/`.

### 2. Build the application

```bash
bash build.sh
```

This script:

1. Checks vcpkg dependencies are installed
2. Compiles the webview C++ wrapper (`webview/core/src/webview.cc` -> `webview.o`)
3. Compiles all C3 source files and links with native libraries
4. Produces the `dotfiles-mgr` executable

### 3. Build the frontend

```bash
cd frontend
bun install
bun run build.js
```

This bundles `frontend/src/` into `frontend/dist/bundle.js` using esbuild.

### 4. Build and run (all-in-one)

```bash
bash run.sh
```

Compiles `build.c3` as a build orchestrator, runs it, then executes `dotfiles-mgr`.

## Build Output

```
dotfiles-mgr           Main executable
frontend/dist/
  index.html           HTML shell
  bundle.js            Bundled JavaScript
  bundle.js.map        Source map
webview.o              Compiled webview wrapper
```

## Build Configuration

### build.sh

The shell build script is the primary build method. Key variables:

```
VCPKG_TRIPLET="x64-linux"
VCPKG_INSTALLED="vendor/vcpkg_installed/x64-linux"
PKG_DEPS="gtk+-3.0 webkit2gtk-4.1"
```

### build.c3

Alternative build method written in C3. Compiles and runs shell commands to build dependencies, webview, and the main application.

### build.js (frontend)

Uses esbuild for bundling:

```js
{
    entryPoints: ['src/index.js'],
    bundle: true,
    outfile: 'dist/bundle.js',
    format: 'esm',
    minify: true,
    sourcemap: true,
}
```

## Platform Support

### Linux (primary)

- GTK3 + WebKit2GTK backend
- Tested on x86_64

### macOS (not yet)

Would need:
- Cocoa + WKWebView backend
- Different pkg-config flags

### Windows (not yet)

Would need:
- MSHTML or Edge WebView2 backend
- Different build toolchain

## Troubleshooting

### "vcpkg dependencies not installed"

Run `bash vcpkg-install.sh` first.

### "pkg-config: gtk+-3.0 not found"

Install GTK3 dev headers:
```bash
# Ubuntu/Debian
sudo apt install libgtk-3-dev

# Arch
sudo pacman -S gtk3
```

### "pkg-config: webkit2gtk-4.1 not found"

Install WebKit2GTK dev headers:
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev

# Arch
sudo pacman -S webkit2gtk-4.1
```

### "c3c: command not found"

Install the C3 compiler:
```bash
# Arch
sudo pacman -S c3

# Ubuntu/Debian (from source)
git clone https://github.com/c3lang/c3c
cd c3c && mkdir build && cd build
cmake .. && make
sudo cp bin/c3c /usr/local/bin/
```

### "bun: command not found"

Install bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

### Frontend not loading in webview

Make sure `frontend/dist/index.html` exists. Build the frontend:
```bash
cd frontend && bun install && bun run build.js
```
