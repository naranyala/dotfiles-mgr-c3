/**
 * Shared utility functions for the frontend
 */

/**
 * String utilities
 */

export function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value) || typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function isBlank(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return /^\s*$/.test(value)
  return isEmpty(value)
}

export function trim(value, chars = '\s') {
  if (value === null || value === undefined) return ''
  const regex = new RegExp(`^[${chars}]+|[${chars}]+$`, 'g')
  return value.toString().replace(regex, '')
}

export function trimStart(value, chars = '\s') {
  if (value === null || value === undefined) return ''
  const regex = new RegExp(`^[${chars}]+`)
  return value.toString().replace(regex, '')
}

export function trimEnd(value, chars = '\s') {
  if (value === null || value === undefined) return ''
  const regex = new RegExp(`[${chars}]+$`)
  return value.toString().replace(regex, '')
}

/**
 * Capitalization
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function uppercase(str) {
  if (!str) return ''
  return str.toUpperCase()
}

export function lowercase(str) {
  if (!str) return ''
  return str.toLowerCase()
}

export function camelCase(str) {
  if (!str) return ''
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, m => m.toLowerCase())
}

export function snakeCase(str) {
  if (!str) return ''
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/_+/g, '_')
}

export function kebabCase(str) {
  if (!str) return ''
  return snakeCase(str).replace(/_/g, '-')
}

/**
 * String manipulation
 */
export function repeat(str, times) {
  if (times <= 0) return ''
  if (times === 1) return str || ''
  let result = ''
  for (let i = 0; i < times; i++) {
    result += str
  }
  return result
}

export function padStart(str, length, pad = ' ') {
  if (!str) str = ''
  while (str.length < length) {
    str = pad + str
  }
  return str
}

export function padEnd(str, length, pad = ' ') {
  if (!str) str = ''
  while (str.length < length) {
    str = str + pad
  }
  return str
}

export function pad(str, length, pad = ' ') {
  const padLength = length - (str?.length || 0)
  const leftPad = Math.floor(padLength / 2)
  const rightPad = padLength - leftPad
  return (pad.repeat(leftPad) || '') + (str || '') + (pad.repeat(rightPad) || '')
}

/**
 * Type checking
 */
export function isString(value) {
  return typeof value === 'string'
}

export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

export function isInteger(value) {
  return isNumber(value) && Number.isInteger(value)
}

export function isBoolean(value) {
  return typeof value === 'boolean'
}

export function isFunction(value) {
  return typeof value === 'function'
}

export function isArray(value) {
  return Array.isArray(value)
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !isArray(value)
}

export function isPlainObject(value) {
  if (!isObject(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

export function isNullOrUndefined(value) {
  return value === null || value === undefined
}

export function isDefined(value) {
  return value !== undefined
}

export function isNullish(value) {
  return value === null || value === undefined
}

/**
 * Value comparison
 */
export function deepEqual(a, b) {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  
  if (aKeys.length !== bKeys.length) return false
  
  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }
  
  return true
}

export function shallowEqual(a, b) {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  
  if (aKeys.length !== bKeys.length) return false
  
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false
  }
  
  return true
}

/**
 * Object utilities
 */
export function cloneDeep(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (isArray(obj)) return obj.map(cloneDeep)
  if (isDate(obj)) return new Date(obj)
  if (isRegExp(obj)) return new RegExp(obj)
  
  const cloned = {}
  for (const key of Object.keys(obj)) {
    cloned[key] = cloneDeep(obj[key])
  }
  return cloned
}

export function cloneShallow(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (isArray(obj)) return [...obj]
  return { ...obj }
}

export function mergeDeep(target, source) {
  if (!isObject(target) || !isObject(source)) return source
  
  const result = { ...target }
  
  for (const key of Object.keys(source)) {
    const targetValue = target[key]
    const sourceValue = source[key]
    
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key] = mergeDeep(targetValue, sourceValue)
    } else if (isArray(targetValue) && isArray(sourceValue)) {
      result[key] = [...targetValue, ...sourceValue]
    } else {
      result[key] = sourceValue
    }
  }
  
  return result
}

export function mergeShallow(target, source) {
  return { ...target, ...source }
}

export function pick(obj, keys) {
  if (!isObject(obj)) return {}
  const result = {}
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

export function omit(obj, keys) {
  if (!isObject(obj)) return {}
  const result = {}
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) {
      result[key] = obj[key]
    }
  }
  return result
}

export function mapKeys(obj, fn) {
  if (!isObject(obj)) return {}
  const result = {}
  for (const key of Object.keys(obj)) {
    result[fn(key, obj[key])] = obj[key]
  }
  return result
}

