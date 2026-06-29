# Backend (C3)

## Overview

The backend is written in C3, a modern C-like language. It handles native operations (file system, git, database, crypto) and exposes them to the frontend via JSON-RPC.

## Entry Point

`src/main.c3` initializes the RPC system, registers plugins, creates the webview, and runs the event loop.

```
main()
  |
  +-- errors::error_init()
  +-- rpc::init()
  +-- plugins::ping::init()
  +-- plugins::system::init()
  +-- webview::webview_create()
  +-- webview::webview_set_title()
  +-- webview::webview_set_size()
  +-- rpc::bind(w)
  +-- webview::webview_navigate()
  +-- webview::webview_run()        // blocking event loop
  +-- webview::webview_destroy()
```

## RPC System (`src/core/rpc.c3`)

### Registry

The RPC registry stores up to 128 method handlers:

```
struct RpcRegistry {
    char*[128] methods;      // method names
    RpcHandler[128] handlers; // handler functions
    bool[128] active;        // active flags
    int count;               // current count
}
```

### Handler Signature

```
alias RpcHandler = fn void(webview::Webview, char* id, cjson::CJson args);
```

- `w` -- webview instance for sending response
- `id` -- JSON-RPC request ID (must be passed back)
- `args` -- the full JSON-RPC request array `[method, ...params]`

### Request Format

```json
["methodName", { "key": "value" }]
```

### Response Format

Success:
```json
{ "result": "..." }
```

Error:
```json
{ "error": true, "code": 1001, "message": "Invalid JSON" }
```

### Registration

```
fn int init() {
    return core::rpc::register("ping", &handle_ping);
}
```

Returns `ERR_OK` (0) on success, error code on failure.

### Dispatch Flow

1. `webview_bind` registers `handle_rpc_callback` as the global handler
2. Frontend calls `window.backendRPC([method, ...args])`
3. `handle_rpc_callback` parses JSON, validates structure
4. Looks up method in registry
5. Calls handler with `(w, id, json)`
6. Handler calls `webview_return(w, id, status, result)`
7. If method not found, returns error JSON

## Error System (`src/core/errors.c3`)

### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 0 | `ERR_OK` | Success |
| 1001 | `ERR_JSON_PARSE` | Invalid JSON input |
| 1002 | `ERR_INVALID_REQUEST` | Malformed request |
| 1003 | `ERR_METHOD_NOT_FOUND` | Unknown RPC method |
| 1004 | `ERR_HANDLER_CRASH` | Handler threw exception |
| 1005 | `ERR_REGISTRY_FULL` | Too many plugins |
| 1006 | `ERR_INVALID_ARGS` | Null or invalid arguments |
| 2001 | `ERR_WEBVIEW` | Webview operation failed |
| 2002 | `ERR_WEBVIEW_NULL` | Null webview reference |
| 3001 | `ERR_SQLITE` | SQLite error |
| 3002 | `ERR_GIT` | Git error |
| 3003 | `ERR_ARCHIVE` | Archive error |
| 3004 | `ERR_ZIP` | ZIP error |
| 4001 | `ERR_PLUGIN` | Plugin error |

### Error Log

Ring buffer with 256 entries:

```
struct ErrorInfo {
    int code;
    char* message;
    char* source;
    long timestamp;
}
```

Errors are logged to stderr with format:
```
[ERROR] source: message (code=NNNN)
```

### JSON Error Response

```
fn char* error_to_json(int code, char* message);
fn char* error_to_json_full(int code, char* message, char* source);
```

## Plugins

### Plugin Structure

Each plugin is a C3 module with:

1. A handler function matching `RpcHandler` signature
2. An `init()` function that registers with the RPC system

### ping Plugin (`src/plugins/ping.c3`)

Health check endpoint. Returns `{"message": "pong from C3!", "ok": true}`.

### system Plugin (`src/plugins/system.c3`)

Returns basic system information. Currently hardcoded to `{"os": "Linux", "version": "1.0", "ok": true}`.

