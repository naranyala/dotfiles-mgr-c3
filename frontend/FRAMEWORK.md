# MiMoCode Frontend Framework Specification

**Version:** 1.0
**Date:** 2026-07-02
**Base:** Browser-native Web Components + Signals

---

## 1. Architecture Overview

```
core/
├── signals.js      # Reactive primitives: signal, computed, effect, batch, watch, memo, reactive
├── component.js    # ReactiveComponent base class (HTMLElement + Shadow DOM + lifecycle)
├── template.js     # html tagged template with Part-based DOM binding
├── dom.js          # morph() DOM diffing
├── directives.js   # Template directives: until, repeat, guard, live, choose
├── flow.js         # Control flow: For, Show, Suspense, Portal, ErrorBoundary
├── context.js      # Context/Provider/Consumer for cross-component data
├── task.js         # Async data loading with pending/error/complete states
├── tokens.js       # Design tokens and CSS custom properties
└── index.js        # Barrel exports
```

## 2. Reactive Primitives (signals.js)

| API | Signature | Description |
|-----|-----------|-------------|
| `signal(initial)` | `→ { value, peek(), set(), update(fn) }` | Creates a reactive signal. `.value` get/set triggers effects. |
| `computed(fn)` | `→ { value, peek() }` | Derived signal. Re-computes when dependencies change. |
| `effect(fn)` | `→ cleanup()` | Runs `fn`, auto-tracks signal reads. Re-runs on change. Returns cleanup. |
| `batch(fn)` | `→ void` | Batches signal updates. Effects flush at end. |
| `watch(src, cb)` | `→ void` | Calls `cb(value, oldValue)` when signal changes. |
| `memo(fn, eq)` | `→ { value }` | Memoized computed with custom equality. |
| `onCleanup(fn)` | `→ void` | Registers cleanup inside active effect. |
| `reactive(obj)` | `→ Proxy` | Deep reactive proxy. Nested objects auto-track. |

**Contracts:**
- `Object.is` equality check by default
- Batch depth tracking prevents redundant effect runs
- `activeEffect` scope for automatic dependency tracking

## 3. ReactiveComponent (component.js)

### 3.1 Lifecycle

| Hook | When | Use case |
|------|------|----------|
| `constructor()` | Element created | Initialize signals, shadow DOM |
| `connectedCallback()` | Added to DOM | Start effects, fetch data |
| `onMount()` | After connected | Setup event listeners, delegate |
| `onRendered()` | After DOM update | Measure DOM, init libraries |
| `disconnectedCallback()` | Removed from DOM | Cleanup effects |
| `onDestroy()` | Before removal | Final cleanup |

### 3.2 NEW: `firstUpdated()` and `updated(changedProps)`

```js
export class MyComponent extends ReactiveComponent {
    firstUpdated() {
        // Called once after first render
        // Safe to query DOM, init third-party libs
    }
    updated(changedProps) {
        // Called after every render
        // changedProps is a Map of { propName: { old, new } }
    }
}
```

**Implementation:** Track `_firstUpdate` flag. After `performUpdate()`, call `firstUpdated()` on first, `updated()` on all subsequent.

### 3.3 Properties System

```js
static properties = {
    name: { type: String, attribute: true, reflect: false, value: '' },
    count: { type: Number, value: 0 },
    active: { type: Boolean, attribute: 'is-active' },
}
```

- `type`: String, Number, Boolean, Function, Object
- `attribute`: Map to HTML attribute (default: prop name)
- `reflect`: Sync prop changes back to attribute
- `value`: Default value

### 3.4 Style System

```js
// Static styles via adoptedStyleSheets (preferred)
const styles = componentStyles(`.my-class { ... }`)
export class MyComponent extends ReactiveComponent {
    static styles = styles
}

// Host defaults auto-injected by base class:
// :host { display: block; font-family; color; box-sizing }
```

## 4. Template Engine (template.js)

### 4.1 `html` Tagged Template

```js
import { html } from '../core/template.js'

render() {
    return html`
        <div class="app">
            <h1>${this.title.value}</h1>
            ${when(this.loading.value, html`<spinner/>`, html`<content/>`)}
            ${each(this.items.value, (item, i) => html`
                <div data-key="${item.id}">${item.name}</div>
            `)}
        </div>
    `
}
```

