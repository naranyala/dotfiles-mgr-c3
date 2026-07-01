/**
 * Dialog Plugin
 * 
 * Provides modal dialog and confirmation dialog functionality.
 */

import { pluginLoader } from '../../core/plugin-loader.js'
import { eventBus } from '../../core/event-bus.js'
import { html, ReactiveComponent, signal } from '../../core/index.js'

/**
 * Dialog types
 */
export const DialogType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  CONFIRM: 'confirm',
  PROMPT: 'prompt',
  CUSTOM: 'custom'
}

/**
 * Dialog positions
 */
export const DialogPosition = {
  CENTER: 'center',
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
}

/**
 * Dialog plugin manifest
 */
export const manifest = {
  id: 'dialog',
  name: 'Dialog',
  version: '1.0.0',
  description: 'Modal dialog and confirmation dialogs',
  author: 'dotfiles-mgr',
  config: {
    defaultType: DialogType.INFO,
    defaultPosition: DialogPosition.CENTER,
    backdropClose: true,
    escapeClose: true,
    animation: true,
    backdropOpacity: 0.5
  }
}

/**
 * Dialog result types
 */
export const DialogResult = {
  OK: 'ok',
  CANCEL: 'cancel',
  YES: 'yes',
  NO: 'no',
  CONFIRM: 'confirm',
  DECLINE: 'decline',
  SUBMIT: 'submit',
  DISMISS: 'dismiss'
}

/**
 * Dialog class
 */
export class Dialog {
  constructor(options = {}) {
    this.id = options.id || Date.now().toString()
    this.type = options.type || DialogType.INFO
    this.title = options.title || ''
    this.message = options.message || ''
    this.html = options.html
    this.position = options.position || DialogPosition.CENTER
    this.buttons = options.buttons || this._getDefaultButtons()
    this.backdropClose = options.backdropClose ?? true
    this.escapeClose = options.escapeClose ?? true
    this.animation = options.animation ?? true
    this.zIndex = options.zIndex || 1000
    this.width = options.width || 'auto'
    this.maxWidth = options.maxWidth || '500px'
    this.onOpen = options.onOpen
    this.onClose = options.onClose
    this.onAction = options.onAction
    this.element = null
    this.backdrop = null
    this.resolvedAction = null
    this.promise = null
    this.resolve = null
    this.reject = null
  }

  _getDefaultButtons() {
    switch (this.type) {
      case DialogType.CONFIRM:
        return [
          { text: 'Cancel', type: 'secondary', action: DialogResult.CANCEL },
          { text: 'Confirm', type: 'primary', action: DialogResult.CONFIRM }
        ]
      case DialogType.PROMPT:
        return [
          { text: 'Cancel', type: 'secondary', action: DialogResult.CANCEL },
          { text: 'OK', type: 'primary', action: DialogResult.OK }
        ]
      case DialogType.WARNING:
      case DialogType.ERROR:
        return [
          { text: 'OK', type: 'primary', action: DialogResult.OK }
        ]
      default:
        return [
          { text: 'OK', type: 'primary', action: DialogResult.OK }
        ]
    }
  }

  getTypeClass() {
    return `dialog-${this.type}`
  }

  getPositionClass() {
    return `dialog-position-${this.position}`
  }

  async show() {
    return new Promise((resolve, reject) => {
      this.promise = { resolve, reject }
      this.resolve = resolve
      this.reject = reject
      
      // Create and show the dialog
      this._createElements()
      this._showElements()
      this._bindEvents()
      
      // Call onOpen callback
      if (this.onOpen) {
        try {
          this.onOpen(this)
        } catch (error) {
          console.error('Dialog onOpen error:', error)
        }
      }
      
      // Auto-focus first button
      this._focusFirstButton()
    })
  }