### Adding a New Plugin

1. Create `src/plugins/yourplugin.c3`:

```c3
module plugins::yourplugin;
import webview;
import cjson;
import core::rpc;
import core::errors;

fn void handle_your_method(webview::Webview w, char* id, cjson::CJson args) {
    if (!w) {
        errors::error_push(errors::ERR_WEBVIEW_NULL, "null webview", "yourplugin");
        return;
    }

    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::CJson_AddStringToObject(result, "status", "ok");
    cjson::CJson_AddBoolToObject(result, "ok", 1);

    char* json_str = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json_str);
    cjson::cJSON_Delete(result);
    libc::free(json_str);
}

fn int init() {
    return core::rpc::register("yourMethod", &handle_your_method);
}
```

2. Import and call in `src/main.c3`:

```c3
import plugins::yourplugin;

fn int main() {
    plugins::yourplugin::init();
    // ...
}
```

## Bindings (`src/bindings/`)

All bindings are FFI declarations to C libraries. They use `extern fn` to declare external functions.

### webview.c3

FFI to the webview C++ library. Provides:
- `webview_create`, `webview_destroy` -- lifecycle
- `webview_set_title`, `webview_set_size` -- window config
- `webview_navigate`, `webview_set_html` -- content
- `webview_bind`, `webview_return` -- RPC bridge
- `webview_run`, `webview_terminate` -- event loop

### cjson.c3

FFI to cJSON. Provides:
- `cJSON_Parse`, `cJSON_Print` -- serialization
- `cJSON_Create*` -- object/array/string/number/bool creation
- `cJSON_Get*` -- accessors
- `cJSON_Add*` -- builders
- `cJSON_Delete` -- cleanup

### sqlite3.c3

FFI to SQLite3. Provides:
- `sqlite3_open`, `sqlite3_close` -- connection
- `sqlite3_exec`, `sqlite3_prepare_v2` -- queries
- `sqlite3_step`, `sqlite3_finalize` -- iteration
- `sqlite3_bind_*`, `sqlite3_column_*` -- parameter binding
- `sqlite3_errmsg` -- error messages

### libgit2.c3

FFI to libgit2. Provides:
- `git_libgit2_init`, `git_libgit2_shutdown` -- lifecycle
- `git_clone`, `git_repository_open` -- repo access
- `git_remote_create`, `git_remote_fetch` -- remote ops
- `git_checkout_head`, `git_repository_head` -- refs

### archive.c3

FFI to libarchive. Provides:
- `archive_read_*` -- reading archives
- `archive_write_*` -- writing archives
- `archive_entry_*` -- entry metadata

### yaml.c3

FFI to libyaml. Provides:
- `yaml_parser_*` -- parsing YAML
- `yaml_emitter_*` -- emitting YAML

### sodium.c3

FFI to libsodium. Provides:
- `crypto_generichash` -- hashing
- `crypto_secretbox_*` -- authenticated encryption
- `crypto_kdf_*` -- key derivation
- `randombytes_*` -- random number generation
- `crypto_kx_*` -- key exchange

### libzip.c3

FFI to libzip. Provides:
- `zip_open`, `zip_close` -- archive lifecycle
- `zip_fopen`, `zip_fread` -- file reading
- `zip_file_add` -- file writing
- `zip_stat` -- file metadata
- `zip_strerror` -- error messages

### whereami.c3

FFI to whereami. Provides:
- `wai_getExecutablePath` -- find executable location
- `wai_getModulePath` -- find module location

### tinyfiledialogs.c3

FFI to tinyfiledialogs. Provides:
- `tinyfd_openFileDialog` -- open file
- `tinyfd_saveFileDialog` -- save file
- `tinyfd_selectFolderDialog` -- select folder
- `tinyfd_messageBox` -- message dialog
- `tinyfd_inputBox` -- input dialog
- `tinyfd_notifyPopup` -- notification
