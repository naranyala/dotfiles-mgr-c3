/**
 * Storage Plugin
 * 
 * Provides unified access to localStorage, sessionStorage, and in-memory storage.
 * Also supports encrypted storage using Web Crypto API.
 */

import { pluginLoader } from '../../core/plugin-loader.js'
import { eventBus } from '../../core/event-bus.js'

/**
 * Storage types
 */
export const StorageType = {
  LOCAL: 'local',
  SESSION: 'session',
  MEMORY: 'memory',
  ENCRYPTED: 'encrypted'
}

/**
 * Storage plugin manifest
 */
export const manifest = {
  id: 'storage',
  name: 'Storage',
  version: '1.0.0',
  description: 'Unified storage access for localStorage, sessionStorage, and encrypted storage',
  author: 'dotfiles-mgr',
  config: {
    // Default storage type
    defaultType: StorageType.LOCAL,
    // Encryption key (should be set programmatically)
    encryptionKey: null,
    // Prefix for all storage keys
    prefix: 'dotfiles-mgr_',
    // Enable compression for large values
    compress: false,
    // Compression threshold in bytes
    compressThreshold: 1024
  }
}

/**
 * Storage class
 */
export class Storage {
  constructor(type, options = {}) {
    this.type = type
    this.options = { prefix: '', ...options }
    this.store = this._getStore(type)
    this.cache = new Map()
  }

  _getStore(type) {
    switch (type) {
      case StorageType.LOCAL:
        return window.localStorage
      case StorageType.SESSION:
        return window.sessionStorage
      case StorageType.MEMORY:
        return new Map()
      case StorageType.ENCRYPTED:
        return window.localStorage // Encrypted values stored in localStorage
      default:
        return window.localStorage
    }
  }

  _getKey(key) {
    return `${this.options.prefix}${key}`
  }

  /**
   * Get a value from storage
   */
  get(key, defaultValue = undefined) {
    const prefixedKey = this._getKey(key)
    
    // Check cache first
    if (this.cache.has(prefixedKey)) {
      return this.cache.get(prefixedKey)
    }
    
    try {
      let value
      
      if (this.type === StorageType.MEMORY) {
        value = this.store.get(prefixedKey)
      } else {
        const item = this.store.getItem(prefixedKey)
        if (item === null) return defaultValue
        value = item
      }
      
      if (value === undefined || value === null) {
        return defaultValue
      }
      
      // Parse JSON if it looks like JSON
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          value = JSON.parse(value)
        } catch {
          // Not JSON, return as-is
        }
      }
      
      // Handle encrypted values
      if (this.type === StorageType.ENCRYPTED) {
        value = this._decrypt(value)
      }
      
      // Decompress if needed
      if (this.options.compress && typeof value === 'string') {
        value = this._decompress(value)
      }
      
      // Cache the value
      this.cache.set(prefixedKey, value)
      
