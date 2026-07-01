/**
 * Hotkeys Plugin
 * 
 * Provides keyboard shortcut management for the application.
 */

import { pluginLoader } from '../../core/plugin-loader.js'
import { eventBus } from '../../core/event-bus.js'

/**
 * Hotkeys plugin manifest
 */
export const manifest = {
  id: 'hotkeys',
  name: 'Hotkeys',
  version: '1.0.0',
  description: 'Keyboard shortcut management',
  author: 'dotfiles-mgr',
  config: {
    // Default modifier keys
    defaultModifiers: ['Ctrl'],
    // Disable hotkeys when typing in input elements
    disableOnInput: true,
    // Show help overlay
    showHelp: true,
    // Help key (to show all hotkeys)
    helpKey: '?'
  }
}

/**
 * Hotkey class
 */
export class Hotkey {
  constructor(options = {}) {
    this.id = options.id || Date.now().toString()
    this.keys = Array.isArray(options.keys) ? options.keys : [options.keys || '']
    this.modifiers = Array.isArray(options.modifiers) ? options.modifiers : [options.modifiers || 'Ctrl']
    this.action = options.action || null
    this.description = options.description || ''
    this.category = options.category || 'General'
    this.priority = options.priority || 0
    this.enabled = options.enabled ?? true
    this.preventDefault = options.preventDefault ?? true
    this.stopPropagation = options.stopPropagation ?? true
    this.context = options.context || 'global'
    this_handler = null
  }

  matches(event) {
    if (!this.enabled) return false

    // Check if the event target should be ignored
    const target = event.target
    const tagName = target?.tagName?.toLowerCase()
    const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable
    const config = pluginLoader.getConfig('hotkeys') || {}
    if (config.disableOnInput && isInput) return false

    // Check modifiers
    for (const modifier of this.modifiers) {
      const key = this._getModifierKey(modifier)
      if (!event[key]) return false
    }

    // Check if any other modifier is pressed
    const allModifiers = ['ctrlKey', 'altKey', 'shiftKey', 'metaKey']
    const pressedModifiers = allModifiers.filter(m => event[m])
    if (pressedModifiers.length !== this.modifiers.length) return false

    // Check main keys
    const pressedKeys = this._getPressedKeys(event)
    for (const key of this.keys) {
      if (!pressedKeys.includes(key.toLowerCase()) && !pressedKeys.includes(key.toUpperCase())) {
        return false
      }
    }

    return true
  }

  _getModifierKey(modifier) {
    const map = {
      'Ctrl': 'ctrlKey',
      'Control': 'ctrlKey',
      'Alt': 'altKey',
      'Option': 'altKey',
      'Shift': 'shiftKey',
      'Meta': 'metaKey',
      'Cmd': 'metaKey',
      'Command': 'metaKey',
      'Win': 'metaKey',
      'Windows': 'metaKey'
    }
    return map[modifier] || null
  }

  _getPressedKeys(event) {
    const keys = []
    if (event.key) keys.push(event.key)
    if (event.code) {
      const code = event.code.replace('Key', '').replace('Digit', '')
      if (code && !keys.includes(code)) keys.push(code)
    }
    return keys.map(k => k.toLowerCase())
  }

  getDisplayString() {
    const mod = this.modifiers.map(m => {
      if (m === 'Ctrl') return 'Ctrl'
      if (m === 'Control') return 'Ctrl'
      if (m === 'Cmd' || m === 'Command' || m === 'Meta') return 'Cmd'
      if (m === 'Win' || m === 'Windows') return 'Win'
      return m
    }).join('+')

    const keys = this.keys.map(k => {
      if (k.length === 1) return k.toUpperCase()
      return k
    }).join('+')

    return mod ? `${mod}+${keys}` : keys
  }
}

/**
 * Hotkeys Plugin class
 */
export class HotkeysPlugin {
  constructor() {
    this.hotkeys = new Map() // Map<id, Hotkey>
    this.keyMap = new Map() // Map<keyCombo, Hotkey[]>
    this.enabled = true
    this._boundHandler = this._handleKeydown.bind(this)
    this._initDefaultHotkeys()
  }

  _initDefaultHotkeys() {
    // Add some default hotkeys for demonstration
    // These can be overridden or removed
    this.register({
      id: 'help',
      keys: ['?'],
      modifiers: ['Ctrl', 'Shift'],
      action: () => eventBus.emit('hotkeys.help'),
      description: 'Show all keyboard shortcuts',
      category: 'Help'
    })
  }

  _initEventListeners() {
    window.addEventListener('keydown', this._boundHandler)
    
    // Listen for hotkey registration events
    eventBus.on('hotkeys.register', (hotkey) => {
      this.register(hotkey)
    })
    
    eventBus.on('hotkeys.unregister', (id) => {
      this.unregister(id)
    })
  }

