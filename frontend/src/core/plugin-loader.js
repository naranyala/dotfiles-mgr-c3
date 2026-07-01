/**
 * Plugin Loader - Manages frontend plugins for the dotfiles-mgr application
 * 
 * Features:
 * - Dynamic plugin loading and unloading
 * - Plugin lifecycle management (init, start, stop, destroy)
 * - Dependency management between plugins
 * - Plugin metadata and versioning
 * - Error handling and isolation
 */

import { ReactiveComponent, html, signal, effect } from './index.js'
import { eventBus } from './event-bus.js'
import { utils } from './utils.js'

/**
 * Plugin states
 */
export const PluginState = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  LOADED: 'loaded',
  INITIALIZED: 'initialized',
  ACTIVE: 'active',
  ERROR: 'error',
  DISABLED: 'disabled'
}

/**
 * Plugin manifest structure
 * @typedef {object} PluginManifest
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Human-readable plugin name
 * @property {string} version - Plugin version (semver)
 * @property {string} description - Plugin description
 * @property {string} author - Plugin author
 * @property {string[]} [dependencies] - Plugin dependencies
 * @property {string[]} [optionalDependencies] - Optional plugin dependencies
 * @property {object} [config] - Default plugin configuration
 * @property {object} [metadata] - Additional plugin metadata
 */

/**
 * Plugin instance structure
 * @typedef {object} PluginInstance
 * @property {PluginManifest} manifest - Plugin manifest
 * @property {string} state - Current plugin state
 * @property {object} config - Plugin configuration
 * @property {object} context - Plugin context (RPC, eventBus, etc.)
 * @property {object} exports - Plugin exports
 * @property {Error} [error] - Error if plugin is in error state
 * @property {Function} [cleanup] - Cleanup function
 */

/**
 * Plugin lifecycle hooks
 * @typedef {object} PluginHooks
 * @property {Function} [init] - Called when plugin is loaded
 * @property {Function} [start] - Called when plugin is activated
 * @property {Function} [stop] - Called when plugin is deactivated
 * @property {Function} [destroy] - Called when plugin is unloaded
 */

/**
 * Plugin Loader class
 */
export class PluginLoader {
  constructor(options = {}) {
    this.plugins = new Map() // Map<id, PluginInstance>
    this.registry = new Map() // Map<id, PluginManifest>
    this.loadingQueue = []
    this.options = {
      autoStart: true,
      ...options
    }
    
    // Create plugin context
    this.context = this._createContext()
    
    // Set up event bus for plugin events
    this.events = eventBus.scope('plugins')
    
    this._log('PluginLoader initialized')
  }

  _log(message, ...args) {
    if (this.options.debug) {
      console.log(`[PluginLoader] ${message}`, ...args)
    }
  }

  /**
   * Create the plugin context object that is passed to all plugins
   */
  _createContext() {
    return {
      // RPC access
      rpc: window.rpc || {},
      
      // Event bus access
      eventBus: eventBus,
      
      // Utility functions
      utils: utils,
      
      // Plugin registry (read-only)
      plugins: {
        get: (id) => this.getPlugin(id),
        list: () => this.listPlugins(),
        has: (id) => this.hasPlugin(id)
      },
      
      // Configuration
      config: {
        get: (key, defaultValue) => this.getConfig(key, defaultValue),
        set: (key, value) => this.setConfig(key, value)
      }
    }
  }

  /**
   * Register a plugin manifest
   * @param {PluginManifest} manifest - Plugin manifest
   */
  registerManifest(manifest) {
    if (!manifest || !manifest.id) {
      throw new Error('Plugin manifest must have an id')
    }
    
    if (this.registry.has(manifest.id)) {
      console.warn(`Plugin "${manifest.id}" is already registered`)
      return
    }
    
    this.registry.set(manifest.id, manifest)
    this._log(`Registered plugin: ${manifest.id}@${manifest.version}`)
  }

