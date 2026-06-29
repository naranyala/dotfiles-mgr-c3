import { AppError, logError } from './errors.js';

// Plugin states
export const PluginState = {
    UNLOADED: 'unloaded',
    LOADED: 'loaded',
    ACTIVE: 'active',
    ERROR: 'error',
    DISABLED: 'disabled'
};

// Plugin types
export const PluginType = {
    NATIVE: 'native',
    EXTERNAL: 'external'
};

// Event bus for inter-plugin communication
class EventBus {
    #subscribers = new Map();

    on(topic, handler, pluginId) {
        if (!this.#subscribers.has(topic)) {
            this.#subscribers.set(topic, []);
        }
        this.#subscribers.get(topic).push({ handler, pluginId });
    }

    off(topic, pluginId) {
        const subs = this.#subscribers.get(topic);
        if (!subs) return;
        const idx = subs.findIndex(s => s.pluginId === pluginId);
        if (idx !== -1) subs.splice(idx, 1);
    }

    emit(topic, data, sender) {
        const subs = this.#subscribers.get(topic) || [];
        for (const sub of subs) {
            try {
                sub.handler({ topic, data, sender });
            } catch (err) {
                logError(new AppError(`Event handler error on "${topic}"`, {
                    code: 'PLUGIN',
                    source: sub.pluginId || 'unknown'
                }));
            }
        }
    }

    clear() {
        this.#subscribers.clear();
    }
}

export const eventBus = new EventBus();

// Plugin base class
export class Plugin {
    #state = PluginState.UNLOADED;
    #config = null;
    #context = null;

    constructor(manifest) {
        this.manifest = manifest;
    }

