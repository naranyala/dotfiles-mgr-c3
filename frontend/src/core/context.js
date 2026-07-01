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
			constructor() {
				super()
				this.attachShadow({ mode: 'open' })
				this.shadowRoot.innerHTML = '<slot></slot>'
			}
			connectedCallback() {
				this._unsub = token.subscribe((v) => {
					this.value = v
				})
			}
			disconnectedCallback() {
				if (this._unsub) this._unsub()
			}
			set value(v) { token.value = v }
			get value() { return token.value }
		},
		Consumer: class extends HTMLElement {
			constructor() {
				super()
				this._connected = false
			}
			connectedCallback() {
				this._connected = true
				this._unsub = token.subscribe((v) => {
					this.value = v
					if (this.onContextUpdate) this.onContextUpdate(v)
				})
			}
			disconnectedCallback() {
				this._connected = false
				if (this._unsub) this._unsub()
			}
		},
	}

	return ctx
}

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
