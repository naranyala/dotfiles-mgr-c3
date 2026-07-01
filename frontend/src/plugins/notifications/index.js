/**
 * Notifications Plugin
 * 
 * Provides a notification system for displaying toast-style notifications.
 */

import { pluginLoader } from '../../core/plugin-loader.js'
import { eventBus } from '../../core/event-bus.js'
import { html, signal, ReactiveComponent } from '../../core/index.js'

/**
 * Notification types
 */
export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  DEFAULT: 'default'
}

/**
 * Notification positions
 */
export const NotificationPosition = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  TOP_CENTER: 'top-center',
  BOTTOM_CENTER: 'bottom-center'
}

/**
 * Notification plugin manifest
 */
export const manifest = {
  id: 'notifications',
  name: 'Notifications',
  version: '1.0.0',
  description: 'Display toast-style notifications',
  author: 'dotfiles-mgr',
  config: {
    position: NotificationPosition.TOP_RIGHT,
    timeout: 5000,
    maxVisible: 5,
    pauseOnHover: true,
    newestOnTop: true,
    preventDuplicates: true
  }
}

/**
 * Notification class
 */
export class Notification {
  constructor(options = {}) {
    this.id = options.id || Date.now().toString()
    this.message = options.message || ''
    this.type = options.type || NotificationType.DEFAULT
    this.title = options.title || ''
    this.timeout = options.timeout ?? 5000
    this.persistent = options.persistent || false
    this.dismissible = options.dismissible ?? true
    this.onClick = options.onClick
    this.onDismiss = options.onDismiss
    this.createdAt = Date.now()
    this.element = null
    this.timer = null
  }

  startTimer(dismissFn) {
    if (this.persistent) return
    if (this.timeout > 0) {
      this.timer = setTimeout(dismissFn, this.timeout)
    }
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  getTypeClass() {
    return `notification-${this.type}`
  }

  getIcon() {
    const icons = {
      [NotificationType.INFO]: 'ℹ️',
      [NotificationType.SUCCESS]: '✓',
      [NotificationType.WARNING]: '⚠️',
      [NotificationType.ERROR]: '✗',
      [NotificationType.DEFAULT]: ''
    }
    return icons[this.type]
  }
}

/**
 * Notifications Plugin class
 */
export class NotificationsPlugin {
  constructor() {
    this.notifications = new Map()
    this.container = null
    this.enabled = true
    this._createContainer()
    this._initEventListeners()
  }

  _createContainer() {
    this.container = document.createElement('div')
    this.container.className = 'notifications-container'
    this.container.id = 'notifications-container'
    document.body.appendChild(this.container)
    this.updateContainerPosition()
  }

  _initEventListeners() {
    // Listen for notification events
    eventBus.on('notifications.show', (options) => {
      this.show(options)
    })

    eventBus.on('notifications.hide', (id) => {
      this.hide(id)
    })

    eventBus.on('notifications.clear', () => {
      this.clear()
    })
  }

  updateContainerPosition() {
    const config = pluginLoader.getConfig('notifications') || {}
    const position = config.position || NotificationPosition.TOP_RIGHT
    
    this.container.className = `notifications-container notifications-${position}`
  }

  /**
   * Show a notification
   * @param {object} options - Notification options
   * @returns {Notification} The notification instance
   */
  show(options = {}) {
    if (!this.enabled) return null

    const config = pluginLoader.getConfig('notifications') || {}
    
    // Check for duplicates
    if (config.preventDuplicates) {
      const existing = [...this.notifications.values()].find(n => 
        n.message === options.message && 
        n.type === (options.type || NotificationType.DEFAULT)
      )
      if (existing) {
        existing.clearTimer()
        existing.startTimer(() => this.hide(existing.id))
        return existing
      }
    }

    // Apply defaults
    const notification = new Notification({
      type: NotificationType.DEFAULT,
      timeout: config.timeout,
      ...options
    })

    // Create notification element
    notification.element = this._createNotificationElement(notification)
    
    // Add to container
    if (config.newestOnTop) {
      this.container.insertBefore(notification.element, this.container.firstChild)
    } else {
      this.container.appendChild(notification.element)
    }

    // Store notification
    this.notifications.set(notification.id, notification)

    // Enforce max visible
    if (config.maxVisible && this.notifications.size > config.maxVisible) {
      const toRemove = [...this.notifications.keys()].slice(config.maxVisible)
      for (const id of toRemove) {
        this.hide(id)
      }
    }

    // Start auto-dismiss timer
    notification.startTimer(() => this.hide(notification.id))

    // Emit shown event
    eventBus.emit('notifications.shown', { notification })

    return notification
  }

