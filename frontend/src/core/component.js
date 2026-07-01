import { effect, signal } from './signals.js'
import { render as renderTemplate, TemplateResult } from './template.js'
import { morph } from './dom.js'

export class ReactiveComponent extends HTMLElement {
	constructor() {
		super()
		this.props = {}
		this._isMounted = false
		this._hasRendered = false
		this._updatePending = false
		this._updateResolve = null
		this._updatePromise = null
		this._controllers = new Set()
		this._delegatedEvents = new Map()
		this._delegationRoots = new Set()
		this._effectCleanup = null
		
		this.attachShadow({ mode: 'open' })

		if (this.constructor.styles) {
			const sheet = new CSSStyleSheet()
			sheet.replaceSync(this.constructor.styles)
			this.shadowRoot.adoptedStyleSheets = [sheet]
		}
		
		const props = this.constructor.properties || {}
		this._propSignals = {}
		
		for (const [name, config] of Object.entries(props)) {
			const type = typeof config === 'function' ? config : config.type
			const options = typeof config === 'object' ? config : {}
			
			const attrName = options.attribute || name
			const initialVal = this.hasAttribute(attrName) ? this.getAttribute(attrName) : options.value
			
			const sig = signal(this._cast(initialVal, type))
			this._propSignals[name] = sig
			
			Object.defineProperty(this, name, {
				get: () => sig.value,
				set: (val) => {
					sig.value = this._cast(val, type)
					if (options.reflect) {
						if (val == null || val === false) this.removeAttribute(attrName)
						else this.setAttribute(attrName, val === true ? '' : val)
					}
				}
			})
		}
	}
	
	_cast(val, type) {
		if (val == null) return val
		if (type === Boolean) return val !== null && val !== 'false'
		if (type === Number) return Number(val)
		return String(val)
	}

	static get observedAttributes() {
		const props = this.properties || {}
		return Object.entries(props).map(([name, config]) => typeof config === 'object' && config.attribute ? config.attribute : name)
	}

	attributeChangedCallback(attr, oldVal, newVal) {
		const props = this.constructor.properties || {}
		for (const [name, config] of Object.entries(props)) {
			const type = typeof config === 'function' ? config : config.type
			const attrName = (typeof config === 'object' && config.attribute) ? config.attribute : name
			if (attrName === attr && this._propSignals[name]) {
				this._propSignals[name].value = this._cast(newVal, type)
			}
		}
	}
	
	addController(controller) {
		this._controllers.add(controller)
		if (this._isMounted && controller.hostConnected) controller.hostConnected()
	}
	
	removeController(controller) {
		this._controllers.delete(controller)
		if (this._isMounted && controller.hostDisconnected) controller.hostDisconnected()
	}

	connectedCallback() {
		this._isMounted = true
		this.onMount()
		
		for (const c of this._controllers) if (c.hostConnected) c.hostConnected()
		
		this._effectCleanup = effect(() => {
			const result = this.render()
			this.requestUpdate(result)
		})
	}
	
	requestUpdate(templateResult) {
		this._latestResult = templateResult || this.render()
		if (!this._updatePending) {
			this._updatePending = true
			this._updatePromise = new Promise(resolve => { this._updateResolve = resolve })
			queueMicrotask(() => this.performUpdate())
		}
		return this._updatePromise
	}

	get updateComplete() {
		return this._updatePromise || Promise.resolve()
	}
	
	performUpdate() {
		if (!this._isMounted) {
			this._updatePending = false
			if (this._updateResolve) { this._updateResolve(); this._updateResolve = null }
			return
		}

		const res = this._latestResult
		
		if (res instanceof TemplateResult) {
			renderTemplate(res, this.shadowRoot)
		} else if (res) {
			if (!this._hasRendered) {
				this.shadowRoot.innerHTML = res
				this._hasRendered = true
			} else {
				const template = document.createElement('template')
				template.innerHTML = res
				morph(this.shadowRoot, template.content)
			}
		}
		
		this._updatePending = false
		this.onRendered()
		for (const c of this._controllers) if (c.hostUpdated) c.hostUpdated()

		if (this._updateResolve) {
			this._updateResolve()
			this._updateResolve = null
			this._updatePromise = null
		}
	}

	disconnectedCallback() {
		this._isMounted = false
		if (this._effectCleanup) {
			this._effectCleanup()
			this._effectCleanup = null
		}
		for (const c of this._controllers) if (c.hostDisconnected) c.hostDisconnected()
		this.onDestroy()
	}

	render() {
		if (this.constructor.template) return this.constructor.template(this)
		return ''
	}

	onMount() {}
	onRendered() {}
	onDestroy() {}

	query(selector) { return this.shadowRoot ? this.shadowRoot.querySelector(selector) : null }

	queryAll(selector) { return this.shadowRoot ? this.shadowRoot.querySelectorAll(selector) : [] }

	emit(name, detail = {}, options = {}) {
		const event = new CustomEvent(name, {
			detail,
			bubbles: options.bubbles !== false,
			composed: options.composed !== false,
			...options,
		})
		this.dispatchEvent(event)
		return event
	}

	delegate(type, selector, listener) {
		if (!this._delegatedEvents.has(type)) this._delegatedEvents.set(type, [])
		this._delegatedEvents.get(type).push({ selector, listener })
		
		if (!this._delegationRoots.has(type)) {
			this._delegationRoots.add(type)
			setTimeout(() => {
				if (!this.shadowRoot) return
				this.shadowRoot.addEventListener(type, (e) => {
					const target = e.target
					const listeners = this._delegatedEvents.get(type) || []
					for (const l of listeners) {
						if (target.matches(l.selector) || target.closest(l.selector)) l.listener(e)
					}
				})
			}, 0)
		}
	}
	
	static define(config) {
		const cls = class extends (config.base || this) {}
		if (config.properties) cls.properties = config.properties
		if (config.template) cls.template = config.template
		if (config.styles) cls.styles = config.styles
		
		if (config.methods) {
			for (const [k, v] of Object.entries(config.methods)) {
				cls.prototype[k] = v
			}
		}
		
		customElements.define(config.name, cls)
		return cls
	}
}
