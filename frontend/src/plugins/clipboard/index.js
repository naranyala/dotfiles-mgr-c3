/**
 * Clipboard Plugin
 * 
 * Provides clipboard operations (copy, paste, cut) for the frontend.
 * Works with text and HTML content.
 */

import { pluginLoader } from '../../core/plugin-loader.js'
import { eventBus } from '../../core/event-bus.js'
import { html, signal } from '../../core/index.js'

/**
 * Clipboard plugin manifest
 */
export const manifest = {
  id: 'clipboard',
  name: 'Clipboard',
  version: '1.0.0',
  description: 'Provides clipboard copy/paste/cut operations',
  author: 'dotfiles-mgr',
  config: {
    // Maximum length of text to copy (0 = no limit)
    maxCopyLength: 0,
    // Show copy notifications
    showNotifications: true,
    // Sanitize HTML before copying
    sanitizeHtml: true
  }
}

/**
 * Clipboard content types
 */
export const ClipboardType = {
  TEXT: 'text/plain',
  HTML: 'text/html',
  RICH_TEXT: 'text/rtf',
  IMAGE: 'image/png'
}

/**
 * Clipboard plugin class
 */
class ClipboardPlugin {
  constructor() {
    this.enabled = true
    this.history = []
    this.maxHistory = 100
    this._initListeners()
  }

  _initListeners() {
    // Listen for copy events from other plugins
    eventBus.on('clipboard.copy', ({ text, type }) => {
      this.copy(text, type)
    })
  }

  /**
   * Check if clipboard API is available
   */
  isSupported() {
    return !!navigator.clipboard
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
    return true
  }