  /**
   * Load a plugin by ID
   * @param {string} id - Plugin ID
   * @param {object} [options] - Load options
   * @param {object} [options.config] - Plugin configuration
   * @param {boolean} [options.autoStart=true] - Auto-start after loading
   * @returns {Promise<PluginInstance>} Plugin instance
   */
  async load(id, options = {}) {
    const { config = {}, autoStart = this.options.autoStart } = options
    
    // Check if already loaded
    if (this.plugins.has(id)) {
      const plugin = this.plugins.get(id)
      if (plugin.state === PluginState.ERROR) {
        throw new Error(`Plugin "${id}" is in error state: ${plugin.error?.message}`)
      }
      this._log(`Plugin "${id}" already loaded`)
      return plugin
    }
    
    // Check if registered
    const manifest = this.registry.get(id)
    if (!manifest) {
      throw new Error(`Plugin "${id}" not found in registry`)
    }
    
    // Check dependencies
    if (manifest.dependencies) {
      for (const depId of manifest.dependencies) {
        if (!this.plugins.has(depId) && !this.registry.has(depId)) {
          throw new Error(`Plugin "${id}" dependency "${depId}" not found`)
        }
      }
    }
    
    // Create plugin instance
    const instance = {
      manifest,
      state: PluginState.LOADING,
      config: { ...manifest.config, ...config },
      context: this.context,
      exports: {},
      cleanup: null
    }
    
    this.plugins.set(id, instance)
    
    try {
      // Load the plugin module
      this._log(`Loading plugin: ${id}`)
      
      // Check if plugin has a dedicated module
      let module
      try {
        module = await this._importPluginModule(id)
      } catch (error) {
        // Plugin might not have a module, which is okay
        this._log(`No module found for plugin: ${id}`)
      }
      
      // Merge exports from module
      if (module && module.default) {
        instance.exports = { ...module.default }
      } else if (module) {
        instance.exports = { ...module }
      }
      
      // Check for lifecycle hooks
      const hooks = this._extractHooks(instance.exports)
      
      // Call init hook if present
      if (hooks.init) {
        this._log(`Initializing plugin: ${id}`)
        await hooks.init(instance.context, instance.config)
      }
      
      instance.state = PluginState.LOADED
      this._log(`Plugin "${id}" loaded successfully`)
      
      // Auto-start if enabled
      if (autoStart) {
        await this.start(id)
      }
      
      // Emit plugin loaded event
      this.events.emit('loaded', { id, plugin: instance })
      
      return instance
    } catch (error) {
      instance.state = PluginState.ERROR
      instance.error = error
      this._log(`Error loading plugin "${id}":`, error)
      
      // Emit plugin error event
      this.events.emit('error', { id, error })
      
      throw error
    }
  }

  /**
   * Import a plugin module dynamically
   */
  async _importPluginModule(id) {
    // Try to import from /plugins/{id}/index.js
    const pluginPath = `/src/plugins/${id}/index.js`
    const fullPath = new URL(pluginPath, window.location.origin).toString()
    
    try {
      // Dynamic import using native import()
      return await import(/* @vite-ignore */ pluginPath)
    } catch (error) {
      // Try with .js extension explicitly
      try {
        return await import(/* @vite-ignore */ `${pluginPath}?t=${Date.now()}`)
      } catch {
        // Module not found, return null
        return null
      }
    }
  }

  /**
   * Extract lifecycle hooks from plugin exports
   */
  _extractHooks(exports) {
    return {
      init: exports.init || exports.initialize || null,
      start: exports.start || exports.activate || null,
      stop: exports.stop || exports.deactivate || null,
      destroy: exports.destroy || exports.cleanup || null
    }
  }

