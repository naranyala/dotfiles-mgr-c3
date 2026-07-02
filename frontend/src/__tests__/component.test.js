import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

// Mock web component APIs for Node.js environment
if (typeof CSSStyleSheet === 'undefined') {
	globalThis.CSSStyleSheet = class CSSStyleSheet {
		replaceSync() {}
	}
}
if (typeof document === 'undefined') {
	globalThis.document = {
		createElement: (tag) => ({
			content: { innerHTML: '' },
		}),
		createDocumentFragment: () => ({
			appendChild: () => {},
			childNodes: [],
		}),
	}
}
if (typeof Node === 'undefined') {
	globalThis.Node = {
		TEXT_NODE: 3,
		ELEMENT_NODE: 1,
		COMMENT_NODE: 8,
	}
}
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
				querySelectorAll: () => [],
				addEventListener: () => {},
				removeEventListener: () => {},
				appendChild: () => {},
				removeChild: () => {},
				childNodes: [],
				children: [],
				adoptedStyleSheets: [],
				nodeType: 11,
				nodeName: '#document-fragment',
			}
			return this._shadowRoot
		}
		get shadowRoot() { return this._shadowRoot }
		getAttribute(name) { return this._attributes[name] || null }
		setAttribute(name, value) {
			const old = this._attributes[name]
			this._attributes[name] = value
			if (typeof this.attributeChangedCallback === 'function') {
				this.attributeChangedCallback(name, old, value)
			}
		}
		hasAttribute(name) { return name in this._attributes }
		removeAttribute(name) { delete this._attributes[name] }
		dispatchEvent() {}
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
		expect(typeof instance.onBeforeMount).toBe('function')
		expect(typeof instance.onBeforeRender).toBe('function')
		expect(typeof instance.onPropsChanged).toBe('function')
		expect(typeof instance.onAttributeChanged).toBe('function')
		expect(typeof instance.onAdopted).toBe('function')
		expect(typeof instance.onError).toBe('function')
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

	it('should have queryAll helper', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		instance.attachShadow({ mode: 'open' })
		expect(typeof instance.queryAll).toBe('function')
		expect(instance.queryAll('div')).toEqual([])
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
		expect(instance._delegatedEvents.get('click').length).toBe(2)
	})

	it('should have emit helper', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(typeof instance.emit).toBe('function')
	})

	it('should initialize controllers set', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(instance._controllers).toBeDefined()
		expect(instance._controllers.size).toBe(0)
	})

	it('should initialize _previousProps', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		expect(instance._previousProps).toEqual({})
	})
})

describe('ReactiveComponent lifecycle', () => {
	it('should call onBeforeMount before onMount', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const order = []
		class TestComp extends ReactiveComponent {
			onBeforeMount() { order.push('beforeMount') }
			onMount() { order.push('mount') }
		}
		const instance = new TestComp()
		instance.connectedCallback()
		expect(order).toEqual(['beforeMount', 'mount'])
	})

	it('should call firstUpdated only once', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		let count = 0
		class TestComp extends ReactiveComponent {
			firstUpdated() { count++ }
			render() { return '<div></div>' }
		}
		const instance = new TestComp()
		instance.connectedCallback()
		await new Promise(r => setTimeout(r, 10))
		instance.requestUpdate()
		await new Promise(r => setTimeout(r, 10))
		expect(count).toBe(1)
	})

	it('should call onError on render error', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		let caughtError = null
		class TestComp extends ReactiveComponent {
			onError(err) { caughtError = err }
			render() { throw new Error('test error') }
		}
		const instance = new TestComp()
		instance.connectedCallback()
		await new Promise(r => setTimeout(r, 10))
		expect(caughtError).toBeInstanceOf(Error)
		expect(caughtError.message).toBe('test error')
	})

	it('should call onPropsChanged when prop changes', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		let changedProps = null
		class TestComp extends ReactiveComponent {
			static properties = { count: { type: Number, value: 0 } }
			onPropsChanged(props) { changedProps = props }
		}
		const instance = new TestComp()
		instance.connectedCallback()
		instance.count = 5
		expect(changedProps).toEqual({ count: { old: 0, new: 5 } })
	})

	it('should call onAttributeChanged when attribute changes', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		let attrChange = null
		class TestComp extends ReactiveComponent {
			static properties = { label: { type: String, value: 'default', attribute: 'label' } }
			onAttributeChanged(attr, old, val) { attrChange = { attr, old, val } }
		}
		const instance = new TestComp()
		instance.connectedCallback()
		instance.setAttribute('label', 'new')
		expect(attrChange).toEqual({ attr: 'label', old: undefined, val: 'new' })
	})
})

describe('ReactiveComponent properties', () => {
	it('should define properties with types', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		class TestComp extends ReactiveComponent {
			static properties = {
				name: { type: String, value: 'default' },
				count: { type: Number, value: 0 },
			}
		}
		const instance = new TestComp()
		expect(instance.name).toBe('default')
		expect(instance.count).toBe(0)
	})

	it('should cast property values to correct types', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		class TestComp extends ReactiveComponent {
			static properties = {
				count: { type: Number, value: 0 },
			}
		}
		const instance = new TestComp()
		instance.count = '42'
		expect(instance.count).toBe(42)
	})

	it('should reflect properties to attributes', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		class TestComp extends ReactiveComponent {
			static properties = {
				label: { type: String, value: 'test', reflect: true },
			}
		}
		const instance = new TestComp()
		instance.label = 'new'
		expect(instance.getAttribute('label')).toBe('new')
	})
})

describe('ReactiveComponent controllers', () => {
	it('should add and remove controllers', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const instance = new ReactiveComponent()
		const ctrl = { hostConnected() {}, hostDisconnected() {} }
		instance.addController(ctrl)
		expect(instance._controllers.has(ctrl)).toBe(true)
		instance.removeController(ctrl)
		expect(instance._controllers.has(ctrl)).toBe(false)
	})

	it('should call hostConnected when adding controller after mount', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		let connected = false
		class TestComp extends ReactiveComponent {}
		const instance = new TestComp()
		instance.connectedCallback()
		const ctrl = { hostConnected() { connected = true } }
		instance.addController(ctrl)
		expect(connected).toBe(true)
	})
})

describe('ReactiveComponent static define', () => {
	it('should define a component', async () => {
		const { ReactiveComponent } = await import('../core/component.js')
		const cls = ReactiveComponent.define({
			name: 'test-define-2',
			properties: { msg: String },
			styles: '.test { color: red; }',
			template: (self) => `<div>${self.msg}</div>`,
			methods: {
				greet() { return 'hello' }
			}
		})
		expect(cls).toBeDefined()
		expect(cls.properties).toEqual({ msg: String })
		expect(cls.styles).toBe('.test { color: red; }')
	})
})