  _handleKeydown(event) {
    if (!this.enabled) return

    // Find matching hotkeys
    const matches = this._findMatchingHotkeys(event)
    
    if (matches.length > 0) {
      // Sort by priority (highest first)
      matches.sort((a, b) => b.priority - a.priority)
      
      const hotkey = matches[0]
      
      // Execute the action
      if (hotkey.action) {
        try {
          const result = hotkey.action(event)
          
          // Emit hotkey triggered event
          eventBus.emit('hotkeys.triggered', {
            id: hotkey.id,
            keys: hotkey.keys,
            modifiers: hotkey.modifiers,
            event,
            result
          })
        } catch (error) {
          console.error(`Hotkey action error for "${hotkey.id}":`, error)
          eventBus.emit('hotkeys.error', { hotkey, error })
        }
      }
      
      // Prevent default and stop propagation if configured
      if (hotkey.preventDefault) {
        event.preventDefault()
      }
      if (hotkey.stopPropagation) {
        event.stopPropagation()
      }
    }
  }

  _findMatchingHotkeys(event) {
    const matches = []
    for (const [, hotkey] of this.hotkeys) {
      if (hotkey.matches(event)) {
        matches.push(hotkey)
      }
    }
    return matches
  }

  /**
   * Register a hotkey
   * @param {object} options - Hotkey options
   * @returns {Hotkey} The registered hotkey
   */
  register(options) {
    const hotkey = new Hotkey(options)
    
    // Generate ID if not provided
    if (!hotkey.id) {
      hotkey.id = `hotkey_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    }
    
    // Store in map
    this.hotkeys.set(hotkey.id, hotkey)
    
    // Update key map
    this._updateKeyMap()
    
    // Emit registration event
    eventBus.emit('hotkeys.registered', { hotkey })
    
    return hotkey
  }

  /**
   * Register multiple hotkeys
   * @param {object[]} hotkeyDefinitions - Array of hotkey options
   * @returns {Hotkey[]} Array of registered hotkeys
   */
  registerMany(hotkeyDefinitions) {
    return hotkeyDefinitions.map(def => this.register(def))
  }

  /**
   * Unregister a hotkey
   * @param {string} id - Hotkey ID
   * @returns {boolean} Success status
   */
  unregister(id) {
    const hotkey = this.hotkeys.get(id)
    if (!hotkey) return false
    
    this.hotkeys.delete(id)
    this._updateKeyMap()
    
    // Emit unregistration event
    eventBus.emit('hotkeys.unregistered', { id, hotkey })
    
    return true
  }

  /**
   * Unregister all hotkeys
   */
  unregisterAll() {
    const ids = [...this.hotkeys.keys()]
    for (const id of ids) {
      this.unregister(id)
    }
  }

  /**
   * Update the key map for faster lookup
   */
  _updateKeyMap() {
    this.keyMap.clear()
    
    for (const [, hotkey] of this.hotkeys) {
      const keyCombo = this._getKeyComboString(hotkey)
      if (!this.keyMap.has(keyCombo)) {
        this.keyMap.set(keyCombo, [])
      }
      this.keyMap.get(keyCombo).push(hotkey)
    }
  }

  /**
   * Get a string representation of a key combination
   */
  _getKeyComboString(hotkey) {
    const mods = hotkey.modifiers.sort().join('+')
    const keys = hotkey.keys.sort().join('+')
    return `${mods}:${keys}`.toLowerCase()
  }

  /**
   * Get a hotkey by ID
   * @param {string} id - Hotkey ID
   * @returns {Hotkey|undefined}
   */
  get(id) {
    return this.hotkeys.get(id)
  }

  /**
   * Get all registered hotkeys
   * @returns {Hotkey[]}
   */
  getAll() {
    return [...this.hotkeys.values()]
  }

  /**
   * Get hotkeys by category
   * @param {string} category - Category name
   * @returns {Hotkey[]}
   */
  getByCategory(category) {
    return this.getAll().filter(h => h.category === category)
  }

  /**
   * Check if a hotkey is registered
   * @param {string} id - Hotkey ID
   * @returns {boolean}
   */
  has(id) {
    return this.hotkeys.has(id)
  }

  /**
   * Enable a hotkey
   * @param {string} id - Hotkey ID
   */
  enable(id) {
    const hotkey = this.hotkeys.get(id)
    if (hotkey) {
      hotkey.enabled = true
      this._updateKeyMap()
    }
  }

  /**
   * Disable a hotkey
   * @param {string} id - Hotkey ID
   */
  disable(id) {
    const hotkey = this.hotkeys.get(id)
    if (hotkey) {
      hotkey.enabled = false
    }
  }

  /**
   * Enable all hotkeys
   */
  enableAll() {
    for (const [, hotkey] of this.hotkeys) {
      hotkey.enabled = true
    }
    this._updateKeyMap()
  }

  /**
   * Disable all hotkeys
   */
  disableAll() {
    for (const [, hotkey] of this.hotkeys) {
      hotkey.enabled = false
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
  enablePlugin() {
    this.enabled = true
  }

  /**
   * Disable the plugin
   */
  disablePlugin() {
    this.enabled = false
  }

  /**
   * Destroy the plugin and clean up
   */
  destroy() {
    window.removeEventListener('keydown', this._boundHandler)
    this.hotkeys.clear()
    this.keyMap.clear()
  }

  /**
   * Show help overlay with all hotkeys
   */
  showHelp() {
    const hotkeys = this.getAll().filter(h => h.enabled)
    
    if (hotkeys.length === 0) {
      return
    }
    
    // Group by category
    const categories = {}
    for (const hotkey of hotkeys) {
      const cat = hotkey.category || 'Uncategorized'
      if (!categories[cat]) {
        categories[cat] = []
      }
      categories[cat].push(hotkey)
    }
    
    // Emit help event
    eventBus.emit('hotkeys.help', { categories, hotkeys })
    
    // Also show in console for debugging
    console.group('Keyboard Shortcuts')
    for (const [category, keys] of Object.entries(categories)) {
      console.log(`%c${category}`, 'font-weight: bold; font-size: 14px')
      for (const hotkey of keys) {
        console.log(`  ${hotkey.getDisplayString().padEnd(20)} ${hotkey.description}`)
      }
    }
    console.groupEnd()
  }
}

/**
 * Create and initialize the hotkeys plugin
 */
export function createPlugin() {
  const plugin = new HotkeysPlugin()
  plugin._initEventListeners()
  return plugin
}

/**
 * Plugin initialization
 */
export async function init(context, config) {
  const plugin = createPlugin()
  
  // Apply configuration
  if (config) {
    pluginLoader.setConfig('hotkeys', config)
  }
  
  // Register the plugin's API
  context.hotkeys = {
    register: plugin.register.bind(plugin),
    registerMany: plugin.registerMany.bind(plugin),
    unregister: plugin.unregister.bind(plugin),
    unregisterAll: plugin.unregisterAll.bind(plugin),
    get: plugin.get.bind(plugin),
    getAll: plugin.getAll.bind(plugin),
    getByCategory: plugin.getByCategory.bind(plugin),
    has: plugin.has.bind(plugin),
    enable: plugin.enable.bind(plugin),
    disable: plugin.disable.bind(plugin),
    enableAll: plugin.enableAll.bind(plugin),
    disableAll: plugin.disableAll.bind(plugin),
    showHelp: plugin.showHelp.bind(plugin),
    isEnabled: plugin.isEnabled.bind(plugin),
    enablePlugin: plugin.enablePlugin.bind(plugin),
    disablePlugin: plugin.disablePlugin.bind(plugin),
    destroy: plugin.destroy.bind(plugin)
  }
  
  // Add to global context
  window.hotkeys = context.hotkeys
  
  // Register common aliases
  context.hotkeys.bind = context.hotkeys.register
  context.hotkeys.unbind = context.hotkeys.unregister
  
  return plugin
}

/**
 * Plugin start
 */
export function start(context, config) {
  const plugin = context.hotkeys?._plugin
  if (plugin) {
    plugin.enablePlugin()
  }
}

/**
 * Plugin stop
 */
export function stop(context, config) {
  const plugin = context.hotkeys?._plugin
  if (plugin) {
    plugin.disablePlugin()
  }
}

/**
 * Plugin destroy
 */
export function destroy(context, config) {
  const plugin = context.hotkeys?._plugin
  if (plugin) {
    plugin.destroy()
  }
  delete context.hotkeys
  delete window.hotkeys
}

// Convenience API
export const hotkeys = {
  register: (options) => pluginLoader.getExports('hotkeys')?.register?.(options),
  unregister: (id) => pluginLoader.getExports('hotkeys')?.unregister?.(id),
  get: (id) => pluginLoader.getExports('hotkeys')?.get?.(id),
  getAll: () => pluginLoader.getExports('hotkeys')?.getAll?.(),
  showHelp: () => pluginLoader.getExports('hotkeys')?.showHelp?.()
}

// Modifiers for easier hotkey definition
export const Modifiers = {
  CTRL: 'Ctrl',
  CONTROL: 'Control',
  ALT: 'Alt',
  OPTION: 'Option',
  SHIFT: 'Shift',
  META: 'Meta',
  CMD: 'Cmd',
  COMMAND: 'Command',
  WIN: 'Win',
  WINDOWS: 'Windows'
}

export default {
  manifest,
  init,
  start,
  stop,
  destroy,
  HotkeysPlugin,
  Hotkey,
  hotkeys,
  Modifiers
}