  /**
   * Disable the plugin
   */
  disable() {
    this.enabled = false
    return true
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @param {string} [type='text/plain'] - Content type
   * @returns {Promise<boolean>} Success status
   */
  async copy(text, type = ClipboardType.TEXT) {
    if (!this.enabled || !text) {
      return false
    }

    const config = pluginLoader.getConfig('clipboard') || {}
    const maxLength = config.maxCopyLength || 0

    if (maxLength > 0 && text.length > maxLength) {
      text = text.substring(0, maxLength)
    }

    try {
      // Use modern clipboard API
      if (this.isSupported()) {
        await navigator.clipboard.writeText(text)
        
        // Add to history
        this._addToHistory(text, type)
        
        // Emit copy event
        eventBus.emit('clipboard.copied', { text, type })
        
        // Show notification if enabled
        if (config.showNotifications) {
          this._showNotification('Copied to clipboard')
        }
        
        return true
      }
      
      // Fallback for older browsers
      return this._fallbackCopy(text)
    } catch (error) {
      console.error('Clipboard copy failed:', error)
      eventBus.emit('clipboard.error', { action: 'copy', error })
      return false
    }
  }

  /**
   * Copy HTML to clipboard
   * @param {string} html - HTML content
   * @param {string} [text] - Fallback text
   * @returns {Promise<boolean>} Success status
   */
  async copyHtml(html, text = '') {
    if (!this.enabled || !html) {
      return false
    }

    const config = pluginLoader.getConfig('clipboard') || {}

    try {
      if (this.isSupported()) {
        // Create clipboard item
        const blob = new Blob([html], { type: 'text/html' })
        const data = [
          new ClipboardItem({
            'text/html': blob,
            'text/plain': new Blob([text || html], { type: 'text/plain' })
          })
        ]
        
        await navigator.clipboard.write(data)
        
        // Add to history
        this._addToHistory(html, ClipboardType.HTML)
        
        // Emit copy event
        eventBus.emit('clipboard.copied', { html, text, type: ClipboardType.HTML })
        
        if (config.showNotifications) {
          this._showNotification('Copied HTML to clipboard')
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Clipboard copy HTML failed:', error)
      eventBus.emit('clipboard.error', { action: 'copyHtml', error })
      return false
    }
  }

  /**
   * Paste text from clipboard
   * @returns {Promise<string>} Pasted text
   */
  async paste() {
    if (!this.enabled) {
      return ''
    }

    try {
      if (this.isSupported()) {
        const text = await navigator.clipboard.readText()
        
        // Emit paste event
        eventBus.emit('clipboard.pasted', { text })
        
        return text
      }
      
      // Fallback for older browsers
      return this._fallbackPaste()
    } catch (error) {
      console.error('Clipboard paste failed:', error)
      eventBus.emit('clipboard.error', { action: 'paste', error })
      return ''
    }
  }

  /**
   * Paste HTML from clipboard
   * @returns {Promise<{html: string, text: string}>} Pasted content
   */
  async pasteHtml() {
    if (!this.enabled) {
      return { html: '', text: '' }
    }

    try {
      if (this.isSupported()) {
        const items = await navigator.clipboard.read()
        
        let html = ''
        let text = ''
        
        for (const item of items) {
          for (const type of item.types) {
            if (type === ClipboardType.HTML) {
              const blob = await item.getType(type)
              html = await blob.text()
            } else if (type === ClipboardType.TEXT) {
              const blob = await item.getType(type)
              text = await blob.text()
            }
          }
        }
        
        eventBus.emit('clipboard.pasted', { html, text })
        
        return { html, text }
      }
      
      return { html: '', text: '' }
    } catch (error) {
      console.error('Clipboard paste HTML failed:', error)
      eventBus.emit('clipboard.error', { action: 'pasteHtml', error })
      return { html: '', text: '' }
    }
  }

  /**
   * Clear clipboard content
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    if (!this.enabled) {
      return false
    }

    try {
      if (this.isSupported()) {
        await navigator.clipboard.writeText('')
        this.history = []
        
        eventBus.emit('clipboard.cleared')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Clipboard clear failed:', error)
      eventBus.emit('clipboard.error', { action: 'clear', error })
      return false
    }
  }

  /**
   * Copy to clipboard with formatting
   * @param {HTMLElement} element - DOM element to copy
   * @returns {Promise<boolean>} Success status
   */
  async copyElement(element) {
    if (!this.enabled || !element) {
      return false
    }

    try {
      const text = element.textContent || ''
      const html = element.innerHTML || ''
      
      // Use HTML copy if there's HTML content
      if (html && html !== text) {
        return this.copyHtml(html, text)
      }
      
      return this.copy(text)
    } catch (error) {
      console.error('Clipboard copy element failed:', error)
      eventBus.emit('clipboard.error', { action: 'copyElement', error })
      return false
    }
  }

  /**
   * Copy selected text
   * @returns {Promise<boolean>} Success status
   */
  async copySelection() {
    if (!this.enabled) {
      return false
    }

    const selection = window.getSelection()
    if (!selection || selection.toString().length === 0) {
      return false
    }

    return this.copy(selection.toString())
  }

  /**
   * Get clipboard history
   * @returns {Array} History array
   */
  getHistory() {
    return [...this.history]
  }

  /**
   * Clear clipboard history
   */
  clearHistory() {
    this.history = []
  }

  /**
   * Copy with rich formatting
   * @param {object} data - Rich data object
   * @param {string} data.text - Plain text
   * @param {string} data.html - HTML content
   * @returns {Promise<boolean>} Success status
   */
  async copyRich(data) {
    if (!this.enabled || !data) {
      return false
    }

    try {
      if (this.isSupported()) {
        const items = []
        
        if (data.html) {
          items.push(
            new ClipboardItem({
              'text/html': new Blob([data.html], { type: 'text/html' }),
              'text/plain': new Blob([data.text || ''], { type: 'text/plain' })
            })
          )
        } else {
          items.push(
            new ClipboardItem({
              'text/plain': new Blob([data.text || ''], { type: 'text/plain' })
            })
          )
        }
        
        await navigator.clipboard.write(items)
        
        this._addToHistory(data.text, data.html ? ClipboardType.HTML : ClipboardType.TEXT)
        
        eventBus.emit('clipboard.copied', { data })
        
        const config = pluginLoader.getConfig('clipboard') || {}
        if (config.showNotifications) {
          this._showNotification('Copied to clipboard')
        }
        
        return true
      }
      
      // Fallback
      return this.copy(data.text)
    } catch (error) {
      console.error('Clipboard copy rich failed:', error)
      eventBus.emit('clipboard.error', { action: 'copyRich', error })
      return false
    }
  }

  /**
   * Fallback copy for older browsers
   */
  _fallbackCopy(text) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    
    textarea.select()
    const success = document.execCommand('copy')
    
    document.body.removeChild(textarea)
    
    if (success) {
      this._addToHistory(text, ClipboardType.TEXT)
      eventBus.emit('clipboard.copied', { text })
    }
    
    return success
  }

  /**
   * Fallback paste for older browsers
   */
  _fallbackPaste() {
    const textarea = document.createElement('textarea')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    
    textarea.focus()
    const success = document.execCommand('paste')
    const text = textarea.value
    
    document.body.removeChild(textarea)
    
    if (success && text) {
      eventBus.emit('clipboard.pasted', { text })
    }
    
    return text
  }

  /**
   * Add to clipboard history
   */
  _addToHistory(content, type) {
    this.history.unshift({ content, type, timestamp: Date.now() })
    
    // Keep history size limited
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory)
    }
  }

