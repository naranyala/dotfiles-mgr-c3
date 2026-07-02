import { DirectiveResult } from './directives.js'

export function For({ each: items, key, children }) {
	const keyFn = typeof key === 'function' ? key : (item) => item[key]
	return new DirectiveResult({ each: items, keyFn, renderFn: children }, 'for')
}

export function Show({ when, fallback, children }) {
	return new DirectiveResult({
		condition: when,
		then: children,
		else_: fallback ?? null,
	}, 'show')
}

export function Suspense({ resource, fallback, children }) {
	return new DirectiveResult({ resource, fallback, children }, 'suspense')
}

export function Portal({ target, children }) {
	return new DirectiveResult({ target, children }, 'portal')
}

export function ErrorBoundary({ fallback, children }) {
	return new DirectiveResult({ children, fallback }, 'errorBoundary')
}

/**
 * tryCatch: render children safely, show fallback on error.
 * Usage: ${tryCatch(() => riskyRender(), (err) => html`<error/>` )}
 */
export function tryCatch(fn, fallback) {
	try {
		return fn()
	} catch (e) {
		console.error('[ErrorBoundary]', e)
		return typeof fallback === 'function' ? fallback(e) : fallback
	}
}