    get state() { return this.#state; }
    get config() { return this.#config; }
    get context() { return this.#context; }
    get isActive() { return this.#state === PluginState.ACTIVE; }

    // Lifecycle hooks (override in subclass)
    async onLoad(config, context) {}
    async onStart() {}
    async onStop() {}
    async onUnload() {}

    // Lifecycle management (called by PluginSystem)
    async _load(config, context) {
        this.#state = PluginState.LOADED;
        this.#config = config;
        this.#context = context;
        try {
            await this.onLoad(config, context);
        } catch (err) {
            this.#state = PluginState.ERROR;
            throw err;
        }
    }

    async _start() {
        if (this.#state !== PluginState.LOADED) return;
        this.#state = PluginState.ACTIVE;
        try {
            await this.onStart();
        } catch (err) {
            this.#state = PluginState.ERROR;
            throw err;
        }
    }

    async _stop() {
        if (this.#state !== PluginState.ACTIVE) return;
        try {
            await this.onStop();
        } catch (err) {
            logError(new AppError(`Plugin stop error: ${this.manifest.id}`, {
                code: 'PLUGIN',
                source: this.manifest.id
            }));
        }
        this.#state = PluginState.LOADED;
    }

    async _unload() {
        try {
            await this.onUnload();
        } catch (err) {
            logError(new AppError(`Plugin unload error: ${this.manifest.id}`, {
                code: 'PLUGIN',
                source: this.manifest.id
            }));
        }
        this.#state = PluginState.UNLOADED;
        this.#config = null;
        this.#context = null;
    }

    // Helper: emit event
    emit(topic, data) {
        eventBus.emit(topic, data, this.manifest.id);
    }

    // Helper: subscribe to event
    on(topic, handler) {
        eventBus.on(topic, handler, this.manifest.id);
    }

    // Helper: call backend RPC
    async rpc(method, ...args) {
        if (!window.backendRPC) {
            throw new AppError('Backend RPC not available', { code: 'RPC' });
        }
        return await window.backendRPC([method, ...args]);
    }
}

// Plugin manifest
export class PluginManifest {
    constructor({
        id,
        name,
        version = '0.0.1',
        description = '',
        author = '',
        type = PluginType.NATIVE,
        dependencies = [],
        config = {}
    }) {
        this.id = id;
        this.name = name;
        this.version = version;
        this.description = description;
        this.author = author;
        this.type = type;
        this.dependencies = dependencies;
        this.config = config;
    }
}

// Plugin system
class PluginSystemImpl {
    #plugins = new Map();
    #configs = new Map();
    #initialized = false;

    async init(pluginConfigs = {}) {
        if (this.#initialized) return;
        this.#configs = new Map(Object.entries(pluginConfigs));
        this.#initialized = true;
    }

    // Register a plugin class
    register(manifest, PluginClass) {
        if (this.#plugins.has(manifest.id)) {
            logError(new AppError(`Plugin "${manifest.id}" already registered`, {
                code: 'PLUGIN',
                source: 'plugin-system'
            }));
            return false;
        }

        this.#plugins.set(manifest.id, {
            manifest,
            PluginClass,
            instance: null
        });

        return true;
    }

    // Load and start a plugin
    async load(pluginId, context = {}) {
        const entry = this.#plugins.get(pluginId);
        if (!entry) {
            logError(new AppError(`Plugin "${pluginId}" not found`, {
                code: 'PLUGIN',
                source: 'plugin-system'
            }));
            return false;
        }

        if (entry.instance) return true;

        // Check dependencies
        for (const dep of entry.manifest.dependencies) {
            if (!this.#plugins.has(dep)) {
                logError(new AppError(`Plugin "${pluginId}" depends on "${dep}" which is not registered`, {
                    code: 'PLUGIN',
                    source: 'plugin-system'
                }));
                return false;
            }
        }

        const config = this.#configs.get(pluginId) || entry.manifest.config;

        try {
            entry.instance = new entry.PluginClass(entry.manifest);
            await entry.instance._load(config, context);
            await entry.instance._start();
            eventBus.emit('plugin.loaded', { pluginId }, 'system');
            return true;
        } catch (err) {
            logError(new AppError(`Failed to load plugin "${pluginId}": ${err.message}`, {
                code: 'PLUGIN',
                source: 'plugin-system'
            }));
            entry.instance = null;
            return false;
        }
    }

    // Load all registered plugins
    async loadAll(context = {}) {
        const results = [];
        for (const [id] of this.#plugins) {
            results.push({ id, success: await this.load(id, context) });
        }
        return results;
    }

    // Stop a plugin
    async stop(pluginId) {
        const entry = this.#plugins.get(pluginId);
        if (!entry?.instance) return false;

        try {
            await entry.instance._stop();
            eventBus.emit('plugin.stopped', { pluginId }, 'system');
            return true;
        } catch (err) {
            logError(new AppError(`Failed to stop plugin "${pluginId}": ${err.message}`, {
                code: 'PLUGIN',
                source: 'plugin-system'
            }));
            return false;
        }
    }

    // Unload a plugin
    async unload(pluginId) {
        const entry = this.#plugins.get(pluginId);
        if (!entry?.instance) return false;

        try {
            await entry.instance._stop();
            await entry.instance._unload();
            entry.instance = null;
            eventBus.emit('plugin.unloaded', { pluginId }, 'system');
            return true;
        } catch (err) {
            logError(new AppError(`Failed to unload plugin "${pluginId}": ${err.message}`, {
                code: 'PLUGIN',
                source: 'plugin-system'
            }));
            return false;
        }
    }

    // Get plugin instance
    get(pluginId) {
        return this.#plugins.get(pluginId)?.instance || null;
    }

    // Get plugin manifest
    getManifest(pluginId) {
        return this.#plugins.get(pluginId)?.manifest || null;
    }

    // Get all loaded plugins
    getAll() {
        const result = [];
        for (const [id, entry] of this.#plugins) {
            result.push({
                id,
                manifest: entry.manifest,
                state: entry.instance?.state || PluginState.UNLOADED
            });
        }
        return result;
    }

    // Check if plugin is loaded
    has(pluginId) {
        return this.#plugins.has(pluginId);
    }

    // Check if plugin is active
    isActive(pluginId) {
        return this.#plugins.get(pluginId)?.instance?.isActive || false;
    }
}

export const PluginSystem = new PluginSystemImpl();

// Legacy compatibility: PluginManager for simple UI-only plugins
const legacyRegistry = new Map();

export const PluginManager = {
    register(name, config) {
        if (!name || typeof name !== 'string') {
            logError(new AppError('Plugin name must be a non-empty string', {
                code: 'PLUGIN',
                source: 'plugin-manager'
            }));
            return false;
        }

        if (legacyRegistry.has(name)) {
            logError(new AppError(`Plugin "${name}" already registered`, {
                code: 'PLUGIN',
                source: 'plugin-manager'
            }));
            return false;
        }

        if (!config || typeof config !== 'object') {
            logError(new AppError(`Plugin "${name}" config must be an object`, {
                code: 'PLUGIN',
                source: 'plugin-manager'
            }));
            return false;
        }

        if (typeof config.render !== 'function') {
            logError(new AppError(`Plugin "${name}" must have a render function`, {
                code: 'PLUGIN',
                source: 'plugin-manager'
            }));
            return false;
        }

        legacyRegistry.set(name, { ...config, name, registeredAt: Date.now() });
        eventBus.emit('plugin.registered', { name, type: 'legacy' }, 'system');
        return true;
    },

    getPlugin(name) {
        return legacyRegistry.get(name) || null;
    },

    getPlugins() {
        return Array.from(legacyRegistry.values());
    },

    hasPlugin(name) {
        return legacyRegistry.has(name);
    },

    unregister(name) {
        if (!legacyRegistry.has(name)) {
            logError(new AppError(`Plugin "${name}" not found`, {
                code: 'PLUGIN',
                source: 'plugin-manager'
            }));
            return false;
        }
        legacyRegistry.delete(name);
        eventBus.emit('plugin.unregistered', { name, type: 'legacy' }, 'system');
        return true;
    },

    clear() {
        legacyRegistry.clear();
    }
};
