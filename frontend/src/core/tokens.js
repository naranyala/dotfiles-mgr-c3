const tokens = new Map()
const tokenValues = new Map()
const tokenSubscribers = new Map()
const designSystems = new Map()

export function token(name, defaultValue) {
	if (tokens.has(name)) return tokens.get(name)

	const t = {
		name,
		defaultValue,
		get value() {
			return tokenValues.get(name) ?? defaultValue
		},
		set value(v) {
			tokenValues.set(name, v)
			applyToken(name, v)
			notifyTokenSubscribers(name, v)
		},
		subscribe(fn) {
			if (!tokenSubscribers.has(name)) tokenSubscribers.set(name, new Set())
			tokenSubscribers.get(name).add(fn)
			fn(tokenValues.get(name) ?? defaultValue)
			return () => tokenSubscribers.get(name)?.delete(fn)
		},
		css() {
			return `--${name}: ${tokenValues.get(name) ?? defaultValue};`
		},
		var() {
			return `var(--${name})`
		},
	}

	tokens.set(name, t)
	return t
}

function applyToken(name, value) {
	const cssVar = `--${name}`
	document.documentElement.style.setProperty(cssVar, value)
}

function notifyTokenSubscribers(name, value) {
	const subs = tokenSubscribers.get(name)
	if (subs) for (const fn of subs) fn(value)
}

export function defineTokens(values) {
	for (const [name, value] of Object.entries(values)) {
		const t = token(name)
		t.value = value
	}
}

export function defineDesignSystem(name, values) {
	const system = {}
	for (const [key, value] of Object.entries(values)) {
		const t = token(`${name}-${key}`)
		t.value = value
		system[key] = t
	}
	designSystems.set(name, system)
	return system
}

export function applyDesignSystem(name) {
	const system = designSystems.get(name)
	if (!system) return

	for (const [key, t] of Object.entries(system)) {
		applyToken(t.name, t.value)
	}
}

export function getDesignSystem(name) {
	return designSystems.get(name)
}

export function cssVar(tokenOrName) {
	const name = typeof tokenOrName === 'string' ? tokenOrName : tokenOrName.name
	return `var(--${name})`
}

export function cssVars(...tokenList) {
	return tokenList.map(t => {
		const name = typeof t === 'string' ? t : t.name
		return `--${name}: ${tokenValues.get(name) ?? tokens.get(name)?.defaultValue ?? ''};`
	}).join(' ')
}

// Pre-built design systems
export const defaultTokens = {
	'color-bg': '#0f172a',
	'color-bg-card': 'rgba(30, 41, 59, 0.4)',
	'color-bg-input': 'rgba(15, 23, 42, 0.5)',
	'color-bg-hover': 'rgba(15, 23, 42, 0.8)',
	'color-text': '#f8fafc',
	'color-text-muted': '#94a3b8',
	'color-text-secondary': '#cbd5e1',
	'color-primary': '#4f46e5',
	'color-primary-hover': '#4338ca',
	'color-success': '#10b981',
	'color-success-hover': '#059669',
	'color-error': '#f87171',
	'color-error-bg': 'rgba(248, 113, 113, 0.1)',
	'color-border': 'rgba(255, 255, 255, 0.08)',
	'color-border-focus': '#6366f1',
	'spacing-xs': '4px',
	'spacing-sm': '8px',
	'spacing-md': '16px',
	'spacing-lg': '24px',
	'spacing-xl': '40px',
	'radius-sm': '6px',
	'radius-md': '8px',
	'radius-lg': '16px',
	'font-family': "'Inter', system-ui, sans-serif",
	'font-family-mono': "ui-monospace, 'Fira Code', monospace",
	'font-size-sm': '0.85rem',
	'font-size-md': '0.95rem',
	'font-size-lg': '1.05rem',
}

export function initDefaultTokens() {
	defineTokens(defaultTokens)
}
