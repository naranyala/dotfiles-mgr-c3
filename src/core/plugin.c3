module core::plugin;

alias InitFn = fn int(void*);
alias StartFn = fn void(void*);
import cjson;
import libc;
import core::errors;

// Plugin lifecycle states
const int PLUGIN_STATE_UNLOADED = 0;
const int PLUGIN_STATE_LOADED = 1;
const int PLUGIN_STATE_ACTIVE = 2;
const int PLUGIN_STATE_ERROR = 3;

// Plugin type
const int PLUGIN_TYPE_NATIVE = 0;
const int PLUGIN_TYPE_EXTERNAL = 1;

// Plugin manifest
struct PluginManifest {
    char* id;
    char* name;
    char* version;
    char* description;
    char* author;
    int type;
    char*[16] dependencies;
    int dep_count;
}

// Plugin lifecycle hooks
struct PluginHooks {
    InitFn init;       // called on load, receives config
    StartFn start;    // called when plugin becomes active
    StartFn stop;     // called when plugin is paused
    StartFn destroy;  // called on unload
}

// Plugin instance
struct Plugin {
    PluginManifest manifest;
    PluginHooks hooks;
    void* state;
    int plugin_state;
    bool enabled;
}

// Plugin registry
struct PluginRegistry {
    Plugin[64] plugins;
    int count;
}

PluginRegistry global_plugins;

// Event system
struct PluginEvent {
    char* topic;
    char* sender;
    char* data;
}

alias PluginEventHandler = fn void(PluginEvent*);

struct EventSubscription {
    char* topic;
    PluginEventHandler handler;
    char* plugin_id;
}

struct EventRegistry {
    EventSubscription[256] subscriptions;
    int count;
}

EventRegistry global_events;

fn void init() {
    global_plugins.count = 0;
    global_events.count = 0;
}

// Register a native plugin
fn int register_native(char* id, char* name, char* version, PluginHooks hooks) {
    if (global_plugins.count >= 64) {
        errors::error_push(errors::ERR_REGISTRY_FULL, "Plugin registry full", "plugin::register");
        return errors::ERR_REGISTRY_FULL;
    }

    // Check for duplicate
    for (int i = 0; i < global_plugins.count; i++) {
        if (global_plugins.plugins[i].manifest.id != null &&
            libc::strcmp((ZString)id, (ZString)global_plugins.plugins[i].manifest.id) == 0) {
            errors::error_push(errors::ERR_PLUGIN, "Plugin already registered", "plugin::register");
            return errors::ERR_PLUGIN;
        }
    }

    Plugin* p = &global_plugins.plugins[global_plugins.count];
    p.manifest.id = id;
    p.manifest.name = name;
    p.manifest.version = version;
    p.manifest.type = PLUGIN_TYPE_NATIVE;
    p.hooks = hooks;
    p.plugin_state = PLUGIN_STATE_LOADED;
    p.enabled = true;
    global_plugins.count++;

    return errors::ERR_OK;
}

// Register with full manifest
fn int register_full(PluginManifest manifest, PluginHooks hooks) {
    if (global_plugins.count >= 64) {
        errors::error_push(errors::ERR_REGISTRY_FULL, "Plugin registry full", "plugin::register");
        return errors::ERR_REGISTRY_FULL;
    }

    for (int i = 0; i < global_plugins.count; i++) {
        if (global_plugins.plugins[i].manifest.id != null &&
            libc::strcmp((ZString)manifest.id, (ZString)global_plugins.plugins[i].manifest.id) == 0) {
            errors::error_push(errors::ERR_PLUGIN, "Plugin already registered", "plugin::register");
            return errors::ERR_PLUGIN;
        }
    }

    Plugin* p = &global_plugins.plugins[global_plugins.count];
    p.manifest = manifest;
    p.hooks = hooks;
    p.plugin_state = PLUGIN_STATE_LOADED;
    p.enabled = true;
    global_plugins.count++;

    return errors::ERR_OK;
}

