import { effect, onCleanup } from './signals.js'
import { isDirective, DirectiveResult } from './directives.js'

export function classMap(cls) {
	return Object.entries(cls).filter(([, v]) => v).map(([k]) => k).join(' ')
}

export function styleMap(sty) {
	return Object.entries(sty).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`).join(';')
}

export class TemplateResult {
	constructor(html, events, children) {
		this.html = html
		this.events = events ?? new Map()
		this.children = children ?? new Map()
	}

	toString() { return this.html }
}

let uid = 0

function resolveValue(v) {
	if (v instanceof DirectiveResult) {
		const { _value, _type } = v
		if (_type && typeof _type === 'function') {
			const resolved = _type(_value)
			if (resolved instanceof DirectiveResult) return resolveValue(resolved)
			return resolved
		}
		return _value
	}
	return v
}

export function html(strings, ...vals) {
	const events = new Map()
	const children = new Map()
	const parts = []

	for (let i = 0; i < strings.length; i++) {
		parts.push(strings[i])
		if (i < vals.length) {
			let v = vals[i]
			v = resolveValue(v)
			const prev = strings[i]

			if (typeof v === 'function') {
				const ematch = prev.match(/@(\w+)=\s*$/)
				if (ematch) {
					const evtType = ematch[1]
					const id = `ev${uid++}`
					parts[parts.length - 1] = prev.slice(0, ematch.index) + `data-e="${evtType}:${id}"`
					events.set(id, v)
					continue
				}
			}

			if (v instanceof TemplateResult) {
				const id = `ch${uid++}`
				parts.push(`<!--${id}-->`)
				children.set(id, v)
				continue
			}

			if (Array.isArray(v)) {
				const arrParts = []
				for (const item of v) {
					if (item instanceof TemplateResult) {
						const id = `ch${uid++}`
						arrParts.push(`<!--${id}-->`)
						children.set(id, item)
					} else if (item instanceof DirectiveResult) {
						const resolved = resolveValue(item)
						if (resolved instanceof TemplateResult) {
							const id = `ch${uid++}`
							arrParts.push(`<!--${id}-->`)
							children.set(id, resolved)
						} else {
							arrParts.push(String(resolved ?? ''))
						}
					} else {
						arrParts.push(String(item ?? ''))
					}
				}
				parts.push(arrParts.join(''))
				continue
			}

			parts.push(String(v ?? ''))
		}
	}

	return new TemplateResult(parts.join(''), events, children)
}

export function when(cond, then_, else_) {
	return cond ? then_ : (else_ ?? html``)
}

export function each(items, fn) {
	if (!items || items.length === 0) return new TemplateResult('', new Map(), new Map())
	const parts = []
	const events = new Map()
	const children = new Map()

	for (let i = 0; i < items.length; i++) {
		const r = fn(items[i], i)
		parts.push(r.html)
		for (const [k, v] of r.events) events.set(k, v)
		for (const [k, v] of r.children) children.set(k, v)
	}

	return new TemplateResult(parts.join(''), events, children)
}

function reconcileNode(oldN, newN) {
	if (oldN.nodeType !== newN.nodeType || oldN.nodeName !== newN.nodeName) return false

	if (oldN.nodeType === Node.TEXT_NODE || oldN.nodeType === Node.COMMENT_NODE) {
		if (oldN.textContent !== newN.textContent) oldN.textContent = newN.textContent
		return true
	}

	const oldEl = oldN
	const newEl = newN

	const newAttrs = new Map()
	for (const a of Array.from(newEl.attributes)) newAttrs.set(a.name, a.value)

	for (const a of Array.from(oldEl.attributes)) {
		if (a.name.startsWith('data-e')) continue
		if (!newAttrs.has(a.name)) oldEl.removeAttribute(a.name)
	}
	for (const [name, val] of newAttrs) {
		if (oldEl.getAttribute(name) !== val) oldEl.setAttribute(name, val)
	}

	reconcileChildren(oldEl, newEl)

	return true
}

function reconcileChildren(oldParent, newParent) {
	const oldKids = Array.from(oldParent.childNodes)
	const newKids = Array.from(newParent.childNodes)
	const max = Math.max(oldKids.length, newKids.length)

	for (let i = 0; i < max; i++) {
		const oldN = oldKids[i]
		const newN = newKids[i]

		if (!oldN && newN) {
			oldParent.appendChild(document.importNode(newN, true))
			continue
		}
		if (oldN && !newN) {
			oldParent.removeChild(oldN)
			continue
		}
		if (!oldN || !newN) continue

		if (oldN instanceof Element && newN instanceof Element && oldN.hasAttribute('data-key') && newN.getAttribute('data-key') !== oldN.getAttribute('data-key')) {
			const key = newN.getAttribute('data-key')
			const existing = key ? oldParent.querySelector(`[data-key="${key.replace(/"/g, '\\"')}"]`) : null
			if (existing) {
				oldParent.insertBefore(document.importNode(newN, true), oldN)
				continue
			}
		}

		if (!reconcileNode(oldN, newN)) {
			oldParent.replaceChild(document.importNode(newN, true), oldN)
		}
	}
}

export function reconcile(el, newHtml) {
	const tpl = document.createElement('template')
	tpl.innerHTML = newHtml.trim()
	reconcileChildren(el, tpl.content)
}

function flatten(result) {
	let html = result.html

	for (const [id, child] of result.children) {
		const content = flatten(child)
		html = html.replace(`<!--${id}-->`, content)
	}

	return html
}

export function render(result, container) {
	const html = flatten(result)

	reconcile(container, html)

	const all = container.querySelectorAll('[data-e]')
	for (const el of all) {
		const full = el.getAttribute('data-e')
		const colon = full.indexOf(':')
		if (colon === -1) continue
		const evtType = full.slice(0, colon)
		const id = full.slice(colon + 1)
		const handler = result.events.get(id)
		if (handler) {
			el.addEventListener(evtType, handler)
			el.removeAttribute('data-e')
		}
	}
}
