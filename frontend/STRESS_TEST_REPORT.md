# Framework Stress Test Results

## Bugs Found & Fixed

### 1. Batch Deduplication (signals.js:51-66)
**Problem**: When a single effect subscribes to multiple signals and both are updated in a batch, the effect ran multiple times.
**Root cause**: `batchQueue` stored subscriber Sets, not individual effect functions. Iterating over Sets caused duplicate runs.
**Fix**: Collect unique Effect instances into a flat Set before flushing.

### 2. Effect Cleanup Leak (signals.js:37-49)
**Problem**: Inner effects created inside an outer effect were not cleaned up when the outer effect re-ran or was disposed.
**Root cause**: `createEffect` returned a no-op cleanup that only set `activeEffect = null`.
**Fix**: Introduced `Effect` class with parent-child tracking. Inner effects are disposed when parent re-runs or is disposed.

### 3. Effect Re-run Optimization (signals.js:37-49)
**Problem**: On re-run, old inner effects accumulated without cleanup.
**Root cause**: No mechanism to clean up children before re-running.
**Fix**: `Effect.run()` calls `#disposeChildren()` before executing the effect function.

---

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Basic Signal | 2 | ✅ |
| Functional Setter | 2 | ✅ |
| Signal Peek | 2 | ✅ |
| Effect Tracking | 4 | ✅ |
| Effect Cleanup | 1 | ✅ |
| Computed Signal | 3 | ✅ |
| Computed Chaining | 5 | ✅ |
| Batch | 3 | ✅ |
| Nested Batch | 2 | ✅ |
| Untrack | 2 | ✅ |
| Object Equality | 2 | ✅ |
| Signal in Loop | 2 | ✅ |
| Stack Overflow | 1 | ✅ |
| Multiple Effects | 3 | ✅ |
| Dynamic Dependencies | 7 | ✅ |
| Batch Multi-Signal | 1 | ✅ |
| Batch Flush Order | 1 | ✅ |
| Effect Disposal | 2 | ✅ |
| Rapid Mutation | 1 | ✅ |
| **Total** | **49** | **✅** |

---

## Gaps Identified

### signals.js — Missing APIs

1. **`createStore(initial)`** — Deep reactive object/array (like Solid's `createStore`)
2. **`createSelector(signals)`** — Efficient selection (only re-run when selection changes)
3. **`createMemo(fn)`** — Lazy computed (only recompute when read)
4. **`createRoot(fn)`** — Scoped effect tree with automatic cleanup
5. **Signal equality option** — Custom comparator: `createSignal(0, (a, b) => a === b)`
6. **`onCleanup(fn)`** — Register cleanup inside effect without managing return value
7. **`createResource(fn)`** — Async signal with loading/error states

### template.js — Missing APIs

1. **Event binding** — `@click=${handler}` syntax (currently manual in `setupEvents`)
2. **Attribute binding** — `class=${动态}`, `style=${动态}`, `disabled=${条件}`
3. **List rendering** — `repeat(items, (item) => html`...`)` with keyed reconciliation
4. **Conditional rendering** — `when(condition, () => html`...`)`
5. **Nested templates** — `html`<div>${html`<span>inner</span>`}</div>`
6. **Template caching** — Memoize static template strings
7. **XSS protection** — Sanitize dynamic attribute values

### component.js — Missing APIs

1. **Props/Attributes** — `static observedAttributes` + `attributeChangedCallback`
2. **Slots** — `<slot>` support for composition
3. **`requestUpdate()`** — Manual update trigger
4. **`updated()` lifecycle** — After DOM update hook
5. **`shouldUpdate()`** — Optimization gate
6. **Event emission** — `this.dispatchEvent(new CustomEvent(...))` helper
7. **Context provider** — `provide/inject` for deep prop passing

---

## Recommended New APIs (Priority Order)

### Tier 1 — Essential

```js
// 1. Store — deep reactivity
const [store, setStore] = createStore({
    user: { name: 'Alice', prefs: { theme: 'dark' } },
    items: [1, 2, 3]
});
setStore('user.name', 'Bob');  // deep set
setStore('items', arr => [...arr, 4]);  // array mutation

// 2. Selector — efficient list selection
const [selected, setSelected] = createSignal(null);
const isSelected = createSelector(selected);
// isSelected(5) only re-evaluates when selected changes to/from 5

// 3. onCleanup — simpler effect lifecycle
createEffect(() => {
    const ws = new WebSocket(url);
    onCleanup(() => ws.close());
});

// 4. createRoot — scoped effects
const dispose = createRoot((dispose) => {
    createEffect(() => { /* ... */ });
    return dispose;
});
dispose(); // kills all effects in this root
```

### Tier 2 — Template System

```js
// 5. Event binding in html template
html`
    <button @click=${() => setCount(c => c + 1)}>Click</button>
    <input @input=${e => setValue(e.target.value)}>
`;

// 6. Conditional rendering
html`
    <div>
        ${when(isLoading, () => html`<spinner></spinner>`)}
        ${when(isLoaded, () => html`<content></content>`)}
    </div>
`;

// 7. List rendering with keys
html`
    <ul>
        ${repeat(items, item => item.id, item => html`
            <li>${item.name}</li>
        `)}
    </ul>
`;
```

### Tier 3 — Component System

```js
// 8. Props via attributes
class UserCard extends ReactiveElement {
    static observedAttributes = ['name', 'role'];

    render() {
        return html`
            <h2>${() => this.getAttribute('name')}</h2>
            <span>${() => this.getAttribute('role')}</span>
        `;
    }
}
// <user-card name="Alice" role="admin"></user-card>

// 9. Event emission helper
class SearchInput extends ReactiveElement {
    render() {
        return html`
            <input @input=${e => this.emit('search', e.target.value)}>
        `;
    }
}
// <search-input @search=${handleSearch}></search-input>

// 10. Context provider
provide('theme', darkMode);
// In deep child:
const theme = inject('theme');
```

---

## Implementation Plan

### Phase 1: Core Primitives (signals.js)
1. Add `onCleanup(fn)` — register cleanup inside effects
2. Add `createRoot(fn)` — scoped effect trees
3. Add `createStore(initial)` — deep reactive proxy
4. Add `createSelector(signal)` — efficient selection
5. Add equality option to `createSignal`

### Phase 2: Template System (template.js)
1. Add `@event` binding support
2. Add `when(condition, renderFn)` conditional helper
3. Add `repeat(items, keyFn, renderFn)` list helper
4. Add attribute binding (`class=`, `style=`, etc.)

### Phase 3: Component System (component.js)
1. Add `observedAttributes` support
2. Add `emit(name, detail)` helper
3. Add `requestUpdate()` manual trigger
4. Add `updated()` lifecycle hook