// Initialize all loaded plugins
fn int init_all() {
    for (int i = 0; i < global_plugins.count; i++) {
        Plugin* p = &global_plugins.plugins[i];
        if (p.plugin_state == PLUGIN_STATE_LOADED && p.enabled) {
            if (p.hooks.init != null) {
                int rc = p.hooks.init(p.state);
                if (rc != errors::ERR_OK) {
                    p.plugin_state = PLUGIN_STATE_ERROR;
                    errors::error_push(errors::ERR_PLUGIN, "Plugin init failed", p.manifest.id);
                    return rc;
                }
            }
            p.plugin_state = PLUGIN_STATE_ACTIVE;
        }
    }
    return errors::ERR_OK;
}

// Start all active plugins
fn void start_all() {
    for (int i = 0; i < global_plugins.count; i++) {
        Plugin* p = &global_plugins.plugins[i];
        if (p.plugin_state == PLUGIN_STATE_ACTIVE && p.hooks.start != null) {
            p.hooks.start(p.state);
        }
    }
}

// Stop all active plugins
fn void stop_all() {
    for (int i = global_plugins.count; i >= 0; i--) {
        Plugin* p = &global_plugins.plugins[i];
        if (p.plugin_state == PLUGIN_STATE_ACTIVE && p.hooks.stop != null) {
            p.hooks.stop(p.state);
        }
    }
}

// Destroy all plugins
fn void destroy_all() {
    for (int i = global_plugins.count; i >= 0; i--) {
        Plugin* p = &global_plugins.plugins[i];
        if (p.hooks.destroy != null) {
            p.hooks.destroy(p.state);
        }
        p.plugin_state = PLUGIN_STATE_UNLOADED;
    }
    global_plugins.count = 0;
}

// Get plugin by id
fn Plugin* get_plugin(char* id) {
    for (int i = 0; i < global_plugins.count; i++) {
        if (global_plugins.plugins[i].manifest.id != null &&
            libc::strcmp((ZString)id, (ZString)global_plugins.plugins[i].manifest.id) == 0) {
            return &global_plugins.plugins[i];
        }
    }
    return null;
}

// Check if plugin is active
fn bool is_active(char* id) {
    Plugin* p = get_plugin(id);
    return p != null && p.plugin_state == PLUGIN_STATE_ACTIVE;
}

// Get plugin count
fn int get_count() {
    return global_plugins.count;
}

// --- Event System ---

// Subscribe to a topic
fn int subscribe(char* topic, PluginEventHandler handler, char* plugin_id) {
    if (global_events.count >= 256) {
        return errors::ERR_REGISTRY_FULL;
    }

    EventSubscription* sub = &global_events.subscriptions[global_events.count];
    sub.topic = topic;
    sub.handler = handler;
    sub.plugin_id = plugin_id;
    global_events.count++;

    return errors::ERR_OK;
}

// Unsubscribe from a topic
fn void unsubscribe(char* topic, char* plugin_id) {
    for (int i = global_events.count - 1; i >= 0; i--) {
        EventSubscription* sub = &global_events.subscriptions[i];
        if (libc::strcmp((ZString)topic, (ZString)sub.topic) == 0 &&
            libc::strcmp((ZString)plugin_id, (ZString)sub.plugin_id) == 0) {
            // Shift remaining subscriptions
            for (int j = i; j < global_events.count - 1; j++) {
                global_events.subscriptions[j] = global_events.subscriptions[j + 1];
            }
            global_events.count--;
        }
    }
}

// Emit an event
fn void emit(char* topic, char* sender, char* data) {
    for (int i = 0; i < global_events.count; i++) {
        EventSubscription* sub = &global_events.subscriptions[i];
        if (libc::strcmp((ZString)topic, (ZString)sub.topic) == 0) {
            PluginEvent event;
            event.topic = topic;
            event.sender = sender;
            event.data = data;
            sub.handler(&event);
        }
    }
}

// Emit to JSON (for RPC)
fn void emit_json(char* topic, char* sender, cjson::CJson data) {
    char* json_str = cjson::cJSON_PrintUnformatted(data);
    emit(topic, sender, json_str);
    libc::free(json_str);
}