  /**
   * Start a loaded plugin
   * @param {string} id - Plugin ID
   */
  async start(id) {
    const instance = this.plugins.get(id)
    if (!instance) {
      throw new Error(`Plugin "${id}" not found`)
    }
    
    if (instance.state === PluginState.ACTIVE) {
      this._log(`Plugin "${id}" already active`)
      return instance
    }
    
    if (instance.state !== PluginState.LOADED) {
      throw new Error(`Plugin "${id}" must be loaded before starting (current state: ${instance.state})`)
    }
    
    try {
      const hooks = this._extractHooks(instance.exports)
      
      if (hooks.start) {
        this._log(`Starting plugin: ${id}`)
        await hooks.start(instance.context, instance.config)
      }
      
      instance.state = PluginState.ACTIVE
      this._log(`Plugin "${id}" started`)
      
      // Emit plugin started event
      this.events.emit('started', { id, plugin: instance })
      
      return instance
    } catch (error) {
      instance.state = PluginState.ERROR
      instance.error = error
      
      // Emit plugin error event
      this.events.emit('error', { id, error })
      
      throw error
    }
  }

  /**
   * Stop an active plugin
   * @param {string} id - Plugin ID
   */
  async stop(id) {
    const instance = this.plugins.get(id)
    if (!instance) {
      throw new Error(`Plugin "${id}" not found`)
    }
    
    if (instance.state !== PluginState.ACTIVE) {
      this._log(`Plugin "${id}" not active (state: ${instance.state})`)
      return instance
    }
    
    try {
      const hooks = this._extractHooks(instance.exports)
      
      if (hooks.stop) {
        this._log(`Stopping plugin: ${id}`)
        await hooks.stop(instance.context, instance.config)
      }
      
      instance.state = PluginState.LOADED
      this._log(`Plugin "${id}" stopped`)
      
      // Emit plugin stopped event
      this.events.emit('stopped', { id, plugin: instance })
      
      return instance
    } catch (error) {
      instance.state = PluginState.ERROR
      instance.error = error
      
      // Emit plugin error event
      this.events.emit('error', { id, error })
      
      throw error
    }
  }

  /**
   * Unload a plugin
   * @param {string} id - Plugin ID
   */
  async unload(id) {
    const instance = this.plugins.get(id)
    if (!instance) {
      this._log(`Plugin "${id}" not found, skipping unload`)
      return
    }
    
    try {
      // Stop if active
      if (instance.state === PluginState.ACTIVE) {
        await this.stop(id)
      }
      
      // Call destroy hook if present
      const hooks = this._extractHooks(instance.exports)
      if (hooks.destroy) {
        this._log(`Destroying plugin: ${id}`)
        await hooks.destroy(instance.context, instance.config)
      }
      
      // Call cleanup function if present
      if (instance.cleanup) {
        instance.cleanup()
      }
      
      this.plugins.delete(id)
      this._log(`Plugin "${id}" unloaded`)
      
      // Emit plugin unloaded event
      this.events.emit('unloaded', { id })
    } catch (error) {
      this._log(`Error unloading plugin "${id}":`, error)
    }
  }

  /**
   * Disable a plugin (prevents loading)
   * @param {string} id - Plugin ID
   */
  disable(id) {
    const instance = this.plugins.get(id)
    if (instance) {
      instance.state = PluginState.DISABLED
      this._log(`Plugin "${id}" disabled`)
    }
    
    // Also mark in registry
    const manifest = this.registry.get(id)
    if (manifest) {
      manifest.disabled = true
    }
  }

  /**
   * Enable a plugin
   * @param {string} id - Plugin ID
   */
  enable(id) {
    const instance = this.plugins.get(id)
    if (instance) {
      instance.state = PluginState.LOADED
      this._log(`Plugin "${id}" enabled`)
    }
    
    const manifest = this.registry.get(id)
    if (manifest) {
      manifest.disabled = false
    }
  }

  /**
   * Check if a plugin is loaded
   * @param {string} id - Plugin ID
   * @returns {boolean}
   */
  hasPlugin(id) {
    return this.plugins.has(id)
  }

