# Plugin & Feature System

The application uses a lightweight plugin architecture to separate core logic from specific features.

## Backend Features (C3)

Backend "plugins" are called **Features**. They provide functionality via RPC methods that the frontend can call.

### Structure
Each feature is located in `src/features/[feature_name]/`.

1. **Module**: Define a module (e.g., `module features::system;`).
2. **Handlers**: Implement functions that handle RPC requests.
   - Signature: `fn void handler(webview::Webview w, char* id, cjson::CJson args)`
   - Response: Use `webview::webview_return(w, id, status, json_string)` to send data back.
3. **Initialization**: Provide an `init()` function that registers these handlers.

### Example
```c3
// src/features/my_feature/my_feature.c3
module features::my_feature;
import webview;
import cjson;
import core::rpc;

fn void handle_hello(webview::Webview w, char* id, cjson::CJson args) {
    cjson::CJson res = cjson::cJSON_CreateObject();
    cjson::cJSON_AddStringToObject(res, "message", "Hello from C3!");
    char* json = cjson::cJSON_PrintUnformatted(res);
    webview::webview_return(w, id, 0, json);
    libc::free(json);
    cjson::cJSON_Delete(res);
}

fn int init() {
    return core::rpc::register("my_feature.hello", &handle_hello);
}
```

### Activation
To enable a feature, import it and call `init()` in `src/main.c3`.

---

## Frontend Plugins (JS)

Frontend plugins are modular UI and logic components that can be registered with the shell.

### Structure
Each plugin is located in `frontend/src/plugins/[plugin_name]/`.

The `index.js` file must export:
1. **`state`**: A `reactive` object holding the plugin's data.
2. **`init()`**: An `async` function to initialize data (usually by calling backend RPCs).
3. **`render()`**: A function returning an HTML string.

### Example
```js
import { reactive } from '../../core/signals.js'

export const state = reactive({
    data: null
})

export async function init() {
    state.data = await window.rpc.my_feature.hello();
}

export function render() {
    return `<div class="card">Data: ${state.data.message}</div>`;
}
```

### Activation
Register the plugin in `frontend/src/shell/plugins.js` by adding it to the `plugins` array and the `pluginNames` list.

---

## Shared Utilities

### Backend
Use `src/shared/` for common C3 helpers. Common patterns include:
- JSON response helpers to reduce boilerplate in RPC handlers.
- String manipulation utilities.

### Frontend
Use `frontend/src/shared/` for common JS helpers:
- `rpc` wrapper for consistent error handling.
- UI component primitives.
