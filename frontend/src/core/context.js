const contextRegistry = new WeakMap()
let contextUid = 0

export function createContext(defaultValue) {
	const id = `ctx-${contextUid++}`
	const token = {
		_value: defaultValue,
		_subscribers: new Set(),
		get value() { return this._value },
		set value(v) {
			this._value = v
			for (const sub of this._subscribers) sub(v)
		},
		subscribe(fn) {
			this._subscribers.add(fn)
			fn(this._value)
			return () => this._subscribers.delete(fn)
		},
	}

	contextRegistry.set(token, { id, defaultValue })

	const ctx = {
		token,
		id,
		provide(value) {
			token.value = value
		},
		consume() {
			return token.value
		},
		subscribe(fn) {
			return token.subscribe(fn)
		},
		Provider: class extends HTMLElement {
			static get observedAttributes() {
				return ['value']
			}

			constructor() {
				super()
				this.attachShadow({ mode: 'open' })
				this.shadowRoot.innerHTML = '<slot></slot>'
				this._contextValue = defaultValue
			}

			get value() { return this._contextValue }
			set value(v) {
				this._contextValue = v
				token.value = v
				this._propagateToChildren()
			}

			attributeChangedCallback(name, oldVal, newVal) {
				if (name === 'value') {
					this._contextValue = newVal
					token.value = newVal
				}
			}

			connectedCallback() {
				token.value = this._contextValue
				this._propagateToChildren()
			}

			_propagateToChildren() {
				const walk = (root) => {
					for (const child of root.children) {
						if (child._contextId === id) {
							child._contextValue = this._contextValue
							if (typeof child.onContextUpdate === 'function') {
								child.onContextUpdate(this._contextValue)
							}
						}
						if (child.shadowRoot) walk(child.shadowRoot)
						walk(child)
					}
				}
				walk(this.shadowRoot)
			}

			disconnectedCallback() {}
		},
		Consumer: class extends HTMLElement {
			constructor() {
				super()
				this._connected = false
				this._contextId = id
				this._contextValue = defaultValue
			}

			connectedCallback() {
				this._connected = true
				this._unsub = token.subscribe((value) => {
					this._contextValue = value
					if (this.onContextUpdate) this.onContextUpdate(value)
				})
			}

			disconnectedCallback() {
				this._connected = false
				if (this._unsub) this._unsub()
			}

			get value() { return this._contextValue }
		},
	}

	return ctx
}

/**
 * consume decorator — attach context consumption to a component class
 * Usage: consume(ThemeContext)(MyComponent, 'theme')
 */
export function consume(context) {
	return function(target, name) {
		const originalConnected = target.connectedCallback
		const token = context.token || context

		target.connectedCallback = function() {
			if (originalConnected) originalConnected.call(this)
			this._contextUnsubscribe = token.subscribe((value) => {
				this[name] = value
			})
		}

		const originalDisconnected = target.disconnectedCallback
		target.disconnectedCallback = function() {
			if (this._contextUnsubscribe) {
				this._contextUnsubscribe()
				this._contextUnsubscribe = null
			}
			if (originalDisconnected) originalDisconnected.call(this)
		}
	}
}

/**
 * provideDirective — creates a directive that provides context value in templates
 * Usage: ${provideDirective(ThemeContext, 'dark')}
 */
export function provideDirective(context, value) {
	context.provide(value)
	return ''
}

/**
 * consumeContext — hook for use in setup() functions
 * Returns a signal-like object that updates when context changes
 */
export function consumeContext(context, initialValue) {
	const token = context.token || context
	const sig = {
		_value: initialValue ?? token?.defaultValue,
		_subscribers: new Set(),
		get value() { return this._value },
		set value(v) {
			this._value = v
			for (const sub of this._subscribers) sub(v)
		},
		subscribe(fn) {
			this._subscribers.add(fn)
			return () => this._subscribers.delete(fn)
		},
	}

	let initialized = false
	const unsub = token.subscribe((v) => {
		sig._value = v
		if (initialized) {
			for (const sub of sig._subscribers) sub(v)
		}
		initialized = true
	})

	return { signal: sig, cleanup: unsub }
}