### 4.2 Event Binding

```js
html`<button @click="${this.handleClick}">Click</button>`
html`<input @input="${e => this.value.value = e.target.value}">`
```

Events are extracted from template, bound after DOM reconciliation.

### 4.3 NEW: Two-Way Binding (`:value`)

```js
html`<input :value="${this.name}">`
```

**Implementation:** In `reconcileNode()`, detect `:value` attribute. Set `node.value` property directly (not attribute). This syncs the signal value to the input without manual `@input` wiring.

### 4.4 Template Helpers

| Helper | Usage | Description |
|--------|-------|-------------|
| `when(cond, then, else)` | `${when(x > 0, html\`yes\`)}` | Conditional rendering |
| `each(items, fn)` | `${each(arr, (item, i) => html\`...\`)}` | List rendering |
| `classMap(obj)` | `${classMap({ active: isActive })}` | Dynamic classes |
| `styleMap(obj)` | `${styleMap({ color: 'red' })}` | Dynamic inline styles |

## 5. Flow Directives (flow.js)

### 5.1 `For` — Keyed List Rendering

```js
import { For } from '../core/flow.js'

html`${For({
    each: this.items.value,
    key: 'id',                    // or (item) => item.id
    children: (item, index) => html`
        <div data-key="${item.id}">
            ${item.name}
        </div>
    `
})}`
```

**Contract:**
- Items MUST have `data-key` attribute for efficient DOM reuse
- Reorder/insert/delete reuses existing DOM nodes by key
- Falls back to position-based if no key provided

### 5.2 `Show` — Conditional Rendering

```js
html`${Show({
    when: this.visible.value,
    fallback: html`<div>Hidden</div>`,
    children: html`<div>Visible</div>`
})}`
```

### 5.3 `ErrorBoundary` — Error Catching

```js
html`${ErrorBoundary({
    fallback: (error) => html`
        <div class="error">${error.message}</div>
    `,
    children: html`<risky-component/>`
})}`
```

**Implementation:** Wrap children render in try/catch. On error, render fallback with error info.

### 5.4 `Suspense` — Async Loading

```js
html`${Suspense({
    resource: this.dataTask,
    fallback: html`<spinner/>`,
    children: (data) => html`<data-view data="${data}"/>`
})}`
```

### 5.5 `Portal` — Render Outside Shadow DOM

```js
html`${Portal({
    target: document.body,
    children: html`<modal>Hello</modal>`
})}`
```

## 6. Context System (context.js)

### 6.1 Creating Context

```js
import { createContext } from '../core/context.js'

const ThemeContext = createContext('dark')
const UserContext = createContext(null)
```

### 6.2 Providing Context

```js
// In parent component
render() {
    return html`
        <${ThemeContext.Provider} .value="${this.theme}">
            <child-component/>
        </${ThemeContext.Provider}>
    `
}
```

### 6.3 Consuming Context

```js
// Option 1: consume() decorator
@consume(ThemeContext, 'theme')
export class ChildComponent extends ReactiveComponent { ... }

// Option 2: Manual subscription in onMount
onMount() {
    this._unsub = ThemeContext.subscribe(v => {
        this.theme = v
    })
}
onDestroy() { this._unsub?.() }

// Option 3: Consumer element
html`<${ThemeContext.Consumer}>${(theme) => html`<div>${theme}</div>`}</${ThemeContext.Consumer}>`
```

### 6.4 Context Contract

- Context crosses shadow DOM boundaries
- Provider updates propagate to all Consumers
- Default value used when no Provider in tree
- Cleanup on disconnect

## 7. Task System (task.js)

### 7.1 Creating Tasks

```js
import { Task, TaskStatus } from '../core/task.js'

// In component constructor
this.userTask = new Task(this, {
    task: async ([id]) => await fetchUser(id),
    args: () => [this.userId.value],
    autoRun: true,
})
```

### 7.2 Rendering Task States

```js
render() {
    return this.userTask.render({
        pending: () => html`<spinner/>`,
        error: (err) => html`<error-msg error="${err}"/>`,
        complete: (data) => html`<user-card user="${data}"/>`,
    })
}
```

### 7.3 Task Contract

- `autoRun: true` — runs on connect, re-runs when args change
- `autoRun: false` — manual `.run()` only
- Stale responses discarded (run ID tracking)
- Integrates with `requestUpdate()` for reactive rendering