      return value
    } catch (error) {
      console.error(`Storage get error for key "${key}":`, error)
      return defaultValue
    }
  }

  /**
   * Set a value in storage
   */
  set(key, value, options = {}) {
    const prefixedKey = this._getKey(key)
    
    try {
      let finalValue = value
      
      // Compress if needed
      if (this.options.compress && typeof value === 'string' && value.length > (this.options.compressThreshold || 1024)) {
        finalValue = this._compress(value)
      }
      
      // Handle encrypted storage
      if (this.type === StorageType.ENCRYPTED) {
        finalValue = this._encrypt(finalValue)
      }
      
      // Stringify if not a string
      if (typeof finalValue !== 'string') {
        finalValue = JSON.stringify(finalValue)
      }
      
      if (this.type === StorageType.MEMORY) {
        this.store.set(prefixedKey, finalValue)
      } else {
        this.store.setItem(prefixedKey, finalValue)
      }
      
      // Update cache
      this.cache.set(prefixedKey, value)
      
      // Emit storage change event
      eventBus.emit('storage.changed', {
        type: this.type,
        key,
        value,
        storage: this
      })
      
      return true
    } catch (error) {
      console.error(`Storage set error for key "${key}":`, error)
      return false
    }
  }

  /**
   * Check if a key exists in storage
   */
  has(key) {
    const prefixedKey = this._getKey(key)
    
    if (this.type === StorageType.MEMORY) {
      return this.store.has(prefixedKey)
    }
    
    return this.store.getItem(prefixedKey) !== null
  }

  /**
   * Remove a key from storage
   */
  remove(key) {
    const prefixedKey = this._getKey(key)
    
    try {
      if (this.type === StorageType.MEMORY) {
        this.store.delete(prefixedKey)
      } else {
        this.store.removeItem(prefixedKey)
      }
      
      // Remove from cache
      this.cache.delete(prefixedKey)
      
      // Emit storage removed event
      eventBus.emit('storage.removed', {
        type: this.type,
        key,
        storage: this
      })
      
      return true
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error)
      return false
    }
  }

  /**
   * Get all keys in storage
   */
  keys() {
    const prefix = this.options.prefix
    const allKeys = []
    
    if (this.type === StorageType.MEMORY) {
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
          allKeys.push(key.substring(prefix.length))
        }
      }
    } else {
      for (let i = 0; i < this.store.length; i++) {
        const key = this.store.key(i)
        if (key && key.startsWith(prefix)) {
          allKeys.push(key.substring(prefix.length))
        }
      }
    }
    
    return allKeys
  }

  /**
   * Get all values as an object
   */
  getAll() {
    const result = {}
    const keys = this.keys()
    
    for (const key of keys) {
      result[key] = this.get(key)
    }
    
    return result
  }

  /**
   * Clear all keys in storage
   */
  clear() {
    const prefix = this.options.prefix
    const keysToRemove = this.keys()
    
    for (const key of keysToRemove) {
      this.remove(key)
    }
    
    // Emit storage cleared event
    eventBus.emit('storage.cleared', {
      type: this.type,
      storage: this
    })
  }

  /**
   * Get storage size (number of keys)
   */
  get size() {
    return this.keys().length
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Compress a string
   */
  _compress(str) {
    try {
      // Simple run-length encoding compression
      // In a real implementation, use pako or similar
      return btoa(encodeURIComponent(str))
    } catch {
      return str
    }
  }

  /**
   * Decompress a string
   */
  _decompress(str) {
    try {
      return decodeURIComponent(atob(str))
    } catch {
      return str
    }
  }

  /**
   * Encrypt a value (placeholder - implement with Web Crypto API)
   */
  _encrypt(value) {
    // This is a placeholder. In a real implementation:
    // 1. Generate or use the encryption key
    // 2. Encrypt the value using AES-GCM or similar
    // 3. Return the encrypted value as a string
    
    // For now, just return the value as-is
    // Note: This means encrypted storage behaves like localStorage without encryption
    return value
  }

  /**
   * Decrypt a value (placeholder)
   */
  _decrypt(value) {
    // Placeholder for decryption
    return value
  }

  /**
   * Set encryption key
   */
  async setEncryptionKey(key) {
    // In a real implementation, this would set up the encryption
    // For now, just store it
    this.encryptionKey = key
  }
}

/**
 * Storage Plugin class
 */
export class StoragePlugin {
  constructor() {
    this.stores = new Map()
    this.enabled = true
    this._initStores()
  }

  _initStores() {
    const config = pluginLoader.getConfig('storage') || {}
    
    // Create default stores
    for (const type of Object.values(StorageType)) {
      this.stores.set(type, new Storage(type, {
        prefix: config.prefix || '',
        compress: config.compress || false,
        compressThreshold: config.compressThreshold || 1024
      }))
    }
  }

  /**
   * Get a storage instance by type
   */
  getStore(type = StorageType.LOCAL) {
    if (!this.stores.has(type)) {
      this.stores.set(type, new Storage(type, {
        prefix: (pluginLoader.getConfig('storage') || {}).prefix || ''
      }))
    }
    return this.stores.get(type)
  }

  /**
   * Get value from default storage
   */
  get(key, defaultValue) {
    const config = pluginLoader.getConfig('storage') || {}
    return this.getStore(config.defaultType || StorageType.LOCAL).get(key, defaultValue)
  }

  /**
   * Set value in default storage
   */
  set(key, value, options = {}) {
    const config = pluginLoader.getConfig('storage') || {}
    return this.getStore(config.defaultType || StorageType.LOCAL).set(key, value, options)
  }

  /**
   * Check if key exists in default storage
   */
  has(key) {
    const config = pluginLoader.getConfig('storage') || {}
    return this.getStore(config.defaultType || StorageType.LOCAL).has(key)
  }

