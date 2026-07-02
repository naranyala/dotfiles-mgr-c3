# SKILLS.md — dotfiles-mgr-c3

## Frontend Component Standard

**Every component MUST follow this pattern. No exceptions.**

### File structure

```
frontend/src/components/<name>.js      # Component class
frontend/src/plugins/<name>/index.js   # Plugin entry (registers + renders)
```

### Component template

```js
import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .my-component { /* component-specific CSS only */ }
    .my-btn { /* ... */ }
`)

export class MyComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.data = signal([])
        this.loading = signal(false)
        this.error = signal('')
    }

    async loadData() {
        this.loading.value = true
        try {
            this.data.value = await window.rpc.myService.getData()
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    render() {
        return `
        <div class="my-component">
            <!-- NO <style> tags here — styles are in static styles -->
            <!-- Use shared utility classes: .btn, .btn-primary, .error-box, etc. -->
        </div>`
    }
}
```

### Rules

1. **NO inline `<style>` in render()** — always use `static styles` with `componentStyles()`
2. **NO duplicated utility CSS** — use shared classes from `component-styles.js` (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.error-box`, `.success-box`, `.status-dot`, `.section-label`, `.field-group`, `.form-grid`, `.empty-state`)
3. **`ReactiveComponent` base class auto-injects `:host` defaults** — don't add your own `:host` unless you need to override `display`, `font-family`, `color`, or `box-sizing`
4. **Use `signal()` for reactive state** — not plain objects, not `reactive()` for component state
5. **Use component-prefixed class names** — e.g., `.tracker-header`, `.llm-bar`, `.tts-wrap`
6. **Export class, not define() call** — the plugin `init()` calls `customElements.define()`
7. **Use `escapeHtml()` from `shared/utils.js`** when inserting user content into HTML

### Plugin template

```js
import { MyComponent } from '../../components/my-component.js'

export const state = {}

export async function init() {
    if (!customElements.get('my-component')) {
        customElements.define('my-component', MyComponent)
    }
}

export function render() {
    return `<my-component></my-component>`
}
```

### Available shared utilities

From `shared/component-styles.js`:
- **Buttons**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`
- **Forms**: `.form-grid`, `.field-group`, `input`, `textarea`, `select`
- **Feedback**: `.error-box`, `.success-box`, `.status-dot.on`, `.status-dot.off`
- **Layout**: `.section-label`, `.empty-state`

From `shared/utils.js`:
- `escapeHtml(str)` — XSS-safe HTML escaping
- `uiCard(title, content, icon)` — consistent card layout
- `rpcCall(method, ...args)` — error-handled RPC wrapper
- `formatBytes(bytes)` — human-readable byte formatting

---

## Plugin Registration (6 steps)

1. Create `frontend/src/plugins/<name>/index.js` (export `state`, `init`, `render`)
2. Create `frontend/src/components/<name>.js` (extends `ReactiveComponent`)
3. Register in `frontend/src/shell/plugins.js` (import + add to `plugins` and `pluginNames` arrays)
4. Add launcher in `frontend/src/shell/launchers.js` (import + launcher object with `id`, `icon`, `title`, `group`, `desc`, `content`)
5. Add to category in `frontend/src/shell/categories.js`
6. If backend needed: create `src/features/<name>/<name>.c3` + register in `src/main.c3`

---

## Backend (C3) Pattern

```c3
module features::my_feature;
import webview; import cjson; import core::rpc; import core::errors;

fn void handle_method(webview::Webview w, char* id, cjson::CJson args) {
    // Extract args: char* val = cjson::cJSON_GetStringValue(cjson::cJSON_GetArrayItem(args, 1));
    // Return: webview::webview_return(w, id, 0, json_str);
    // Error: core::rpc::respond_error(w, id, errors::ERR_CODE, "message", "source");
}

fn int init() {
    int rc;
    rc = core::rpc::register("my.method", &handle_method); if (rc != errors::ERR_OK) return rc;
    return errors::ERR_OK;
}
```

Register in `src/main.c3`:
```c3
import features::my_feature;
// in main():
rc = features::my_feature::init();
```

Frontend calls: `window.rpc.my.method(args)`

---

## Python Services: Minimal Stack Rule

**WARNING: Avoid big stacks. Pick the tiny solution if possible.**

- Use `http.server` from stdlib, NOT FastAPI/uvicorn/Flask
- Use `subprocess` to wrap C binaries, NOT Python bindings
- One external pip dependency max per service
- Never auto-install at runtime
- **Toolchain: `uv`** — `uv run --package <name> python <script>`
- Python services are NOT called directly from frontend — use C3 RPC bridge

```bash
cd python && uv sync --all-packages
uv run --package llama-server python llama-server/server.py   # :8081
uv run --package tts-runner python tts-runner/server.py       # :8082
uv run --package md-to-pdf python md-to-pdf/server.py         # :8083
uv run --package pdf-to-speech python pdf-to-speech/server.py # :8084
```

---

## Code Style

- No comments unless asked
- No hover effects on cards (removed)
- Prefer `signal()` for reactive state
- Use `uiCard()` from `shared/utils.js` for consistent card layout
- Use `escapeHtml()` from `shared/utils.js` for user content
- Component-prefixed CSS class names (`.tracker-*`, `.llm-*`, `.tts-*`, etc.)

## Critical: Nested html Templates

When a component's `render()` returns `html` with nested method calls that also return `html`:

```js
render() {
    return html`
        <div>
            ${this.renderStep()}  <!-- returns html`...` -->
            <button @click="${this.next}">Next</button>
        </div>
    `
}
```

The framework handles this automatically via `flattenEvents()` which recursively merges events from all nested TemplateResults. No special handling needed — just use `html` templates normally.