  /**
   * Check if a plugin is registered
   * @param {string} id - Plugin ID
   * @returns {boolean}
   */
  isRegistered(id) {
    return this.registry.has(id)
  }

  /**
   * Check if a plugin is active
   * @param {string} id - Plugin ID
   * @returns {boolean}
   */
  isActive(id) {
    const instance = this.plugins.get(id)
    return instance?.state === PluginState.ACTIVE
  }

  /**
   * Get a plugin instance
   * @param {string} id - Plugin ID
   * @returns {PluginInstance|undefined}
   */
  getPlugin(id) {
    return this.plugins.get(id)
  }

  /**
   * Get all plugin instances
   * @returns {PluginInstance[]}
   */
  getPlugins() {
    return [...this.plugins.values()]
  }

  /**
   * List all plugin IDs
   * @returns {string[]}
   */
  listPlugins() {
    return [...this.plugins.keys()]
  }

  /**
   * List all registered plugin manifests
   * @returns {PluginManifest[]}
   */
  listRegistered() {
    return [...this.registry.values()]
  }

  /**
   * Get plugin exports
   * @param {string} id - Plugin ID
   * @returns {object}
   */
  getExports(id) {
    const instance = this.plugins.get(id)
    return instance?.exports || {}
  }

  /**
   * Get plugin configuration
   * @param {string} id - Plugin ID
   * @returns {object}
   */
  getConfig(id) {
    const instance = this.plugins.get(id)
    return instance?.config || {}
  }

  /**
   * Set plugin configuration
   * @param {string} id - Plugin ID
   * @param {object} config - New configuration
   */
  setConfig(id, config) {
    const instance = this.plugins.get(id)
    if (instance) {
      instance.config = { ...instance.config, ...config }
      
      // Emit config changed event
      this.events.emit('config-changed', { id, config: instance.config })
    }
  }

  /**
   * Set global configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   */
  setGlobalConfig(key, value) {
    if (!this._globalConfig) {
      this._globalConfig = {}
    }
    this._globalConfig[key] = value
    
    // Emit global config changed event
    this.events.emit('global-config-changed', { key, value })
  }

  /**
   * Get global configuration value
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if not set
   * @returns {*}
   */
  getGlobalConfig(key, defaultValue) {
    return this._globalConfig?.[key] ?? defaultValue
  }

  /**
   * Load multiple plugins
   * @param {string[]} ids - Array of plugin IDs
   * @param {object} [options] - Load options
   */
  async loadAll(ids, options = {}) {
    const results = []
    const errors = []
    
    for (const id of ids) {
      try {
        const plugin = await this.load(id, options)
        results.push(plugin)
      } catch (error) {
        errors.push({ id, error })
      }
    }
    
    if (errors.length > 0) {
      throw new AggregateError(
        errors.map(e => e.error),
        `Failed to load ${errors.length} of ${ids.length} plugins`
      )
    }
    
    return results
  }

  /**
   * Unload all plugins
   */
  async unloadAll() {
    const ids = [...this.plugins.keys()]
    for (const id of ids) {
      await this.unload(id)
    }
  }

  /**
   * Start all loaded plugins
   */
  async startAll() {
    const results = []
    for (const [id, instance] of this.plugins) {
      if (instance.state === PluginState.LOADED) {
        try {
          const started = await this.start(id)
          results.push(started)
        } catch (error) {
          console.error(`Failed to start plugin "${id}":`, error)
        }
      }
    }
    return results
  }

  /**
   * Stop all active plugins
   */
  async stopAll() {
    const results = []
    for (const [id, instance] of this.plugins) {
      if (instance.state === PluginState.ACTIVE) {
        try {
          const stopped = await this.stop(id)
          results.push(stopped)
        } catch (error) {
          console.error(`Failed to stop plugin "${id}":`, error)
        }
      }
    }
    return results
  }

  /**
   * Get plugin state
   * @param {string} id - Plugin ID
   * @returns {string}
   */
  getState(id) {
    const instance = this.plugins.get(id)
    return instance?.state
  }

