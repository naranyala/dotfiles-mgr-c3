/**
 * Event Bus - A simple event emitter for frontend communication
 * 
 * Features:
 * - Subscribe/publish pattern
 * - Multiple listeners per event
 * - Wildcard event support
 * - Once listeners (auto-unsubscribe after first call)
 * - Async event handlers
 */

/**
 * Event Bus class
 */
export class EventBus {
  constructor() {
    this.listeners = new Map()
    this.wildcards = new Map()
    this.onceListeners = new Map()
    this.debugMode = false
  }

  /**
   * Enable/disable debug logging
   */
  setDebug(enabled = true) {
    this.debugMode = enabled
    return this
  }

  /**
   * Log debug message if debug mode is enabled
   */
  _log(message, ...args) {
    if (this.debugMode) {
      console.log(`[EventBus] ${message}`, ...args)
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @param {object} [options] - Subscription options
   * @param {number} [options.priority=0] - Handler priority (higher runs first)
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    const { priority = 0 } = options
    
    if (typeof handler !== 'function') {
      console.warn(`EventBus: Handler for "${event}" is not a function`)
      return () => {}
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }

    const entry = { handler, priority }
    const listeners = this.listeners.get(event)
    
    // Insert by priority (higher priority first)
    let index = listeners.length
    for (let i = 0; i < listeners.length; i++) {
      if (priority > listeners[i].priority) {
        index = i
        break
      }
    }
    listeners.splice(index, 0, entry)

    this._log(`Subscribed to "${event}"`, { handler, priority })

    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(entry)
      if (index !== -1) {
        listeners.splice(index, 1)
        this._log(`Unsubscribed from "${event}"`, { handler })
      }
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, [])
    }

    if (typeof handler !== 'function') {
      console.warn(`EventBus: Once handler for "${event}" is not a function`)
      return () => {}
    }

    const onceListeners = this.onceListeners.get(event)
    onceListeners.push(handler)

    this._log(`Subscribed once to "${event}"`, { handler })

