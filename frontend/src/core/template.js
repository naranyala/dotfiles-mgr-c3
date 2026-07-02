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
				const ematch = prev.match(/@(\w+)=\s*"$/)
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

function reconcileNode(oldN, newN, eventMap) {
	if (oldN.nodeType !== newN.nodeType || oldN.nodeName !== newN.nodeName) return false

	if (oldN.nodeType === Node.TEXT_NODE || oldN.nodeType === Node.COMMENT_NODE) {
		if (oldN.textContent !== newN.textContent) oldN.textContent = newN.textContent
		return true
	}

	const oldEl = oldN
	const newEl = newN

	const newAttrs = new Map()
	for (const a of Array.from(newEl.attributes)) newAttrs.set(a.name, a.value)

	// Handle .ref
	if (newAttrs.has('.ref')) {
		const refVal = newAttrs.get('.ref')
		if (typeof refVal === 'function') {
			refVal(oldEl)
		} else if (refVal && typeof refVal === 'object' && 'value' in refVal) {
			refVal.value = oldEl
		}
		newAttrs.delete('.ref')
	}

	// Handle @event bindings — always re-bind from new template's data-e
	if (newAttrs.has('data-e') && eventMap) {
		const full = newAttrs.get('data-e')
		const colon = full.indexOf(':')
		if (colon !== -1) {
			const evtType = full.slice(0, colon)
			const id = full.slice(colon + 1)
			const handler = eventMap.get(id)
			if (handler) {
				oldEl.removeEventListener(evtType, oldEl[`__ev_${evtType}`])
				oldEl.addEventListener(evtType, handler)
				oldEl[`__ev_${evtType}`] = handler
			}
		}
		newAttrs.delete('data-e')
	}

	// Sync regular attributes (skip our special ones)
	const skipAttrs = new Set(['.ref', 'data-e', ':value', ':checked'])
	for (const a of Array.from(oldEl.attributes)) {
		if (skipAttrs.has(a.name)) continue
		if (!newAttrs.has(a.name)) oldEl.removeAttribute(a.name)
	}
	for (const [name, val] of newAttrs) {
		if (skipAttrs.has(name)) continue
		if (oldEl.getAttribute(name) !== val) oldEl.setAttribute(name, val)
	}

	// Handle :value — force-set DOM property for input/select/textarea
	if (newAttrs.has(':value')) {
		const val = newAttrs.get(':value')
		if (oldEl.tagName === 'INPUT' || oldEl.tagName === 'TEXTAREA' || oldEl.tagName === 'SELECT') {
			if (String(oldEl.value) !== String(val)) {
				oldEl.value = val
			}
		} else if (typeof oldEl.value !== 'undefined' && oldEl.value !== val) {
			oldEl.value = val
		}
	}

	// Handle :checked — force-set DOM property for checkboxes/radios
	if (newAttrs.has(':checked')) {
		const val = newAttrs.get(':checked')
		const boolVal = val === 'true' || val === true
		if (oldEl.checked !== boolVal) {
			oldEl.checked = boolVal
		}
	}

	reconcileChildren(oldEl, newEl, eventMap)

	return true
}

function reconcileChildren(oldParent, newParent, eventMap) {
	const oldKids = Array.from(oldParent.childNodes)
	const newKids = Array.from(newParent.childNodes)

	// Build key maps for efficient diffing
	const oldKeyMap = new Map()
	const oldKeyed = []
	const oldUnkeyed = []

	for (const node of oldKids) {
		if (node instanceof Element && node.hasAttribute('data-key')) {
			const key = node.getAttribute('data-key')
			oldKeyMap.set(key, node)
			oldKeyed.push({ key, node })
		} else {
			oldUnkeyed.push(node)
		}
	}

	const newKeyed = []
	const newUnkeyed = []

	for (const node of newKids) {
		if (node instanceof Element && node.hasAttribute('data-key')) {
			newKeyed.push({ key: node.getAttribute('data-key'), node })
		} else {
			newUnkeyed.push(node)
		}
	}

	// Phase 1: Process keyed nodes — reuse existing DOM by key
	const usedOldKeys = new Set()
	const resultNodes = []

	for (const { key, node: newNode } of newKeyed) {
		const existing = oldKeyMap.get(key)
		if (existing) {
			usedOldKeys.add(key)
			reconcileNode(existing, newNode, eventMap)
			resultNodes.push(existing)
		} else {
			const imported = document.importNode(newNode, true)
			bindEventsOnNode(imported, eventMap)
			resultNodes.push(imported)
		}
	}

	// Phase 2: Process unkeyed nodes — position-based reconciliation
	const maxUnkeyed = Math.max(oldUnkeyed.length, newUnkeyed.length)
	for (let i = 0; i < maxUnkeyed; i++) {
		const oldN = oldUnkeyed[i]
		const newN = newUnkeyed[i]

		if (!oldN && newN) {
			const imported = document.importNode(newN, true)
			bindEventsOnNode(imported, eventMap)
			resultNodes.push(imported)
			continue
		}
		if (oldN && !newN) {
			continue
		}
		if (!oldN || !newN) continue

		if (reconcileNode(oldN, newN, eventMap)) {
			resultNodes.push(oldN)
		} else {
			const imported = document.importNode(newN, true)
			bindEventsOnNode(imported, eventMap)
			resultNodes.push(imported)
		}
	}

	// Phase 3: Remove old keyed nodes that weren't reused
	for (const [key, node] of oldKeyMap) {
		if (!usedOldKeys.has(key)) {
			node.remove()
		}
	}

	// Phase 4: Reconcile the DOM — only add/remove if order changed
	const currentKids = Array.from(oldParent.childNodes)

	let changed = false
	if (resultNodes.length !== currentKids.length) {
		changed = true
	} else {
		for (let i = 0; i < resultNodes.length; i++) {
			if (resultNodes[i] !== currentKids[i]) { changed = true; break }
		}
	}

	if (changed) {
		while (oldParent.firstChild) oldParent.removeChild(oldParent.firstChild)
		for (const node of resultNodes) {
			oldParent.appendChild(node)
		}
	}
}

function bindEventsOnNode(node, eventMap) {
	if (!node.nodeType) return
	if (node.nodeType === Node.ELEMENT_NODE) {
		if (node.hasAttribute(':value')) {
			const val = node.getAttribute(':value')
			if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') {
				node.value = val
			}
			node.removeAttribute(':value')
		}
		if (node.hasAttribute(':checked')) {
			const val = node.getAttribute(':checked')
			node.checked = val === 'true' || val === true
			node.removeAttribute(':checked')
		}
		if (node.hasAttribute('data-e') && eventMap) {
			const full = node.getAttribute('data-e')
			const colon = full.indexOf(':')
			if (colon !== -1) {
				const evtType = full.slice(0, colon)
				const id = full.slice(colon + 1)
				const handler = eventMap.get(id)
				if (handler) {
					node.addEventListener(evtType, handler)
				}
			}
			node.removeAttribute('data-e')
		}
	}
	if (node.childNodes) {
		for (const child of node.childNodes) {
			bindEventsOnNode(child, eventMap)
		}
	}
}