  /**
   * Create notification DOM element
   */
  _createNotificationElement(notification) {
    const config = pluginLoader.getConfig('notifications') || {}
    
    const el = document.createElement('div')
    el.className = `notification ${notification.getTypeClass()}`
    el.dataset.id = notification.id
    el.dataset.type = notification.type

    const icon = notification.getIcon()
    const title = notification.title
    const message = notification.message

    el.innerHTML = html`
      <div class="notification-content">
        ${icon && html`<span class="notification-icon">${icon}</span>`}
        <div class="notification-message">
          ${title && html`<div class="notification-title">${title}</div>`}
          <div class="notification-text">${message}</div>
        </div>
        ${notification.dismissible && html`<button class="notification-close" aria-label="Dismiss">&times;</button>`}
      </div>
    `

    // Handle click
    if (notification.onClick) {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('notification-close')) return
        notification.onClick(notification)
        this.hide(notification.id)
      })
    }

    // Handle close button
    if (notification.dismissible) {
      const closeBtn = el.querySelector('.notification-close')
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hide(notification.id))
      }
    }

    // Handle hover to pause timer
    if (config.pauseOnHover) {
      el.addEventListener('mouseenter', () => notification.clearTimer())
      el.addEventListener('mouseleave', () => {
        notification.startTimer(() => this.hide(notification.id))
      })
    }

    return el
  }

  /**
   * Hide a notification
   * @param {string} id - Notification ID
   */
  hide(id) {
    const notification = this.notifications.get(id)
    if (!notification) return false

    notification.clearTimer()
    
    // Animate out
    if (notification.element) {
      notification.element.classList.add('notification-exit')
      notification.element.addEventListener('animationend', () => {
        this._removeNotification(id)
      }, { once: true })
      
      // Fallback for browsers without animation support
      setTimeout(() => {
        if (notification.element && notification.element.parentNode) {
          this._removeNotification(id)
        }
      }, 300)
    } else {
      this._removeNotification(id)
    }

    // Call onDismiss callback
    if (notification.onDismiss) {
      notification.onDismiss(notification)
    }

    // Emit hidden event
    eventBus.emit('notifications.hidden', { id, notification })

    return true
  }

  /**
   * Remove notification from DOM and storage
   */
  _removeNotification(id) {
    const notification = this.notifications.get(id)
    if (!notification) return

    if (notification.element && notification.element.parentNode) {
      notification.element.remove()
    }

    this.notifications.delete(id)
  }

  /**
   * Hide all notifications
   */
  hideAll() {
    for (const [id] of this.notifications) {
      this.hide(id)
    }
  }

  /**
   * Clear all notifications immediately (no animation)
   */
  clear() {
    for (const [id, notification] of this.notifications) {
      notification.clearTimer()
      if (notification.element) {
        notification.element.remove()
      }
    }
    this.notifications.clear()
    
    eventBus.emit('notifications.cleared')
  }

  /**
   * Get all active notifications
   * @returns {Notification[]}
   */
  getAll() {
    return [...this.notifications.values()]
  }

  /**
   * Get notification count
   * @returns {number}
   */
  getCount() {
    return this.notifications.size
  }

  /**
   * Check if notifications are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * Enable notifications
   */
  enable() {
    this.enabled = true
  }

  /**
   * Disable notifications
   */
  disable() {
    this.enabled = false
  }

  /**
   * Destroy the plugin and clean up
   */
  destroy() {
    this.clear()
    if (this.container && this.container.parentNode) {
      this.container.remove()
    }
    this.notifications.clear()
  }
}

/**
 * Create and initialize the notifications plugin
 */
export function createPlugin() {
  return new NotificationsPlugin()
}

/**
 * Plugin initialization
 */
export async function init(context, config) {
  const plugin = createPlugin()
  
  // Apply configuration
  if (config) {
    pluginLoader.setConfig('notifications', config)
    plugin.updateContainerPosition()
  }
  
  // Register the plugin's API
  context.notifications = {
    show: plugin.show.bind(plugin),
    hide: plugin.hide.bind(plugin),
    hideAll: plugin.hideAll.bind(plugin),
    clear: plugin.clear.bind(plugin),
    getAll: plugin.getAll.bind(plugin),
    getCount: plugin.getCount.bind(plugin),
    isEnabled: plugin.isEnabled.bind(plugin),
    enable: plugin.enable.bind(plugin),
    disable: plugin.disable.bind(plugin),
    destroy: plugin.destroy.bind(plugin)
  }
  
  // Add to global context
  window.notifications = context.notifications
  
  // Add convenience methods
  for (const type of Object.values(NotificationType)) {
    context.notifications[type] = (message, options = {}) => {
      return plugin.show({ message, type, ...options })
    }
  }
  
  return plugin
}

/**
 * Plugin start
 */
export function start(context, config) {
  const plugin = context.notifications?._plugin
  if (plugin) {
    plugin.enable()
  }
}

/**
 * Plugin stop
 */
export function stop(context, config) {
  const plugin = context.notifications?._plugin
  if (plugin) {
    plugin.disable()
  }
}

/**
 * Plugin destroy
 */
export function destroy(context, config) {
  const plugin = context.notifications?._plugin
  if (plugin) {
    plugin.destroy()
  }
  delete context.notifications
  delete window.notifications
}

// Convenience API
export const notifications = {
  show: (options) => pluginLoader.getExports('notifications')?.show?.(options),
  info: (message, options) => pluginLoader.getExports('notifications')?.show?.({ message, type: 'info', ...options }),
  success: (message, options) => pluginLoader.getExports('notifications')?.show?.({ message, type: 'success', ...options }),
  warning: (message, options) => pluginLoader.getExports('notifications')?.show?.({ message, type: 'warning', ...options }),
  error: (message, options) => pluginLoader.getExports('notifications')?.show?.({ message, type: 'error', ...options }),
  clear: () => pluginLoader.getExports('notifications')?.clear?.()
}

export default {
  manifest,
  init,
  start,
  stop,
  destroy,
  NotificationsPlugin,
  Notification,
  NotificationType,
  NotificationPosition,
  notifications
}
