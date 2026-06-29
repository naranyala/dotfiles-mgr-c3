# Architecture

## Purpose

A read-only desktop application for viewing and monitoring cloned git repositories, focused on dotfiles management use cases.

## System Layers

```
+--------------------------------------------------+
|                   GTK3 + WebKit2GTK               |
+--------------------------------------------------+
         |                              |
    Native Webview                 Web Content
    (C++ wrapper)                 (HTML/JS/CSS)
         |                              |
+--------+-----+              +--------+---------+
|                |              |                  |
|  C3 Backend    |  JSON-RPC   |  JS Frontend     |
|                | <---------> |                  |
+----------------+              +------------------+
|                |              |                  |
|  Git ops       |              |  Repo browser    |
|  File read     |              |  File viewer     |
|  History       |              |  History view    |
+----------------+              +------------------+
         |                              |
    libgit2 (FFI)               Signal reactivity
    libc (POSIX)                Web Components
```

## Read-Only Design

The application is intentionally read-only:

- No git push, commit, or branch creation
- No file editing or saving
- No index/staging operations
- File content read from disk, not from git objects
- Branch switching is view-only (shows which branch is HEAD)

## Module Structure

### Backend (C3)

| Module | Path | Purpose |
|--------|------|---------|
| `main` | `src/main.c3` | Entry point, webview setup |
| `core::rpc` | `src/core/rpc.c3` | JSON-RPC dispatcher |
| `core::errors` | `src/core/errors.c3` | Error codes and logging |
| `core::plugin` | `src/core/plugin.c3` | Plugin registry and events |
| `plugins::repo` | `src/plugins/repo.c3` | Git repo operations |
| `plugins::ping` | `src/plugins/ping.c3` | Health check |
| `plugins::system` | `src/plugins/system.c3` | System info |
| `libgit2` | `src/bindings/libgit2.c3` | FFI to libgit2 |

### Frontend (JS)

| Module | Path | Purpose |
|--------|------|---------|
| `index.js` | `src/index.js` | App shell and layout |
| `plugins::repo-browser` | `src/plugins/repo-browser.js` | Main repo viewer UI |
| `framework::signals` | `src/framework/signals.js` | Reactive primitives |
| `framework::component` | `src/framework/component.js` | WebComponent base |
| `framework::template` | `src/framework/template.js` | html tagged template |
| `core::errors` | `src/core/errors.js` | Error handling |
| `core::rpc` | `src/core/rpc.js` | RPC client |

## RPC Methods

| Method | Arguments | Returns |
|--------|-----------|---------|
| `repo.list` | none | `[{name, branch, isRepo}]` |
| `repo.info` | `[name]` | `{name, path, branch, branches, remotes}` |
| `repo.tree` | `[name]` | `[{name, type}]` |
| `repo.file` | `[name, path]` | `{path, content, size}` |
| `repo.history` | `[name]` | `[{id, message, author}]` |
| `repo.branches` | `[name]` | `[{name, current}]` |
| `repo.search` | `[name, query]` | `[filename, ...]` |

## Data Flow

```
User clicks repo in sidebar
  --> selectRepo(name)
  --> rpc.call('repo.info', name)
  --> rpc.call('repo.tree', name)
  --> rpc.call('repo.history', name)
  --> rpc.call('repo.branches', name)
  --> UI updates with signals

User clicks file
  --> openFile(path)
  --> rpc.call('repo.file', name, path)
  --> File content displayed with line numbers

User clicks History tab
  --> setViewMode('history')
  --> History already loaded, just switch view
```

## Repo Storage

Repos are stored at:
```
/home/naranyala/.local/share/dotfiles-mgr/repos/
```

Each subdirectory is a git repository. The app scans this directory on startup.

## Build Pipeline

```
C3 sources + libgit2 FFI
    |
    v
c3c compile --> dotfiles-mgr
    |
    v
webview.o (C++ GTK wrapper)
    |
    v
Frontend: esbuild --> dist/bundle.js
```
