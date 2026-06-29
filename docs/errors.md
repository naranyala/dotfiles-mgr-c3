# Error Handling

## Overview

Both backend and frontend have structured error handling systems with typed errors, logging, and user-facing error display.

## Backend Error System

### Error Codes (`src/core/errors.c3`)

All error codes are integer constants:

```
ERR_OK                = 0      Success
ERR_JSON_PARSE        = 1001   Invalid JSON input
ERR_INVALID_REQUEST   = 1002   Malformed request structure
ERR_METHOD_NOT_FOUND  = 1003   Unknown RPC method
ERR_HANDLER_CRASH     = 1004   Handler threw exception
ERR_REGISTRY_FULL     = 1005   Too many registered methods (128 max)
ERR_INVALID_ARGS      = 1006   Null or invalid arguments
ERR_WEBVIEW           = 2001   Generic webview error
ERR_WEBVIEW_NULL      = 2002   Null webview reference
ERR_SQLITE            = 3001   SQLite error
ERR_GIT               = 3002   Git error
ERR_ARCHIVE           = 3003   Archive error
ERR_ZIP               = 3004   ZIP error
ERR_PLUGIN            = 4001   Plugin error
```

### Error Logging

Errors are pushed to a ring buffer and printed to stderr:

```
fn void error_push(int code, char* message, char* source);
```

Format:
```
[ERROR] rpc::handle_rpc: Invalid JSON (code=1001)
```

### Error JSON

For RPC responses:

```
fn char* error_to_json(int code, char* message);
fn char* error_to_json_full(int code, char* message, char* source);
```

Output:
```json
{"error": true, "code": 1001, "message": "Invalid JSON"}
```

### Critical Error Check

```
fn int error_has_critical();
```

Returns true if any error with code >= 2000 has been logged. Checked at exit in `main.c3`.

## Frontend Error System

### Error Classes (`core/errors.js`)

```
AppError (base)
  +-- SignalError      signal/computed/effect errors
  +-- ComponentError   component lifecycle errors
  +-- RpcError         RPC call errors
  +-- TemplateError    template rendering errors
```

### AppError Structure

```js
{
    error: true,
    code: 'SIGNAL',
    message: 'Signal setter failed',
    source: 'signals',
    level: ErrorLevels.ERROR,
    timestamp: 1719657600000,
    stack: '...',
    context: { /* optional extra data */ }
}
```

### Error Levels

```
DEBUG    = 0
INFO     = 1
WARN     = 2
ERROR    = 3
CRITICAL = 4
```

### Logging

```js
logError(error);           // log an error
getErrorLog();             // get all logged errors
clearErrorLog();           // clear the log
```

Log is capped at 500 entries.

### Window Error Handler

```js
const remove = onError((error) => {
    // handles uncaught errors and unhandled rejections
});
remove(); // stop listening
```

## Where Errors Are Caught

### Backend

| Location | What is caught |
|----------|----------------|
| `rpc::handle_rpc_callback` | Null webview, null request/id, invalid JSON, invalid structure, unknown method |
| `rpc::register` | Registry full, duplicate method |
| `main` | Null webview, webview API failures, plugin init failures |
| Plugin handlers | Null webview check |

### Frontend

| Location | What is caught |
|----------|----------------|
| `signals.js` | Signal setter errors, effect execution errors, computed errors, batch errors, subscriber errors |
| `component.js` | render() errors (shows error boundary), setupEvents() errors, connectedCallback errors |
| `template.js` | Template expression errors (shows `[Error]` text) |
| `rpc.js` | Null backendRPC, timeout, RPC errors, promise rejection |
| `plugin-manager.js` | Invalid name, invalid config, missing render, duplicate registration |

## Error Propagation Flow

### Backend Error to Frontend

```
1. Plugin handler calls error_push() (logged to stderr)
2. Handler returns JSON error via webview_return()
3. webview bridges response to frontend
4. rpc.call() Promise rejects with RpcError
5. Component catches and displays error
```

### Frontend Internal Error

```
1. Error thrown in signal/effect/template
2. Caught by try/catch in framework
3. Logged via logError() to ring buffer
4. Error boundary shows fallback UI
5. Error panel in header shows count
```

## User-Facing Error Display

### Error Boundary

Components that fail to render show:

```
+----------------------------------+
| Component Error                  |
| ComponentName                    |
| Cannot read property 'x' of null |
| at render (file.js:42)          |
+----------------------------------+
```

### Error Panel

The app header shows an error badge when errors occur. Clicking it opens a panel with:

- Error count
- List of recent errors (last 20)
- Clear button
- Timestamp and source for each error

### RPC Error Display

The RPC test card shows:
- Status: idle / loading / ok / error
- Result or error message
- Red border on error
