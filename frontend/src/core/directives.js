const directives = new WeakMap()

export class DirectiveResult {
	constructor(value, type) {
		this._value = value
		this._type = type
	}
}

export function directive(fn) {
	const d = (value) => {
		const result = fn(value)
		if (result instanceof DirectiveResult) return result
		return new DirectiveResult(result, fn)
	}
	directives.set(d, fn)
	return d
}

function isDirective(v) {
	return v instanceof DirectiveResult
}

// --- until: render fallback until promise resolves ---
export const until = directive((args) => {
	const [promise, fallback] = args
	if (!(promise instanceof Promise)) return promise

	const key = new WeakMap()

	function update(p, fb) {
		if (!key.has(p)) {
			key.set(p, { value: undefined, settled: false })
			p.then(v => { key.get(p).value = v; key.get(p).settled = true })
				.catch(() => { key.get(p).settled = true })
		}
		const entry = key.get(p)
		return entry.settled ? entry.value : fb
	}

	return new DirectiveResult(
		{ promise, fallback, update },
		until
	)
})

// --- repeat: keyed list rendering ---
export function repeat(items, keyFn, template) {
	if (!items || items.length === 0) return new DirectiveResult([], repeat)

	const keyed = items.map((item, i) => ({
		key: keyFn(item, i),
		item,
		index: i,
		template: template(item, i),
	}))

	return new DirectiveResult(keyed, repeat)
}

// --- guard: only re-render when deps change ---
export function guard(deps, fn) {
	const key = deps.map(d => typeof d === 'object' ? JSON.stringify(d) : String(d)).join('|')

	if (!guard._cache) guard._cache = new Map()

	if (!guard._cache.has(key)) {
		guard._cache.set(key, fn())
	}

	const result = guard._cache.get(key)

	// Cleanup old entries (keep last 100)
	if (guard._cache.size > 100) {
		const first = guard._cache.keys().next().value
		guard._cache.delete(first)
	}

	return result
}
guard._cache = new Map()

// --- live: force update even if value is same reference ---
export function live(value) {
	return new DirectiveResult(value, live)
}

// --- choose: switch/case in templates ---
export function choose(value, cases, defaultCase) {
	const fn = cases[value]
	if (fn) return typeof fn === 'function' ? fn(value) : fn
	if (defaultCase) return typeof defaultCase === 'function' ? defaultCase(value) : defaultCase
	return ''
}

// --- map: simple list rendering (no keying) ---
export function map(items, fn) {
	if (!items || items.length === 0) return ''
	return items.map((item, i) => fn(item, i)).join('')
}

// --- range: iterate over numbers ---
export function range(start, end, fn) {
	const result = []
	const s = end === undefined ? 0 : start
	const e = end === undefined ? start : end
	for (let i = s; i < e; i++) {
		result.push(fn ? fn(i) : i)
	}
	return result
}

// --- ifDefined: render only if value is defined ---
export function ifDefined(value) {
	return value == null ? '' : value
}

// --- nothing: render nothing ---
export const nothing = Symbol('nothing')

export { isDirective }

// ============================================================
// NEW DIRECTIVES
// ============================================================

// --- show: reactive conditional rendering ---
// Usage: ${show(condition, html`<div>visible</div>`, html`<div>hidden</div>`)}
export function show(condition, thenContent, elseContent = null) {
	return new DirectiveResult({
		condition,
		then: thenContent,
		else_: elseContent,
	}, 'show')
}

// --- lazy: IntersectionObserver-based lazy rendering ---
// Usage: ${lazy(() => html`<heavy-component/>`)}
export const lazy = directive((renderFn) => {
	let isVisible = false
	let hasRendered = false
	let cachedResult = null

	return new DirectiveResult({
		renderFn,
		isVisible: false,
		hasRendered: false,
		checkVisibility(el) {
			if (typeof IntersectionObserver === 'undefined') {
				isVisible = true
				hasRendered = true
				return renderFn()
			}
			if (isVisible) return cachedResult
			const observer = new IntersectionObserver((entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						isVisible = true
						hasRendered = true
						cachedResult = renderFn()
						observer.disconnect()
						break
					}
				}
			}, { threshold: 0.1 })
			observer.observe(el)
			return ''
		}
	}, lazy)
})

// --- trapFocus: focus trap for modals/dialogs ---
// Usage: ${trapFocus(html`<div class="modal">...</div>`)}
export const trapFocus = directive((content) => {
	return new DirectiveResult({
		content,
		activate(root) {
			const focusable = root.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
			if (focusable.length === 0) return

			const first = focusable[0]
			const last = focusable[focusable.length - 1]

			const handler = (e) => {
				if (e.key !== 'Tab') return
				if (e.shiftKey) {
					if (document.activeElement === first) {
						e.preventDefault()
						last.focus()
					}
				} else {
					if (document.activeElement === last) {
						e.preventDefault()
						first.focus()
					}
				}
			}

			root.addEventListener('keydown', handler)
			first.focus()

			return () => root.removeEventListener('keydown', handler)
		}
	}, trapFocus)
})

// --- portal: render content in a different DOM location ---
// Usage: ${portal({ target: document.body, children: html`<div class="modal">...</div>` })}
export const portal = directive(({ target, children }) => {
	return new DirectiveResult({ target, children }, portal)
})

// --- classMap: conditional class names ---
// Usage: <div ${classMap({ active: isActive, hidden: isHidden })}>
export function classMap(cls) {
	return Object.entries(cls).filter(([, v]) => v).map(([k]) => k).join(' ')
}

// --- styleMap: inline style object ---
// Usage: <div style="${styleMap({ color: 'red', fontSize: '14px' })}">
export function styleMap(sty) {
	return Object.entries(sty).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`).join(';')
}

// --- html template tag re-exports for convenience ---
export { html } from './template.js'
