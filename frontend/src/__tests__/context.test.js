import { describe, it, expect } from 'bun:test'
import { createContext } from '../core/context.js'

describe('createContext', () => {
	it('should return provide and consume methods', () => {
		const ctx = createContext('default')
		expect(typeof ctx.provide).toBe('function')
		expect(typeof ctx.consume).toBe('function')
	})

	it('should return default value when not provided', () => {
		const ctx = createContext('default')
		expect(ctx.consume()).toBe('default')
	})

	it('should return provided value', () => {
		const ctx = createContext('default')
		ctx.provide('custom')
		expect(ctx.consume()).toBe('custom')
	})

	it('should support different contexts with same default', () => {
		const ctx1 = createContext('same')
		const ctx2 = createContext('same')
		ctx1.provide('first')
		ctx2.provide('second')
		expect(ctx1.consume()).toBe('first')
		expect(ctx2.consume()).toBe('second')
	})

	it('should handle object defaults', () => {
		const defaultVal = { theme: 'dark', lang: 'en' }
		const ctx = createContext(defaultVal)
		expect(ctx.consume()).toEqual(defaultVal)
	})

	it('should handle null default', () => {
		const ctx = createContext(null)
		expect(ctx.consume()).toBeNull()
	})

	it('should handle providing null', () => {
		const ctx = createContext('default')
		ctx.provide(null)
		expect(ctx.consume()).toBeNull()
	})

	it('should handle providing undefined', () => {
		const ctx = createContext('default')
		ctx.provide(undefined)
		expect(ctx.consume()).toBeUndefined() // WeakMap stores undefined as value
	})
})
