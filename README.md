# dotfiles-mgr-c3

A read-only desktop application for viewing and monitoring cloned git repositories, built for dotfiles management.

## Purpose

- Browse and read git repositories
- View file trees and file contents
- Review commit history
- See branches and remotes
- All operations are read-only (no push, commit, or edit)

## Architecture

```
GTK3 + WebKit2GTK
       |
  C3 Backend  <-->  JS Frontend
       |                 |
   libgit2         Signal reactivity
   file I/O        Web Components
```

## Building

### Prerequisites

- C3 compiler (`c3c`)
- GTK3 + WebKit2GTK dev headers
- libgit2
- bun (for frontend)

### Build

```bash
bash vcpkg-install.sh   # install C deps
bash build.sh           # build backend
cd frontend && bun install && bun run build.js  # build frontend
```

### Run

```bash
./dotfiles-mgr
```

## Project Structure

```
src/
  main.c3                 Entry point
  core/
    rpc.c3                JSON-RPC dispatcher
    errors.c3             Error handling
    plugin.c3             Plugin system
  plugins/
    repo.c3               Git repo operations (read-only)
    ping.c3               Health check
    system.c3             System info
  bindings/
    libgit2.c3            Git FFI
    webview.c3            Webview FFI
    cjson.c3              JSON FFI
    ...

frontend/
  src/
    index.js              App layout
    framework/
      signals.js          Reactive primitives
      component.js        WebComponent base
      template.js         html tagged template
    plugins/
      repo-browser.js     Main repo viewer UI
      dashboard.js        Demo components
    core/
      rpc.js              RPC client
      errors.js           Error handling
      plugin-system.js    Plugin lifecycle
```

## RPC Methods

| Method | Description |
|--------|-------------|
| `repo.list` | List all tracked repos |
| `repo.info` | Get repo info (branch, remotes) |
| `repo.tree` | Get file tree at HEAD |
| `repo.file` | Read file content |
| `repo.history` | Get commit history |
| `repo.branches` | List branches |
| `repo.search` | Search filenames |

## Repo Storage

Repos are stored at:
```
~/.local/share/dotfiles-mgr/repos/
```

Place your dotfiles repos there, then the app will detect them.

## Read-Only Design

The application intentionally does not support:

- Git push, commit, or branch creation
- File editing or saving
- Index/staging operations
- Any write operations to repos

This is by design for safely viewing dotfiles without risk of accidental changes.