export function mapValues(obj, fn) {
  if (!isObject(obj)) return {}
  const result = {}
  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key], key)
  }
  return result
}

export function invert(obj) {
  if (!isObject(obj)) return {}
  const result = {}
  for (const key of Object.keys(obj)) {
    result[obj[key]] = key
  }
  return result
}

export function get(obj, path, defaultValue = undefined) {
  if (!isObject(obj)) return defaultValue
  
  const keys = Array.isArray(path) ? path : path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current === null || typeof current !== 'object') return defaultValue
    if (!(key in current)) return defaultValue
    current = current[key]
  }
  
  return current !== undefined ? current : defaultValue
}

export function set(obj, path, value) {
  if (!isObject(obj)) return obj
  
  const keys = Array.isArray(path) ? path : path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
  return obj
}

export function has(obj, path) {
  return get(obj, path) !== undefined
}

/**
 * Date utilities
 */
export function isDate(value) {
  return value instanceof Date
}

export function now() {
  return Date.now()
}

export function timestamp() {
  return Math.floor(Date.now() / 1000)
}

export function dateFormat(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) date = new Date()
  if (!(date instanceof Date)) date = new Date(date)
  
  const pad = (n) => String(n).padStart(2, '0')
  
  return format
    .replace(/YYYY/g, date.getFullYear())
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/DD/g, pad(date.getDate()))
    .replace(/HH/g, pad(date.getHours()))
    .replace(/mm/g, pad(date.getMinutes()))
    .replace(/ss/g, pad(date.getSeconds()))
    .replace(/SSS/g, String(date.getMilliseconds()).padStart(3, '0'))
}

