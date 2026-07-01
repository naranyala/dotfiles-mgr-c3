import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

// Mock web component APIs for Node.js environment
if (typeof customElements === 'undefined') {
	globalThis.customElements = {
		define: () => {},
		get: () => null,
	}
}

if (typeof HTMLElement === 'undefined') {
	globalThis.HTMLElement = class HTMLElement {
		constructor() {
			this._shadowRoot = null
			this._attributes = {}
			this._children = []
			this._parentNode = null
		}
		attachShadow() {
			this._shadowRoot = {
				innerHTML: '',
				querySelector: () => null,
				addEventListener: () => {},
				appendChild: () => {},
				removeChild: () => {},
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

describe('ReactiveComponent', () => {
	it('should be importable', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		expect(ReactiveComponent).toBeDefined()
		expect(typeof ReactiveComponent).toBe('function')
	})

	it('should extend HTMLElement', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(instance).toBeInstanceOf(HTMLElement)
	})

	it('should initialize props as empty object', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(instance.props).toEqual({})
	})

	it('should initialize mount state', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(instance._isMounted).toBe(false)
		expect(instance._hasRendered).toBe(false)
	})

	it('should have default lifecycle hooks', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(typeof instance.onMount).toBe('function')
		expect(typeof instance.onRendered).toBe('function')
		expect(typeof instance.onDestroy).toBe('function')
	})

	it('should have render method returning empty string', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(instance.render()).toBe('')
	})

	it('should have query helper', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		instance.attachShadow({ mode: 'open' })
		expect(typeof instance.query).toBe('function')
		expect(instance.query('div')).toBeNull()
	})

	it('should have delegate helper', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		instance.attachShadow({ mode: 'open' })
		expect(typeof instance.delegate).toBe('function')
	})

	it('should track delegated events', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		instance.attachShadow({ mode: 'open' })
		instance.delegate('click', '.btn', () => {})
		expect(instance._delegatedEvents.has('click')).toBe(true)
		expect(instance._delegatedEvents.get('click').length).toBe(1)
	})

	it('should track delegation roots', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		instance.attachShadow({ mode: 'open' })
		instance.delegate('click', '.btn', () => {})
		expect(instance._delegationRoots.has('click')).toBe(true)
	})

	it('should only register delegation root once per event type', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		instance.attachShadow({ mode: 'open' })
		instance.delegate('click', '.btn1', () => {})
		instance.delegate('click', '.btn2', () => {})
		// Two listeners but one delegation root
		expect(instance._delegatedEvents.get('click').length).toBe(2)
	})
})
