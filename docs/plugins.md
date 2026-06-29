# Plugin System

## Overview

The application uses a plugin architecture on both backend (C3) and frontend (JS). The system supports:

- **Native plugins** -- built into the application
- **External plugins** -- third-party integrations (APIs, services)
- **Lifecycle hooks** -- init, start, stop, destroy
- **Event system** -- inter-plugin communication via pub/sub
- **Namespaced RPC** -- methods registered per plugin
- **Dependency management** -- declare plugin dependencies

## Architecture

```
+-------------------+     +-------------------+
|  Backend Plugins  |     |  Frontend Plugins |
|  (C3 modules)     |     |  (JS classes)     |
+-------------------+     +-------------------+
         |                         |
         v                         v
+-------------------+     +-------------------+
|  Plugin Registry  |     |  Plugin System    |
|  + Event System   |     |  + Event Bus      |
+-------------------+     +-------------------+
         |                         |
         v                         v
+-------------------+     +-------------------+
|  RPC Dispatcher   |<--->|  RPC Client       |
+-------------------+     +-------------------+
```

## Backend Plugin System

### Plugin Structure

Each plugin has:

1. **Manifest** -- id, name, version, description, type, dependencies
2. **Lifecycle hooks** -- init, start, stop, destroy
3. **State** -- unloaded, loaded, active, error

### Registration

```c3
import core::plugin;

fn int my_init(void* config) {
    return core::rpc::register("myMethod", &handler);
}

fn int main() {
    plugin::PluginHooks hooks;
    hooks.init = &my_init;
    hooks.start = null;
    hooks.stop = null;
    hooks.destroy = null;

    plugin::register_native("myplugin", "My Plugin", "1.0.0", hooks);
    plugin::init_all();
    // ...
}
```

### Lifecycle

```
register_native() --> LOADED
init_all()        --> ACTIVE (calls init hook)
start_all()       --> calls start hook
stop_all()        --> calls stop hook
destroy_all()     --> calls destroy hook, UNLOADED
```

### Event System

Subscribe to events:
```c3
fn void handler(plugin::PluginEvent* event) {
    // event->topic, event->sender, event->data
}

plugin::subscribe("config.updated", &handler, "myplugin");
```

Emit events:
```c3
plugin::emit("weather.updated", "weather", json_data);
```

### Namespaced RPC

Methods can be namespaced to a plugin:
```c3
core::rpc::register_namespaced("weather.fetch", &handler, "weather");
```

Unregister all methods for a plugin:
```c3
core::rpc::unregister_plugin("weather");
```

## Frontend Plugin System

### Plugin Base Class

```js
import { Plugin, PluginManifest, PluginSystem } from '../core/plugin-system.js';

const manifest = new PluginManifest({
    id: 'myplugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Does something useful',
    type: 'native',
    dependencies: []
});

class MyPlugin extends Plugin {
    async onLoad(config, context) {
        // Called when plugin is loaded
        this.on('some.event', (e) => { /* handle */ });
    }

    async onStart() {
        // Called when plugin becomes active
    }

    async onStop() {
        // Called when plugin is paused
    }

    async onUnload() {
        // Called when plugin is removed
    }
}

PluginSystem.register(manifest, MyPlugin);
```

### Plugin Lifecycle

```
register()    --> registered
load()        --> LOADED, ACTIVE
stop()        --> LOADED
unload()      --> UNLOADED
```

### Plugin Context

Plugins receive a context object with shared state:
```js
await PluginSystem.load('myplugin', { app: 'dotfiles-mgr', theme: 'dark' });
```

### Event Bus

```js
import { eventBus } from '../core/plugin-system.js';

// Subscribe
eventBus.on('config.updated', (event) => {
    console.log(event.data);
}, 'myplugin-id');

// Emit
eventBus.emit('weather.updated', { temp: 25 }, 'weather');

// Unsubscribe
eventBus.off('config.updated', 'myplugin-id');
```

### Helpers in Plugin Base Class

```js
// Emit event from plugin
this.emit('data.updated', { items: [...] });

// Subscribe to event
this.on('config.changed', handler);

// Call backend RPC
const result = await this.rpc('weather.fetch', { city: 'London' });
```

## Example: External Integration (Weather)

### Frontend Plugin

```js
class WeatherPlugin extends Plugin {
    #data = createSignal(null);

    async onLoad(config) {
        // config has apiKey, city, units from settings
    }

    async fetchWeather() {
        const data = await this.rpc('weather.fetch', {
            apiKey: this.config.apiKey,
            city: this.config.city
        });
        this.#data[1](data);
        this.emit('weather.updated', data);
    }

    getData() { return this.#data[0](); }
}

PluginSystem.register(
    new PluginManifest({ id: 'weather', name: 'Weather', type: 'external' }),
    WeatherPlugin
);
```

### Backend Handler

```c3
fn void handle_weather_fetch(webview::Webview w, char* id, cjson::CJson args) {
    // Parse args, call API, return result
    cjson::CJson result = cjson::cJSON_CreateObject();
    cjson::CJson_AddNumberToObject(result, "temp", 25.0);
    char* json = cjson::cJSON_PrintUnformatted(result);
    webview::webview_return(w, id, 0, json);
    cjson::cJSON_Delete(result);
    libc::free(json);
}
```

## Existing Plugins

### Backend

| Plugin | ID | Methods |
|--------|----|---------| 
| Ping | `ping` | `ping` |
| System | `system` | `getSystemInfo` |
| Dotfiles | `dotfiles` | `dotfiles.list` |

### Frontend

| Plugin | ID | Type | Description |
|--------|----|------|-------------|
| Dashboard | `dashboard` | legacy | Counter, batch demo, RPC test |
| Dotfiles | `Dotfiles` | legacy | Config file browser |
| Weather | `weather` | new | Weather widget (external API) |
| Settings | `settings` | new | App and plugin configuration |

## Creating a New Plugin

### Backend (C3)

1. Create `src/plugins/yourplugin.c3`
2. Implement handler functions
3. Register with `core::rpc::register()` in init hook
4. Add to `main.c3` plugin registration

### Frontend (JS)

1. Create `frontend/src/plugins/yourplugin.js`
2. Extend `Plugin` class
3. Register with `PluginSystem.register()`
4. Import in `frontend/src/index.js`

### External Integration

1. Create plugin with `type: 'external'`
2. Store API keys in settings plugin
3. Call external API via backend or frontend fetch
4. Emit events when data changes
5. Other plugins can subscribe to updates

## Plugin Configuration

Plugins can read/write settings via the settings plugin:

```js
// Read setting
const apiKey = PluginSystem.get('settings')?.getSetting('weather.apiKey');

// Write setting (triggers config.updated event)
PluginSystem.get('settings')?.updateSetting('weather.apiKey', 'abc123');
```

## Inter-Plugin Communication

Plugins communicate through the event bus:

```js
// Plugin A emits
this.emit('data.loaded', { items: [...] });

// Plugin B subscribes
this.on('data.loaded', (event) => {
    console.log(event.data.items);
});
```

## Legacy Plugin Manager

For simple UI-only plugins, the legacy `PluginManager` is still available:

```js
PluginManager.register('MyUI', {
    name: 'My UI',
    icon: '🔧',
    render: () => html`<div>Content</div>`
});
```

This integrates with the sidebar navigation without requiring the full plugin lifecycle.