export function timeAgo(date, nowDate = new Date()) {
  if (!date) return ''
  if (!(date instanceof Date)) date = new Date(date)
  
  const seconds = Math.floor((nowDate - date) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '0 B'
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '0'
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '0%'
  const num = Number(value) * 100
  return `${num.toFixed(decimals)}%`
}

/**
 * Array utilities
 */
export function chunk(array, size) {
  if (!isArray(array)) return []
  const result = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export function compact(array) {
  if (!isArray(array)) return []
  return array.filter(item => item !== null && item !== undefined && item !== '')
}

export function flatten(array) {
  if (!isArray(array)) return []
  let result = []
  const stack = [...array]
  
  while (stack.length) {
    const item = stack.pop()
    if (isArray(item)) {
      stack.push(...item)
    } else {
      result.push(item)
    }
  }
  
  return result.reverse()
}

export function flattenDepth(array, depth = 1) {
  if (!isArray(array)) return []
  return array.reduce((result, item) => {
    if (isArray(item) && depth > 0) {
      return [...result, ...flattenDepth(item, depth - 1)]
    }
    return [...result, item]
  }, [])
}

export function uniq(array) {
  if (!isArray(array)) return []
  return [...new Set(array)]
}

export function uniqBy(array, fn) {
  if (!isArray(array)) return []
  const seen = new Set()
  return array.filter(item => {
    const key = fn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function uniqWith(array, comparator) {
  if (!isArray(array)) return []
  const result = []
  for (const item of array) {
    if (!result.some(existing => comparator(item, existing))) {
      result.push(item)
    }
  }
  return result
}

export function groupBy(array, fn) {
  if (!isArray(array)) return {}
  return array.reduce((result, item) => {
    const key = fn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
    return result
  }, {})
}

export function keyBy(array, fn) {
  if (!isArray(array)) return {}
  return array.reduce((result, item) => {
    result[fn(item)] = item
    return result
  }, {})
}

export function partition(array, predicate) {
  if (!isArray(array)) return [[], []]
  return array.reduce(([passed, failed], item) => {
    return predicate(item) ? [[...passed, item], failed] : [passed, [...failed, item]]
  }, [[], []])
}

export function orderBy(array, predicates, orders) {
  if (!isArray(array)) return []
  return [...array].sort((a, b) => {
    for (let i = 0; i < predicates.length; i++) {
      const aVal = predicates[i](a)
      const bVal = predicates[i](b)
      const order = orders?.[i] === 'desc' ? -1 : 1
      
      if (aVal < bVal) return -order
      if (aVal > bVal) return order
    }
    return 0
  })
}

export function range(start, end, step = 1) {
  const result = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}

export function rangeRight(start, end, step = 1) {
  const result = []
  for (let i = start; i > end; i -= step) {
    result.push(i)
  }
  return result
}

/**
 * Function utilities
 */
export function debounce(fn, wait = 300) {
  let timeout = null
  return function(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), wait)
  }
}

export function throttle(fn, wait = 300) {
  let lastTime = 0
  let timeout = null
  return function(...args) {
    const now = Date.now()
    clearTimeout(timeout)
    if (now - lastTime >= wait) {
      fn.apply(this, args)
      lastTime = now
    } else {
      timeout = setTimeout(() => {
        fn.apply(this, args)
        lastTime = Date.now()
      }, wait - (now - lastTime))
    }
  }
}

export function once(fn) {
  let called = false
  return function(...args) {
    if (called) return
    called = true
    return fn.apply(this, args)
  }
}

export function memoize(fn, resolver) {
  const cache = new Map()
  return function(...args) {
    const key = resolver ? resolver.apply(this, args) : args[0]
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

export function flow(...fns) {
  return function(...args) {
    return fns.reduce((result, fn) => fn(result), ...args)
  }
}

export function pipe(...fns) {
  return flow(...fns.reverse())
}

/**
 * Path utilities
 */
export function basename(path, ext) {
  if (!path) return ''
  const parts = path.split(/[\\/]/)
  let filename = parts[parts.length - 1]
  if (ext && filename.endsWith(ext)) {
    filename = filename.slice(0, -ext.length)
  }
  return filename
}

export function dirname(path) {
  if (!path) return ''
  const parts = path.split(/[\\/]/)
  parts.pop()
  return parts.join('/') || '/'
}

export function extname(path) {
  if (!path) return ''
  const match = /(\.[^\\/.]+)$/.exec(path)
  return match ? match[1] : ''
}

export function joinPaths(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}

export function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/')
}

export function resolvePath(base, ...paths) {
  return joinPaths(base, ...paths)
}

export function isAbsolute(path) {
  return path.startsWith('/')
}

export function isRelative(path) {
  return !isAbsolute(path)
}

/**
 * URL utilities
 */
export function parseUrl(url) {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function queryString(params) {
  if (!params) return ''
  return Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

export function parseQuery(query) {
  if (!query) return {}
  if (query.startsWith('?')) query = query.slice(1)
  
  const result = {}
  for (const pair of query.split('&')) {
    if (!pair) continue
    const [key, ...valueParts] = pair.split('=')
    const value = valueParts.join('=')
    if (key) {
      result[decodeURIComponent(key)] = decodeURIComponent(value || '')
    }
  }
  return result
}

export function mergeQuery(url, params) {
  const parsed = parseUrl(url)
  const existing = parseQuery(parsed.search)
  const merged = { ...existing, ...params }
  parsed.search = queryString(merged)
  return parsed.toString()
}

/**
 * DOM utilities
 */
export function addClass(el, className) {
  if (!el) return
  if (el.classList) {
    el.classList.add(className)
  } else {
    el.className += ` ${className}`
  }
}

export function removeClass(el, className) {
  if (!el) return
  if (el.classList) {
    el.classList.remove(className)
  } else {
    el.className = el.className.replace(new RegExp(`(^|\\s)${className}(\\s|$)`, 'g'), '$2')
  }
}

export function toggleClass(el, className, force) {
  if (!el) return
  if (el.classList) {
    el.classList.toggle(className, force)
  } else {
    if (force !== undefined) {
      if (force) {
        addClass(el, className)
      } else {
        removeClass(el, className)
      }
    } else {
      if (hasClass(el, className)) {
        removeClass(el, className)
      } else {
        addClass(el, className)
      }
    }
  }
}

export function hasClass(el, className) {
  if (!el) return false
  if (el.classList) {
    return el.classList.contains(className)
  }
  return el.className.split('\s').includes(className)
}

export function setStyle(el, styles) {
  if (!el) return
  Object.assign(el.style, styles)
}

export function getStyle(el, property) {
  if (!el) return ''
  return window.getComputedStyle ? window.getComputedStyle(el)[property] : el.style[property]
}

export function createElement(tag, options = {}, ...children) {
  const el = document.createElement(tag)
  
  // Set attributes
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      el.setAttribute(key, value)
    }
  }
  
  // Set properties
  for (const [key, value] of Object.entries(options)) {
    if (key === 'attrs' || key === 'children') continue
    el[key] = value
  }
  
  // Append children
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue
    if (isArray(child)) {
      el.append(...child.filter(Boolean))
    } else {
      el.append(child)
    }
  }
  
  return el
}

/**
 * Random utilities
 */
export function random(min = 0, max = 1) {
  return Math.random() * (max - min) + min
}

export function randomInt(min = 0, max = 1) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function uid(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Type guards
 */
export function isPromise(value) {
  return value !== null && typeof value === 'object' && typeof value.then === 'function'
}

export function isError(value) {
  return value instanceof Error
}

export function isRegExp(value) {
  return value instanceof RegExp
}

export function isMap(value) {
  return value instanceof Map
}

export function isSet(value) {
  return value instanceof Set
}

export function isWeakMap(value) {
  return value instanceof WeakMap
}

export function isWeakSet(value) {
  return value instanceof WeakSet
}

export function isSymbol(value) {
  return typeof value === 'symbol'
}

export function isBigInt(value) {
  return typeof value === 'bigint'
}

export function isIterable(value) {
  return value !== null && typeof value[Symbol.iterator] === 'function'
}

export async function isAsyncIterable(value) {
  return value !== null && typeof value[Symbol.asyncIterator] === 'function'
}

/**
 * Color utilities
 */
export function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 }
  
  // Remove # if present
  hex = hex.replace(/^#/, '')
  
  // Parse r, g, b
  let r, g, b
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  } else {
    return { r: 0, g: 0, b: 0 }
  }
  
  return { r, g, b }
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => {
    const hex = Math.round(c).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    
    h *= 60
  }
  
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  
  let r, g, b
  
  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0]
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0]
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x]
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c]
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c]
  } else {
    [r, g, b] = [c, 0, x]
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

export function lighten(color, percent) {
  const { r, g, b } = hexToRgb(color)
  const { h, s, l } = rgbToHsl(r, g, b)
  return rgbToHex(
    ...Object.values(hslToRgb(h, s, Math.min(100, l + percent)))
  )
}

export function darken(color, percent) {
  const { r, g, b } = hexToRgb(color)
  const { h, s, l } = rgbToHsl(r, g, b)
  return rgbToHex(
    ...Object.values(hslToRgb(h, s, Math.max(0, l - percent)))
  )
}

export function alpha(color, opacity) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Storage utilities
 */
export function getLocalStorage<T>(key: string, defaultValue?: T): T {
  if (typeof window === 'undefined') return defaultValue as T
  const item = window.localStorage.getItem(key)
  if (item === null) return defaultValue as T
  try {
    return JSON.parse(item)
  } catch {
    return item as unknown as T
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    window.localStorage.setItem(key, String(value))
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

export function clearLocalStorage(): void {
  if (typeof window === 'undefined') return
  window.localStorage.clear()
}

export function getSessionStorage<T>(key: string, defaultValue?: T): T {
  if (typeof window === 'undefined') return defaultValue as T
  const item = window.sessionStorage.getItem(key)
  if (item === null) return defaultValue as T
  try {
    return JSON.parse(item)
  } catch {
    return item as unknown as T
  }
}

export function setSessionStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    window.sessionStorage.setItem(key, String(value))
  }
}

// Export all utilities as a single object for convenience
export const utils = {
  // String
  isEmpty,
  isBlank,
  trim,
  trimStart,
  trimEnd,
  capitalize,
  uppercase,
  lowercase,
  camelCase,
  snakeCase,
  kebabCase,
  repeat,
  padStart,
  padEnd,
  pad,
  
  // Type checking
  isString,
  isNumber,
  isInteger,
  isBoolean,
  isFunction,
  isArray,
  isObject,
  isPlainObject,
  isNullOrUndefined,
  isDefined,
  isNullish,
  
  // Comparison
  deepEqual,
  shallowEqual,
  
  // Object
  cloneDeep,
  cloneShallow,
  mergeDeep,
  mergeShallow,
  pick,
  omit,
  mapKeys,
  mapValues,
  invert,
  get,
  set,
  has,
  
  // Date
  isDate,
  now,
  timestamp,
  dateFormat,
  timeAgo,
  formatBytes,
  formatNumber,
  formatPercentage,
  
  // Array
  chunk,
  compact,
  flatten,
  flattenDepth,
  uniq,
  uniqBy,
  uniqWith,
  groupBy,
  keyBy,
  partition,
  orderBy,
  range,
  rangeRight,
  
  // Function
  debounce,
  throttle,
  once,
  memoize,
  flow,
  pipe,
  
  // Path
  basename,
  dirname,
  extname,
  joinPaths,
  normalizePath,
  resolvePath,
  isAbsolute,
  isRelative,
  
  // URL
  parseUrl,
  queryString,
  parseQuery,
  mergeQuery,
  
  // DOM
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  setStyle,
  getStyle,
  createElement,
  
  // Random
  random,
  randomInt,
  uid,
  uuid,
  
  // Type guards
  isPromise,
  isError,
  isRegExp,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isSymbol,
  isBigInt,
  isIterable,
  isAsyncIterable,
  
  // Color
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  lighten,
  darken,
  alpha,
  
  // Storage
  getLocalStorage,
  setLocalStorage,
  removeLocalStorage,
  clearLocalStorage,
  getSessionStorage,
  setSessionStorage
}

export default utils