  _createElements() {
    // Create backdrop
    this.backdrop = document.createElement('div')
    this.backdrop.className = 'dialog-backdrop'
    this.backdrop.style.zIndex = this.zIndex - 1
    this.backdrop.style.opacity = (pluginLoader.getConfig('dialog') || {}).backdropOpacity || 0.5

    // Create dialog
    this.element = document.createElement('div')
    this.element.className = `dialog ${this.getTypeClass()} ${this.getPositionClass()}`
    this.element.dataset.id = this.id
    this.element.style.zIndex = this.zIndex
    
    if (this.width !== 'auto') {
      this.element.style.width = this.width
    }
    if (this.maxWidth !== 'auto') {
      this.element.style.maxWidth = this.maxWidth
    }

    // Create content
    const content = this._createContent()
    this.element.appendChild(content)

    // Add to body
    document.body.appendChild(this.backdrop)
    document.body.appendChild(this.element)
  }

  _createContent() {
    const fragment = document.createDocumentFragment()
    
    // Header with title
    if (this.title) {
      const header = document.createElement('div')
      header.className = 'dialog-header'
      header.innerHTML = html`<h3 class="dialog-title">${this.title}</h3>`
      fragment.appendChild(header)
    }

    // Body with message or HTML
    const body = document.createElement('div')
    body.className = 'dialog-body'
    
    if (this.html) {
      body.innerHTML = this.html
    } else {
      body.textContent = this.message
    }
    
    // Handle prompt input
    if (this.type === DialogType.PROMPT && !this.html) {
      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'dialog-input'
      if (this.options?.defaultValue) {
        input.value = this.options.defaultValue
      }
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this._handleAction(DialogResult.OK, input.value)
        }
      })
      body.appendChild(input)
      this._inputElement = input
    }
    
    fragment.appendChild(body)

    // Footer with buttons
    const footer = document.createElement('div')
    footer.className = 'dialog-footer'
    
    for (const button of this.buttons) {
      const btn = document.createElement('button')
      btn.className = `dialog-button dialog-button-${button.type || 'default'}`
      btn.textContent = button.text
      btn.dataset.action = button.action || DialogResult.OK
      footer.appendChild(btn)
    }
    
    fragment.appendChild(footer)

    return fragment
  }

  _showElements() {
    if (this.animation) {
      this.backdrop.classList.add('dialog-backdrop-animate')
      this.element.classList.add('dialog-animate')
    }
    
    this.backdrop.style.display = 'block'
    this.element.style.display = 'block'
  }

  _bindEvents() {
    const config = pluginLoader.getConfig('dialog') || {}

    // Backdrop click
    if (this.backdropClose !== false && config.backdropClose !== false) {
      this.backdrop.addEventListener('click', () => {
        this._handleAction(DialogResult.DISMISS)
      })
    }

    // Escape key
    if (this.escapeClose !== false && config.escapeClose !== false) {
      this._escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this._handleAction(DialogResult.DISMISS)
        }
      }
      window.addEventListener('keydown', this._escapeHandler)
    }

    // Button clicks
    const buttons = this.element.querySelectorAll('.dialog-button')
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action
        if (this.type === DialogType.PROMPT && this._inputElement) {
          this._handleAction(action, this._inputElement.value)
        } else {
          this._handleAction(action)
        }
      })
    }
  }

  _focusFirstButton() {
    const buttons = this.element.querySelectorAll('.dialog-button')
    if (buttons.length > 0) {
      buttons[0].focus()
    } else if (this._inputElement) {
      this._inputElement.focus()
    }
  }

  _handleAction(action, value) {
    this.resolvedAction = action
    
    // Call onAction callback
    if (this.onAction) {
      try {
        this.onAction({ action, value, dialog: this })
      } catch (error) {
        console.error('Dialog onAction error:', error)
      }
    }
    
    // Resolve promise
    if (this.resolve) {
      this.resolve({ action, value })
    }
    
    // Close the dialog
    this.close()
  }

  close() {
    if (!this.element) return
    
    // Remove from DOM
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.remove()
    }
    if (this.element && this.element.parentNode) {
      this.element.remove()
    }
    
    // Clean up event listeners
    if (this._escapeHandler) {
      window.removeEventListener('keydown', this._escapeHandler)
    }
    
    // Call onClose callback
    if (this.onClose) {
      try {
        this.onClose({ action: this.resolvedAction, dialog: this })
      } catch (error) {
        console.error('Dialog onClose error:', error)
      }
    }
    
    this.element = null
    this.backdrop = null
  }

  static dismissAll() {
    const dialogs = document.querySelectorAll('.dialog')
    for (const dialog of dialogs) {
      dialog.remove()
    }
    const backdrops = document.querySelectorAll('.dialog-backdrop')
    for (const backdrop of backdrops) {
      backdrop.remove()
    }
  }
}