export function reconcile(el, newHtml, eventMap) {
	const tpl = document.createElement('template')
	tpl.innerHTML = newHtml.trim()
	reconcileChildren(el, tpl.content, eventMap)
}

function flatten(result) {
	let html = result.html

	for (const [id, child] of result.children) {
		const content = flatten(child)
		html = html.replace(`<!--${id}-->`, content)
	}

	return html
}

function flattenEvents(result) {
	const all = new Map(result.events)
	for (const [, child] of result.children) {
		for (const [k, v] of flattenEvents(child)) {
			all.set(k, v)
		}
	}
	return all
}

export function render(result, container) {
	const html = flatten(result)
	const allEvents = flattenEvents(result)

	reconcile(container, html, allEvents)

	// Safety net: bind any remaining unbound events
	const elems = container.querySelectorAll('[data-e]')
	for (const el of elems) {
		const full = el.getAttribute('data-e')
		const colon = full.indexOf(':')
		if (colon === -1) continue
		const evtType = full.slice(0, colon)
		const id = full.slice(colon + 1)
		const handler = allEvents.get(id)
		if (handler) {
			if (el[`__ev_${evtType}`]) el.removeEventListener(evtType, el[`__ev_${evtType}`])
			el.addEventListener(evtType, handler)
			el[`__ev_${evtType}`] = handler
			el.removeAttribute('data-e')
		}
	}
}