  /**
   * Show notification (simple implementation)
   */
  _showNotification(message) {
    // Emit notification event for notification plugin to handle
    eventBus.emit('notifications.show', {
      message,
      type: 'info',
      timeout: 2000
    })
  }

  /**
   * Sanitize HTML for clipboard
   */
  _sanitizeHtml(html) {
    // Basic sanitization - remove scripts and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
  }
}

/**
 * Create and initialize the clipboard plugin
 */
export function createPlugin() {
  return new ClipboardPlugin()
}

/**
 * Plugin initialization
 */
export async function init(context, config) {
  const plugin = createPlugin()
  
  // Apply configuration
  if (config) {
    pluginLoader.setConfig('clipboard', config)
  }
  
  // Register the plugin's API
  context.clipboard = {
    copy: plugin.copy.bind(plugin),
    copyHtml: plugin.copyHtml.bind(plugin),
    paste: plugin.paste.bind(plugin),
    pasteHtml: plugin.pasteHtml.bind(plugin),
    clear: plugin.clear.bind(plugin),
    copyElement: plugin.copyElement.bind(plugin),
    copySelection: plugin.copySelection.bind(plugin),
    copyRich: plugin.copyRich.bind(plugin),
    isSupported: plugin.isSupported.bind(plugin),
    getHistory: plugin.getHistory.bind(plugin),
    clearHistory: plugin.clearHistory.bind(plugin),
    isEnabled: plugin.isEnabled.bind(plugin),
    enable: plugin.enable.bind(plugin),
    disable: plugin.disable.bind(plugin)
  }
  
  // Add to global context
  window.clipboard = context.clipboard
  
  return plugin
}

/**
 * Plugin start
 */
export function start(context, config) {
  const plugin = context.clipboard?._plugin
  if (plugin) {
    plugin.enable()
  }
}

/**
 * Plugin stop
 */
export function stop(context, config) {
  const plugin = context.clipboard?._plugin
  if (plugin) {
    plugin.disable()
  }
}

/**
 * Plugin destroy
 */
export function destroy(context, config) {
  // Clean up
  delete context.clipboard
  delete window.clipboard
}

// Export the plugin API directly
export const clipboard = {
  copy: (text, type) => pluginLoader.getExports('clipboard')?.copy?.(text, type) || Promise.resolve(false),
  copyHtml: (html, text) => pluginLoader.getExports('clipboard')?.copyHtml?.(html, text) || Promise.resolve(false),
  paste: () => pluginLoader.getExports('clipboard')?.paste?.() || Promise.resolve(''),
  pasteHtml: () => pluginLoader.getExports('clipboard')?.pasteHtml?.() || Promise.resolve({ html: '', text: '' }),
  clear: () => pluginLoader.getExports('clipboard')?.clear?.() || Promise.resolve(false),
  isSupported: () => pluginLoader.getExports('clipboard')?.isSupported?.() || false
}

export default {
  manifest,
  init,
  start,
  stop,
  destroy,
  ClipboardPlugin,
  ClipboardType,
  clipboard
}