/**
 * Dialog Plugin class
 */
export class DialogPlugin {
  constructor() {
    this.dialogs = new Map()
    this.enabled = true
    this._initEventListeners()
  }

  _initEventListeners() {
    // Listen for dialog events
    eventBus.on('dialog.show', (options) => {
      this.show(options)
    })

    eventBus.on('dialog.alert', (options) => {
      this.alert(options)
    })

    eventBus.on('dialog.confirm', (options) => {
      this.confirm(options)
    })

    eventBus.on('dialog.prompt', (options) => {
      this.prompt(options)
    })

    eventBus.on('dialog.dismissAll', () => {
      Dialog.dismissAll()
    })
  }

  /**
   * Show a dialog
   * @param {object} options - Dialog options
   * @returns {Promise<object>} Dialog result
   */
  show(options = {}) {
    if (!this.enabled) {
      return Promise.reject(new Error('Dialog plugin is disabled'))
    }

    const config = pluginLoader.getConfig('dialog') || {}
    
    const dialog = new Dialog({
      type: config.defaultType || DialogType.INFO,
      position: config.defaultPosition || DialogPosition.CENTER,
      backdropClose: config.backdropClose !== false,
      escapeClose: config.escapeClose !== false,
      animation: config.animation !== false,
      ...options
    })

    // Store dialog
    this.dialogs.set(dialog.id, dialog)

    // Clean up on close
    dialog.onClose = () => {
      this.dialogs.delete(dialog.id)
    }

    return dialog.show()
  }

  /**
   * Show an alert dialog
   * @param {object} options - Alert options
   * @returns {Promise<object>} Dialog result
   */
  alert(options = {}) {
    return this.show({
      type: DialogType.INFO,
      ...options,
      buttons: [
        { text: options.okText || 'OK', type: 'primary', action: DialogResult.OK }
      ]
    })
  }

  /**
   * Show a confirm dialog
   * @param {object} options - Confirm options
   * @returns {Promise<object>} Dialog result
   */
  confirm(options = {}) {
    return this.show({
      type: DialogType.CONFIRM,
      ...options,
      buttons: [
        { text: options.cancelText || 'Cancel', type: 'secondary', action: DialogResult.CANCEL },
        { text: options.confirmText || 'Confirm', type: 'primary', action: DialogResult.CONFIRM }
      ]
    })
  }

  /**
   * Show a prompt dialog
   * @param {object} options - Prompt options
   * @returns {Promise<object>} Dialog result with value
   */
  prompt(options = {}) {
    return this.show({
      type: DialogType.PROMPT,
      ...options,
      buttons: [
        { text: options.cancelText || 'Cancel', type: 'secondary', action: DialogResult.CANCEL },
        { text: options.okText || 'OK', type: 'primary', action: DialogResult.OK }
      ]
    })
  }

  /**
   * Show an error dialog
   * @param {object} options - Error options
   * @returns {Promise<object>} Dialog result
   */
  error(options = {}) {
    return this.show({
      type: DialogType.ERROR,
      title: options.title || 'Error',
      ...options,
      buttons: [
        { text: options.okText || 'OK', type: 'primary', action: DialogResult.OK }
      ]
    })
  }

  /**
   * Show a success dialog
   * @param {object} options - Success options
   * @returns {Promise<object>} Dialog result
   */
  success(options = {}) {
    return this.show({
      type: DialogType.SUCCESS,
      title: options.title || 'Success',
      ...options,
      buttons: [
        { text: options.okText || 'OK', type: 'primary', action: DialogResult.OK }
      ]
    })
  }