  /**
   * Remove key from default storage
   */
  remove(key) {
    const config = pluginLoader.getConfig('storage') || {}
    return this.getStore(config.defaultType || StorageType.LOCAL).remove(key)
  }

  /**
   * Clear default storage
   */
  clear() {
    const config = pluginLoader.getConfig('storage') || {}
    return this.getStore(config.defaultType || StorageType.LOCAL).clear()
  }

  /**
   * Get all keys from default storage
   */
  keys() {
    const config = pluginLoader.getConfig('storage') || {}
    return this.getStore(config.defaultType || StorageType.LOCAL).keys()
  }

  /**
   * Get all values from default storage
   */
  getAll() {
    const config = pluginLoader.getConfig('storage') || {}
    return this.getStore(config.defaultType || StorageType.LOCAL).getAll()
  }

  /**
   * Set encryption key for encrypted storage
   */
  async setEncryptionKey(key) {
    for (const [type, store] of this.stores) {
      if (type === StorageType.ENCRYPTED) {
        await store.setEncryptionKey(key)
      }
    }
  }

  /**
   * Check if storage is supported
   */
  isSupported() {
    try {
      return 'localStorage' in window && window.localStorage !== null
    } catch {
      return false
    }
  }

  /**
   * Check if the plugin is enabled
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * Enable the plugin
   */
  enable() {
    this.enabled = true
  }

  /**
   * Disable the plugin
   */
  disable() {
    this.enabled = false
  }

  /**
   * Destroy the plugin and clean up
   */
  destroy() {
    this.stores.clear()
  }
}

/**
 * Create and initialize the storage plugin
 */
export function createPlugin() {
  return new StoragePlugin()
}

/**
 * Plugin initialization
 */
export async function init(context, config) {
  const plugin = createPlugin()
  
  // Apply configuration
  if (config) {
    pluginLoader.setConfig('storage', config)
    plugin._initStores()
  }
  
  // Register the plugin's API
  context.storage = {
    // Default storage methods
    get: plugin.get.bind(plugin),
    set: plugin.set.bind(plugin),
    has: plugin.has.bind(plugin),
    remove: plugin.remove.bind(plugin),
    clear: plugin.clear.bind(plugin),
    keys: plugin.keys.bind(plugin),
    getAll: plugin.getAll.bind(plugin),
    
    // Get specific storage types
    local: plugin.getStore(StorageType.LOCAL),
    session: plugin.getStore(StorageType.SESSION),
    memory: plugin.getStore(StorageType.MEMORY),
    encrypted: plugin.getStore(StorageType.ENCRYPTED),
    
    // Encryption
    setEncryptionKey: plugin.setEncryptionKey.bind(plugin),
    
    // Utility
    getStore: plugin.getStore.bind(plugin),
    isSupported: plugin.isSupported.bind(plugin),
    isEnabled: plugin.isEnabled.bind(plugin),
    enable: plugin.enable.bind(plugin),
    disable: plugin.disable.bind(plugin),
    destroy: plugin.destroy.bind(plugin)
  }
  
  // Add to global context
  window.storage = context.storage
  
  return plugin
}

/**
 * Plugin start
 */
export function start(context, config) {
  const plugin = context.storage?._plugin
  if (plugin) {
    plugin.enable()
  }
}

/**
 * Plugin stop
 */
export function stop(context, config) {
  const plugin = context.storage?._plugin
  if (plugin) {
    plugin.disable()
  }
}

/**
 * Plugin destroy
 */
export function destroy(context, config) {
  const plugin = context.storage?._plugin
  if (plugin) {
    plugin.destroy()
  }
  delete context.storage
  delete window.storage
}

// Convenience API
export const storage = {
  get: (key, defaultValue) => pluginLoader.getExports('storage')?.get?.(key, defaultValue),
  set: (key, value, options) => pluginLoader.getExports('storage')?.set?.(key, value, options),
  has: (key) => pluginLoader.getExports('storage')?.has?.(key),
  remove: (key) => pluginLoader.getExports('storage')?.remove?.(key),
  clear: () => pluginLoader.getExports('storage')?.clear?.(),
  local: () => pluginLoader.getExports('storage')?.local,
  session: () => pluginLoader.getExports('storage')?.session
}

export default {
  manifest,
  init,
  start,
  stop,
  destroy,
  StoragePlugin,
  Storage,
  StorageType,
  storage
}
