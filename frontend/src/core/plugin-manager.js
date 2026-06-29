import { AppError, logError } from './errors.js';

const registry = new Map();

export const PluginManager = {
    register(name, config) {
        if (!name || typeof name !== 'string') {
            logError(new AppError('Plugin name must be a non-empty string', {
                code: 'PLUGIN',
                source: 'plugin-manager'
            }));
            return false;
        }

        if (registry.has(name)) {
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

        registry.set(name, { ...config, name, registeredAt: Date.now() });
        return true;
    },

    getPlugin(name) {
        return registry.get(name) || null;
    },

    getPlugins() {
        return Array.from(registry.values());
    },

    hasPlugin(name) {
        return registry.has(name);
    },

    unregister(name) {
        if (!registry.has(name)) {
            logError(new AppError(`Plugin "${name}" not found`, {
                code: 'PLUGIN',
                source: 'plugin-manager'
            }));
            return false;
        }
        registry.delete(name);
        return true;
    },

    clear() {
        registry.clear();
    }
};
