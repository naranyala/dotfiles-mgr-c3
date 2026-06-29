# Frontend Framework

## Overview

The frontend is built with vanilla JavaScript using browser-native Web Components and Shadow DOM. A custom signal-based reactivity system powers the UI without any external frameworks.

## Framework Files

```
frontend/src/framework/
  signals.js      -- Signal primitives
  component.js    -- ReactiveElement base class
  template.js     -- html tagged template
  index.js        -- Barrel exports
```

## Signals (`signals.js`)

Signals are reactive primitives that automatically track dependencies and notify subscribers when values change.

### createSignal

```js
const [get, set] = createSignal(initialValue);
```

- `get()` -- reads the value, tracks dependency if inside an effect
- `get.peek()` -- reads without tracking
- `get.subscriberCount()` -- number of active subscribers
- `set(value)` or `set(prev => next)` -- updates, notifies subscribers

### createComputed

```js
const doubled = createComputed(() => count() * 2);
```

Derived signal that auto-updates when dependencies change. Returns a getter function.

### createEffect

```js
const dispose = createEffect(() => {
    const val = someSignal();
    // runs whenever someSignal changes
});
dispose(); // stop the effect
```

Side effect that re-runs when its tracked dependencies change. Errors are caught and logged.

### batch

```js
batch(() => {
    setA(1);
    setB(2);
    setC(3);
});
// effects run once after all updates, not three times
```

Groups multiple signal updates into a single notification cycle.

### untrack

```js
createEffect(() => {
    untrack(() => {
        // reads here do NOT create dependencies
        console.log(someSignal());
    });
});
```

Read a signal without tracking it as a dependency.

## Component (`component.js`)

### ReactiveElement

Base class for all UI components:

```js
import { ReactiveElement } from './framework/index.js';
import { html } from './framework/index.js';

class MyComponent extends ReactiveElement {
    render() {
        return html`<div>Hello</div>`;
    }
    setupEvents() {
        // attach event listeners here
    }
    onMount() {
        // called after first render
    }
    onUnmount() {
        // called when removed from DOM
    }
}

customElements.define('my-component', MyComponent);
```

#### Lifecycle

1. `constructor()` -- creates Shadow DOM
2. `connectedCallback()` -- renders, sets up events, calls `onMount()`
3. Signal changes trigger re-render (innerHTML replaced)
4. `disconnectedCallback()` -- disposes effects, calls `onUnmount()`

#### Properties

- `this.root` -- the Shadow Root
- `this.isMounted` -- whether component is in the DOM
- `this.$(selector)` -- querySelector on Shadow Root
- `this.$$(selector)` -- querySelectorAll on Shadow Root

#### Error Boundary

If `render()` throws, the component shows an error fallback UI instead of crashing:

```
+----------------------------------+
| Component Error                  |
| MyComponent                      |
| Cannot read property 'x' of null |
| at render (index.js:42)         |
+----------------------------------+
```

### ErrorBoundary

A wrapper component that catches errors from children:

```html
<error-boundary fallback="Something went wrong">
    <risky-component></risky-component>
</error-boundary>
```

## Template (`template.js`)

### html Tag

Tagged template literal for creating reactive DOM:

```js
import { html } from './framework/index.js';

const fragment = html`
    <div class="card">
        <span>${count}</span>
        <button>Click</button>
    </div>
`;
```

#### How It Works

1. Template string is parsed into HTML
2. Function values (`${() => signal()}`) become reactive markers
3. Comment nodes (`<!--signal-->`) are replaced with live text nodes
4. Effects auto-update text when signals change

#### Static Values

Non-function values are rendered once:

```js
html`<div class="${staticClass}">${staticText}</div>`
```

#### Reactive Values

Function values are tracked and re-rendered:

```js
html`<div>${() => count()}</div>`
```

### when

Conditional rendering helper:

```js
import { when } from './framework/index.js';

html`
    <div>
        ${when(isLoading, () => html`<spinner></spinner>`)},
        ${when(isLoaded, () => html`<content></content>`)},
    </div>
`
```

### repeat

List rendering helper:

```js
import { repeat } from './framework/index.js';

html`
    <ul>
        ${repeat(items, item => item.id, (item, i) => html`
            <li>${item.name}</li>
        `)}
    </ul>
`
```

## Error System (`core/errors.js`)

### Error Hierarchy

```
AppError
  +-- SignalError      -- signal/computed/effect errors
  +-- ComponentError   -- component lifecycle errors
  +-- RpcError         -- RPC call errors
  +-- TemplateError    -- template rendering errors
```

### AppError Properties

```js
{
    error: true,
    code: 'SIGNAL',
    message: 'Signal setter failed',
    source: 'signals',
    level: 3,              // ErrorLevels.ERROR
    timestamp: 1719657600000,
    stack: '...'
}
```

### Logging

```js
import { logError, getErrorLog, clearErrorLog } from './core/errors.js';

logError(new AppError('something broke', { code: 'CUSTOM' }));
const errors = getErrorLog(); // array of AppError
clearErrorLog(); // clear the log
```

Log is capped at 500 entries (ring buffer).

### Window Errors

```js
import { onError } from './core/errors.js';

const removeHandler = onError((error) => {
    // called on uncaught errors and unhandled rejections
});
removeHandler(); // stop listening
```

### Error Levels

```js
import { ErrorLevels } from './core/errors.js';

ErrorLevels.DEBUG    // 0
ErrorLevels.INFO     // 1
ErrorLevels.WARN     // 2
ErrorLevels.ERROR    // 3
ErrorLevels.CRITICAL // 4
```

## RPC Client (`core/rpc.js`)

```js
import { rpc } from './core/rpc.js';

// Call a backend method
const result = await rpc.call('ping');
const info = await rpc.call('getSystemInfo');

// Pending call count
rpc.getPendingCount();

// Cancel all pending calls
rpc.cancelAll();
```

Features:
- 10-second timeout per call
- Structured error types (`RpcError`)
- Pending call tracking
- Error logging

## Plugin Manager (`core/plugin-manager.js`)

```js
import { PluginManager } from './core/plugin-manager.js';

// Register a plugin
PluginManager.register('dashboard', {
    name: 'Dashboard',
    render: () => html`<div>Dashboard content</div>`
});

// Get plugins
const plugins = PluginManager.getPlugins();
const plugin = PluginManager.getPlugin('dashboard');

// Check existence
PluginManager.hasPlugin('dashboard');

// Unregister
PluginManager.unregister('dashboard');

// Clear all
PluginManager.clear();
```

Validates: name is string, config is object, render is function, no duplicates.

## Building

```bash
cd frontend
bun install
bun run build.js
```

Output: `dist/bundle.js` and `dist/index.html`.

## Testing

```bash
cd frontend
bun test.js
```

Currently 37 tests covering signals, effects, computed, batch, untrack, error handling.