  /**
   * Show a warning dialog
   * @param {object} options - Warning options
   * @returns {Promise<object>} Dialog result
   */
  warning(options = {}) {
    return this.show({
      type: DialogType.WARNING,
      title: options.title || 'Warning',
      ...options
    })
  }

  /**
   * Dismiss all open dialogs
   */
  dismissAll() {
    Dialog.dismissAll()
    this.dialogs.clear()
  }

  /**
   * Get all open dialogs
   * @returns {Dialog[]}
   */
  getAll() {
    return [...this.dialogs.values()]
  }

  /**
   * Get dialog count
   * @returns {number}
   */
  getCount() {
    return this.dialogs.size
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
    this.dismissAll()
  }

  /**
   * Destroy the plugin and clean up
   */
  destroy() {
    this.dismissAll()
    this.dialogs.clear()
  }
}

/**
 * Create and initialize the dialog plugin
 */
export function createPlugin() {
  return new DialogPlugin()
}

/**
 * Plugin initialization
 */
export async function init(context, config) {
  const plugin = createPlugin()
  
  // Apply configuration
  if (config) {
    pluginLoader.setConfig('dialog', config)
  }
  
  // Register the plugin's API
  context.dialog = {
    show: plugin.show.bind(plugin),
    alert: plugin.alert.bind(plugin),
    confirm: plugin.confirm.bind(plugin),
    prompt: plugin.prompt.bind(plugin),
    error: plugin.error.bind(plugin),
    success: plugin.success.bind(plugin),
    warning: plugin.warning.bind(plugin),
    dismissAll: plugin.dismissAll.bind(plugin),
    getAll: plugin.getAll.bind(plugin),
    getCount: plugin.getCount.bind(plugin),
    isEnabled: plugin.isEnabled.bind(plugin),
    enable: plugin.enable.bind(plugin),
    disable: plugin.disable.bind(plugin),
    destroy: plugin.destroy.bind(plugin)
  }
  
  // Add to global context
  window.dialog = context.dialog
  
  // Add static method
  context.dialog.dismissAllStatic = Dialog.dismissAll
  
  return plugin
}

/**
 * Plugin start
 */
export function start(context, config) {
  const plugin = context.dialog?._plugin
  if (plugin) {
    plugin.enable()
  }
}

/**
 * Plugin stop
 */
export function stop(context, config) {
  const plugin = context.dialog?._plugin
  if (plugin) {
    plugin.disable()
  }
}

/**
 * Plugin destroy
 */
export function destroy(context, config) {
  const plugin = context.dialog?._plugin
  if (plugin) {
    plugin.destroy()
  }
  delete context.dialog
  delete window.dialog
}

// Convenience API
export const dialog = {
  show: (options) => pluginLoader.getExports('dialog')?.show?.(options),
  alert: (options) => pluginLoader.getExports('dialog')?.alert?.(options),
  confirm: (options) => pluginLoader.getExports('dialog')?.confirm?.(options),
  prompt: (options) => pluginLoader.getExports('dialog')?.prompt?.(options),
  error: (options) => pluginLoader.getExports('dialog')?.error?.(options),
  success: (options) => pluginLoader.getExports('dialog')?.success?.(options),
  warning: (options) => pluginLoader.getExports('dialog')?.warning?.(options),
  dismissAll: () => pluginLoader.getExports('dialog')?.dismissAll?.()
}

// Dialog component for use in templates
export class DialogComponent extends ReactiveComponent {
  constructor() {
    super()
    this.options = {}
    this.dialog = null
  }

  setOptions(options) {
    this.options = { ...this.options, ...options }
  }

  show() {
    this.dialog = dialog.show(this.options)
    return this.dialog
  }

  hide() {
    if (this.dialog) {
      this.dialog.close()
    }
  }

  render() {
    return html`<slot></slot>`
  }
}

// Define custom element
if (!customElements.get('dialog-component')) {
  customElements.define('dialog-component', DialogComponent)
}

export default {
  manifest,
  init,
  start,
  stop,
  destroy,
  DialogPlugin,
  Dialog,
  DialogType,
  DialogPosition,
  DialogResult,
  dialog,
  DialogComponent
}
