import { describe, it, expect } from 'bun:test'

// Mock HTMLElement for Node.js environment
if (typeof HTMLElement === 'undefined') {
	globalThis.HTMLElement = class HTMLElement {
		constructor() {
			this._shadowRoot = null
			this._attributes = {}
		}
		attachShadow() {
			this._shadowRoot = {
				innerHTML: '',
				querySelector: () => null,
				querySelectorAll: () => [],
				addEventListener: () => {},
				appendChild: () => {},
				childNodes: [],
				children: [],
			}
			return this._shadowRoot
		}
		get shadowRoot() { return this._shadowRoot }
		getAttribute(name) { return this._attributes[name] || null }
		setAttribute(name, value) { this._attributes[name] = value }
		hasAttribute(name) { return name in this._attributes }
	}
}

import { createContext, consume, provideDirective, consumeContext } from '../core/context.js'

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
		expect(ctx.consume()).toBeUndefined()
	})

	it('should have token with id', () => {
		const ctx = createContext('default')
		expect(ctx.token).toBeDefined()
		expect(ctx.id).toBeDefined()
		expect(typeof ctx.id).toBe('string')
	})
})

describe('createContext subscriptions', () => {
	it('should notify subscribers on provide', () => {
		const ctx = createContext('initial')
		const values = []
		ctx.subscribe(v => values.push(v))
		ctx.provide('new')
		expect(values).toEqual(['initial', 'new'])
	})

	it('should return unsubscribe function', () => {
		const ctx = createContext('val')
		const values = []
		const unsub = ctx.subscribe(v => values.push(v))
		ctx.provide('v2')
		unsub()
		ctx.provide('v3')
		expect(values).toEqual(['val', 'v2'])
	})

	it('should notify multiple subscribers', () => {
		const ctx = createContext('start')
		const vals1 = []
		const vals2 = []
		ctx.subscribe(v => vals1.push(v))
		ctx.subscribe(v => vals2.push(v))
		ctx.provide('end')
		expect(vals1).toEqual(['start', 'end'])
		expect(vals2).toEqual(['start', 'end'])
	})
})

describe('createContext Provider', () => {
	it('should have Provider class', () => {
		const ctx = createContext('default')
		expect(ctx.Provider).toBeDefined()
		expect(typeof ctx.Provider).toBe('function')
	})

	it('Provider should have value getter/setter', () => {
		const ctx = createContext('default')
		const provider = new ctx.Provider()
		expect(provider.value).toBe('default')
		provider.value = 'custom'
		expect(provider.value).toBe('custom')
	})

	it('Provider should update token on value change', () => {
		const ctx = createContext('default')
		const provider = new ctx.Provider()
		provider.value = 'updated'
		expect(ctx.token.value).toBe('updated')
	})
})

describe('createContext Consumer', () => {
	it('should have Consumer class', () => {
		const ctx = createContext('default')
		expect(ctx.Consumer).toBeDefined()
		expect(typeof ctx.Consumer).toBe('function')
	})

	it('Consumer should have value getter', () => {
		const ctx = createContext('default')
		const consumer = new ctx.Consumer()
		expect(consumer.value).toBe('default')
	})

	it('Consumer should update when context changes', () => {
		const ctx = createContext('initial')
		const consumer = new ctx.Consumer()
		consumer.connectedCallback()
		ctx.provide('changed')
		expect(consumer.value).toBe('changed')
	})

	it('Consumer should call onContextUpdate', () => {
		const ctx = createContext('initial')
		const consumer = new ctx.Consumer()
		let receivedValue = null
		consumer.onContextUpdate = (v) => { receivedValue = v }
		consumer.connectedCallback()
		ctx.provide('updated')
		expect(receivedValue).toBe('updated')
	})
})

describe('consume decorator', () => {
	it('should be a function', () => {
		expect(typeof consume).toBe('function')
	})

	it('should return a decorator function', () => {
		const ctx = createContext('default')
		const decorator = consume(ctx)
		expect(typeof decorator).toBe('function')
	})
})

describe('consumeContext', () => {
	it('should return signal and cleanup', () => {
		const ctx = createContext('default')
		const { signal, cleanup } = consumeContext(ctx)
		expect(signal).toBeDefined()
		expect(typeof signal.value).not.toBe('undefined')
		expect(typeof cleanup).toBe('function')
	})

	it('should get current value from context', () => {
		const ctx = createContext('initial')
		ctx.provide('current')
		const { signal } = consumeContext(ctx)
		expect(signal.value).toBe('current')
	})

	it('should update signal when context changes', () => {
		const ctx = createContext('initial')
		const { signal } = consumeContext(ctx)
		ctx.provide('new')
		expect(signal.value).toBe('new')
	})

	it('should notify signal subscribers on context change', () => {
		const ctx = createContext('start')
		const { signal } = consumeContext(ctx)
		const values = []
		signal.subscribe(v => values.push(v))
		ctx.provide('end')
		expect(values).toEqual(['end'])
	})

	it('should stop updating after cleanup', () => {
		const ctx = createContext('start')
		const { signal, cleanup } = consumeContext(ctx)
		const values = []
		signal.subscribe(v => values.push(v))
		cleanup()
		ctx.provide('after-cleanup')
		expect(values).toEqual([])
	})
})

describe('provideDirective', () => {
	it('should be a function', () => {
		expect(typeof provideDirective).toBe('function')
	})

	it('should set context value', () => {
		const ctx = createContext('default')
		provideDirective(ctx, 'provided')
		expect(ctx.consume()).toBe('provided')
	})
})