    return () => {
      const index = onceListeners.indexOf(handler)
      if (index !== -1) {
        onceListeners.splice(index, 1)
        this._log(`Unsubscribed from once "${event}"`, { handler })
      }
    }
  }

  /**
   * Subscribe to wildcard events (e.g., "user:*" matches "user:create", "user:delete")
   * @param {string} pattern - Wildcard pattern (e.g., "user:*", "*:update")
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  onWildcard(pattern, handler) {
    if (typeof handler !== 'function') {
      console.warn(`EventBus: Wildcard handler for "${pattern}" is not a function`)
      return () => {}
    }

    if (!this.wildcards.has(pattern)) {
      this.wildcards.set(pattern, [])
    }

    this.wildcards.get(pattern).push(handler)

    this._log(`Subscribed to wildcard "${pattern}"`, { handler })

    return () => {
      const handlers = this.wildcards.get(pattern)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index !== -1) {
          handlers.splice(index, 1)
          this._log(`Unsubscribed from wildcard "${pattern}"`, { handler })
        }
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} [data] - Event data to pass to handlers
   * @param {object} [meta] - Metadata about the event
   * @returns {Promise<*>} Resolves with the last handler's return value, or undefined
   */
  async emit(event, data, meta = {}) {
    this._log(`Emitting "${event}"`, { data, meta })

    let result
    
    // Handle once listeners first (they should fire before regular listeners)
    const onceListeners = this.onceListeners.get(event) || []
    for (const handler of onceListeners) {
      try {
        result = await handler(data, meta)
      } catch (error) {
        console.error(`EventBus: Error in once handler for "${event}"`, error)
      }
    }
    // Clear once listeners
    onceListeners.length = 0

    // Handle regular listeners
    const listeners = this.listeners.get(event) || []
    for (const { handler } of listeners) {
      try {
        result = await handler(data, meta)
      } catch (error) {
        console.error(`EventBus: Error in handler for "${event}"`, error)
      }
    }

    // Handle wildcard listeners
    for (const [pattern, handlers] of this.wildcards) {
      if (this._matchWildcard(pattern, event)) {
        for (const handler of handlers) {
          try {
            result = await handler(data, meta, event)
          } catch (error) {
            console.error(`EventBus: Error in wildcard handler for "${pattern}" (event: "${event}")`, error)
          }
        }
      }
    }

    this._log(`Event "${event}" completed`, { result })
    return result
  }

  /**
   * Emit an event synchronously
   * @param {string} event - Event name
   * @param {*} [data] - Event data to pass to handlers
   * @param {object} [meta] - Metadata about the event
   * @returns {*} The last handler's return value, or undefined
   */
  emitSync(event, data, meta = {}) {
    this._log(`Emitting sync "${event}"`, { data, meta })

    let result

    // Handle once listeners
    const onceListeners = this.onceListeners.get(event) || []
    for (const handler of onceListeners) {
      try {
        result = handler(data, meta)
      } catch (error) {
        console.error(`EventBus: Error in once handler for "${event}"`, error)
      }
    }
    onceListeners.length = 0

    // Handle regular listeners
    const listeners = this.listeners.get(event) || []
    for (const { handler } of listeners) {
      try {
        result = handler(data, meta)
      } catch (error) {
        console.error(`EventBus: Error in handler for "${event}"`, error)
      }
    }

    // Handle wildcard listeners
    for (const [pattern, handlers] of this.wildcards) {
      if (this._matchWildcard(pattern, event)) {
        for (const handler of handlers) {
          try {
            result = handler(data, meta, event)
          } catch (error) {
            console.error(`EventBus: Error in wildcard handler for "${pattern}" (event: "${event}")`, error)
          }
        }
      }
    }

    return result
  }

  /**
   * Match a wildcard pattern against an event name
   */
  _matchWildcard(pattern, event) {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.')
    
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(event)
  }

  /**
   * Get all event names that have listeners
   * @returns {string[]} Array of event names
   */
  getEvents() {
    return [...this.listeners.keys(), ...this.onceListeners.keys()]
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(event) {
    return (this.listeners.get(event)?.length || 0) + (this.onceListeners.get(event)?.length || 0)
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear()
    this.onceListeners.clear()
    this.wildcards.clear()
    this._log('All listeners cleared')
  }

  /**
   * Clear listeners for a specific event
   * @param {string} event - Event name
   */
  clearEvent(event) {
    this.listeners.delete(event)
    this.onceListeners.delete(event)
    this._log(`Cleared listeners for "${event}"`)
  }

  /**
   * Remove a specific listener
   * @param {string} event - Event name
   * @param {Function} handler - The handler to remove
   */
  off(event, handler) {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.findIndex(l => l.handler === handler)
      if (index !== -1) {
        listeners.splice(index, 1)
        this._log(`Removed listener from "${event}"`, { handler })
      }
    }

    const onceListeners = this.onceListeners.get(event)
    if (onceListeners) {
      const index = onceListeners.indexOf(handler)
      if (index !== -1) {
        onceListeners.splice(index, 1)
        this._log(`Removed once listener from "${event}"`, { handler })
      }
    }
  }

  /**
   * Wait for an event to be emitted
   * @param {string} event - Event name
   * @param {object} [options] - Options
   * @param {number} [options.timeout] - Timeout in milliseconds
   * @returns {Promise<*>} Resolves with the event data when emitted
   */
  waitFor(event, options = {}) {
    const { timeout } = options
    
    return new Promise((resolve, reject) => {
      const handler = (data) => {
        off()
        resolve(data)
      }

      const off = this.on(event, handler)

      if (timeout) {
        const timer = setTimeout(() => {
          off()
          reject(new Error(`Timeout waiting for event "${event}"`))
        }, timeout)
        // Store timer so it can be cleared if needed
        handler.timer = timer
      }
    })
  }

  /**
   * Create a scoped event bus that prefixed all events
   * @param {string} prefix - Prefix for all events
   * @returns {EventBus} New scoped event bus
   */
  scope(prefix) {
    const scoped = new EventBus()
    scoped.debugMode = this.debugMode
    
    // Proxy the original bus
    const originalEmit = scoped.emit.bind(scoped)
    const originalEmitSync = scoped.emitSync.bind(scoped)
    
    scoped.emit = async (event, data, meta) => {
      const scopedEvent = `${prefix}:${event}`
      return this.emit(scopedEvent, data, meta)
    }
    
    scoped.emitSync = (event, data, meta) => {
      const scopedEvent = `${prefix}:${event}`
      return this.emitSync(scopedEvent, data, meta)
    }
    
    // Also proxy on/once to the main bus with prefix
    const originalOn = scoped.on.bind(scoped)
    scoped.on = (event, handler, options) => {
      const scopedEvent = `${prefix}:${event}`
      return this.on(scopedEvent, handler, options)
    }
    
    const originalOnce = scoped.once.bind(scoped)
    scoped.once = (event, handler) => {
      const scopedEvent = `${prefix}:${event}`
      return this.once(scopedEvent, handler)
    }
    
    return scoped
  }
}

// Global event bus instance
export const eventBus = new EventBus()

// Convenience functions that use the global event bus
export const on = eventBus.on.bind(eventBus)
export const once = eventBus.once.bind(eventBus)
export const off = eventBus.off.bind(eventBus)
export const emit = eventBus.emit.bind(eventBus)
export const emitSync = eventBus.emitSync.bind(eventBus)
export const waitFor = eventBus.waitFor.bind(eventBus)

// Export types
/**
 * @typedef {object} EventBusOptions
 * @property {number} [priority] - Handler priority
 */

/**
 * @typedef {Function} EventHandler - Event handler function
 * @param {*} data - Event data
 * @param {object} meta - Event metadata
 */

/**
 * @typedef {Function} WildcardHandler - Wildcard event handler function
 * @param {*} data - Event data
 * @param {object} meta - Event metadata
 * @param {string} event - The actual event name that was emitted
 */

export default eventBus