  /**
   * Check if plugin is in error state
   * @param {string} id - Plugin ID
   * @returns {boolean}
   */
  hasError(id) {
    const instance = this.plugins.get(id)
    return instance?.state === PluginState.ERROR
  }

  /**
   * Get plugin error
   * @param {string} id - Plugin ID
   * @returns {Error|undefined}
   */
  getError(id) {
    const instance = this.plugins.get(id)
    return instance?.error
  }

  /**
   * Clear all plugins and reset
   */
  clear() {
    this.plugins.clear()
    this.loadingQueue = []
    this._log('PluginLoader cleared')
  }

  /**
   * Register plugins from a manifest object
   * @param {object} manifests - Object with plugin manifests keyed by ID
   */
  registerFromObject(manifests) {
    for (const [id, manifest] of Object.entries(manifests)) {
      this.registerManifest({ id, ...manifest })
    }
  }

  /**
   * Auto-discover and register plugins from the filesystem
   * This scans the /src/plugins directory for plugin manifests
   */
  async autoDiscover() {
    this._log('Auto-discovering plugins...')
    
    // Try to load plugin index if it exists
    try {
      const response = await fetch('/src/plugins/index.js')
      if (response.ok) {
        const module = await response.text()
        // The plugin index should export manifests
        this._log('Found plugin index')
      }
    } catch {
      // No plugin index, try to discover manually
    }
    
    // For now, just register known plugin directories
    // In a real implementation, this would scan the filesystem
    this._log('Auto-discovery complete')
  }
}

// Default plugin loader instance
export const pluginLoader = new PluginLoader()

// Convenience functions
export const loadPlugin = pluginLoader.load.bind(pluginLoader)
export const startPlugin = pluginLoader.start.bind(pluginLoader)
export const stopPlugin = pluginLoader.stop.bind(pluginLoader)
export const unloadPlugin = pluginLoader.unload.bind(pluginLoader)
export const getPlugin = pluginLoader.getPlugin.bind(pluginLoader)
export const getPlugins = pluginLoader.getPlugins.bind(pluginLoader)

/**
 * Plugin component base class for React-like plugin components
 */
export class PluginComponent extends ReactiveComponent {
  constructor() {
    super()
    this.pluginId = null
    this.config = {}
  }

  /**
   * Set the plugin ID for this component
   */
  setPluginId(id) {
    this.pluginId = id
    this.config = pluginLoader.getConfig(id) || {}
  }

  /**
   * Get plugin configuration
   */
  getConfig(key, defaultValue) {
    return this.config[key] ?? defaultValue
  }

  /**
   * Emit a plugin event
   */
  emitEvent(event, data) {
    pluginLoader.events.emit(event, data, { source: this.pluginId })
  }
}

/**
 * Create a plugin component from a definition
 * @param {object} definition - Plugin component definition
 * @returns {CustomElementConstructor}
 */
export function createPluginComponent(definition) {
  return class extends PluginComponent {
    static get tagName() {
      return definition.tagName || `plugin-${definition.id}`
    }
    
    static get observedAttributes() {
      return definition.observedAttributes || []
    }
    
    constructor() {
      super()
      this.setPluginId(definition.id)
    }
    
    render() {
      if (definition.render) {
        return definition.render.call(this)
      }
      return html`<div>${definition.id} plugin</div>`
    }
  }
}

/**
 * Plugin manifest helper
 * Creates a complete manifest from a partial definition
 */
export function createPluginManifest(definition) {
  return {
    id: definition.id,
    name: definition.name || definition.id,
    version: definition.version || '1.0.0',
    description: definition.description || '',
    author: definition.author || 'Anonymous',
    dependencies: definition.dependencies || [],
    optionalDependencies: definition.optionalDependencies || [],
    config: definition.config || {},
    metadata: definition.metadata || {}
  }
}

export default pluginLoader