## 8. Directives (directives.js)

| Directive | Usage | Description |
|-----------|-------|-------------|
| `until(promise, fallback)` | `${until(fetchData(), html\`loading\`)}` | Show fallback until promise resolves |
| `repeat(items, keyFn, template)` | `${repeat(arr, x => x.id, (x) => html\`...\`)}` | Keyed list (legacy, prefer `For`) |
| `guard(deps, fn)` | `${guard([x, y], () => expensive(x, y))}` | Memoize by deps |
| `live(value)` | `${live(this.counter)}` | Force update even if same reference |
| `choose(val, cases, default)` | `${choose(tab, { a: ..., b: ... })}` | Switch/case |
| `map(items, fn)` | `${map(arr, (x) => html\`...\`)}` | Simple list (no keying) |
| `range(n, fn)` | `${range(5, (i) => html\`<div>${i}</div>\`)}` | Iterate numbers |
| `ifDefined(val)` | `${ifDefined(maybeNull)}` | Render only if defined |
| `nothing` | `${condition ? html\`...\` : nothing}` | Render nothing (symbol) |

## 9. Refs

### 9.1 Element Refs

```js
import { signal } from '../core/signals.js'

export class MyComponent extends ReactiveComponent {
    constructor() {
        super()
        this.inputRef = signal(null)
    }

    render() {
        return html`<input .ref="${this.inputRef}">`
    }

    firstUpdated() {
        this.inputRef.value?.focus()
    }
}
```

**Implementation:** In `reconcileNode()`, detect `.ref` attribute. Set the signal value to the DOM element.

### 9.2 Callback Refs

```js
html`<canvas .ref="${(el) => this.initCanvas(el)}">`
```

## 10. Shared Styles / Design Tokens

### 10.1 Design Tokens

```js
import { defineTokens } from '../core/tokens.js'

defineTokens({
    'color-primary': '#6366f1',
    'color-bg': '#0f172a',
    'radius': '8px',
    'spacing-md': '16px',
})
```

### 10.2 Using Tokens in Components

```js
const styles = componentStyles(`
    .card {
        background: var(--color-bg);
        border-radius: var(--radius);
        padding: var(--spacing-md);
    }
`)
```

### 10.3 Token Cascade

- Tokens applied as CSS custom properties on `:host`
- All descendants inherit via CSS cascade
- No shadow DOM boundary for CSS custom properties

## 11. Error Handling

### 11.1 Component Error Boundary

```js
html`${ErrorBoundary({
    fallback: (error, retry) => html`
        <div class="error">
            <p>${error.message}</p>
            <button @click="${retry}">Retry</button>
        </div>
    `,
    children: html`<async-data-component/>`
})}`
```

### 11.2 Render Error Recovery

ReactiveComponent catches errors in `performUpdate()`:
- Logs error to console
- Shows error UI in shadow DOM (if configured)
- Does not crash parent components

## 12. Component Creation Standard

```js
// 1. Imports
import { ReactiveComponent } from '../core/component.js'
import { signal, computed } from '../core/signals.js'
import { html, when } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

// 2. Styles
const styles = componentStyles(`
    .my-component { /* ... */ }
`)

// 3. Component
export class MyComponent extends ReactiveComponent {
    static styles = styles
    static properties = {
        name: { type: String, value: '' },
    }

    constructor() {
        super()
        this.data = signal([])
        this.loading = signal(false)
    }

    firstUpdated() { /* init after first render */ }
    updated() { /* after every render */ }

    async loadData() {
        this.loading.value = true
        try {
            this.data.value = await window.rpc.myService.get()
        } finally {
            this.loading.value = false
        }
    }

    render() {
        return html`
            <div class="my-component">
                ${when(this.loading.value,
                    html`<div class="spinner"/>`,
                    html`${each(this.data.value, (item) =>
                        html`<div data-key="${item.id}">${item.name}</div>`
                    )}`
                )}
            </div>
        `
    }
}

// 4. Plugin registration
// plugins/my-component/index.js
import { MyComponent } from '../../components/my-component.js'
export const state = {}
export async function init() {
    if (!customElements.get('my-component'))
        customElements.define('my-component', MyComponent)
}
export function render() { return `<my-component></my-component>` }
```
