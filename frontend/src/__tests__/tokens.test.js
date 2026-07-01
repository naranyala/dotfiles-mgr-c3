import { describe, it, expect, beforeEach } from 'bun:test'
import { DesignToken } from '../core/token.js'
import {
	token, defineTokens, defineDesignSystem, applyDesignSystem,
	getDesignSystem, cssVar, cssVars, initDefaultTokens, defaultTokens,
} from '../core/tokens.js'

const mockStyle = {}
globalThis.document = {
	documentElement: {
		style: {
			setProperty(k, v) { mockStyle[k] = v },
			getProperty(k) { return mockStyle[k] || '' },
		}
	}
}

describe('DesignToken', () => {
	it('should create token with name', () => {
		const t = DesignToken.create('color-primary')
		expect(t.name).toBe('--color-primary')
	})

	it('should add -- prefix if missing', () => {
		const t = DesignToken.create('my-token')
		expect(t.name).toBe('--my-token')
	})

	it('should not double -- prefix', () => {
		const t = DesignToken.create('--already')
		expect(t.name).toBe('--already')
	})

	it('should set and get default value', () => {
		const t = DesignToken.create('test').withDefault('#fff')
		expect(t._defaultValue).toBe('#fff')
	})

	it('should return var() string from toString', () => {
		const t = DesignToken.create('color').withDefault('#000')
		expect(t.toString()).toBe('var(--color, #000)')
	})

	it('should set property on element via setValueFor', () => {
		const t = DesignToken.create('bg')
		const el = { style: { setProperty(k, v) { el.style._k = v } } }
		el.style.setProperty = (k, v) => { el.style._k = v }
		t.setValueFor(el, 'red')
		expect(el.style._k).toBe('red')
	})

	it('should support static create method', () => {
		const t = DesignToken.create('test')
		expect(t).toBeInstanceOf(DesignToken)
	})
})

describe('token (registry)', () => {
	it('should create and return a token', () => {
		const t = token('my-color', '#fff')
		expect(t.name).toBe('my-color')
		expect(t.value).toBe('#fff')
	})

	it('should return same token for same name', () => {
		const t1 = token('same-name', 'a')
		const t2 = token('same-name', 'b')
		expect(t1).toBe(t2)
	})

	it('should update value', () => {
		const t = token('upd-token', 'old')
		t.value = 'new'
		expect(t.value).toBe('new')
	})

	it('should apply CSS variable on update', () => {
		const t = token('css-apply', 'initial')
		t.value = 'updated'
		expect(mockStyle['--css-apply']).toBe('updated')
	})

	it('should return default when value not set', () => {
		const t = token('never-set', 'fallback')
		expect(t.value).toBe('fallback')
	})

	it('should generate css() string', () => {
		const t = token('css-gen', '#abc')
		t.value = '#123'
		expect(t.css()).toBe('--css-gen: #123;')
	})

	it('should generate var() string', () => {
		const t = token('var-gen', '#000')
		expect(t.var()).toBe('var(--var-gen)')
	})

	it('should notify subscribers on change', () => {
		const t = token('sub-token', 'a')
		const received = []
		t.subscribe(v => received.push(v))
		t.value = 'b'
		expect(received).toEqual(['a', 'b'])
	})

	it('should immediately call subscriber with current value', () => {
		const t = token('sub-immediate', 'current')
		let val = null
		t.subscribe(v => { val = v })
		expect(val).toBe('current')
	})

	it('should return unsubscribe function', () => {
		const t = token('unsub-token', 'x')
		let count = 0
		const unsub = t.subscribe(() => { count++ })
		t.value = 'y'
		expect(count).toBe(2)
		unsub()
		t.value = 'z'
		expect(count).toBe(2)
	})
})

describe('defineTokens', () => {
	it('should define multiple tokens at once', () => {
		defineTokens({ 'def-a': '1', 'def-b': '2' })
		expect(token('def-a').value).toBe('1')
		expect(token('def-b').value).toBe('2')
	})

	it('should overwrite existing token values', () => {
		token('def-overwrite', 'old')
		defineTokens({ 'def-overwrite': 'new' })
		expect(token('def-overwrite').value).toBe('new')
	})
})

describe('defineDesignSystem', () => {
	it('should create a named design system', () => {
		const sys = defineDesignSystem('test-sys', { primary: '#00f', bg: '#000' })
		expect(sys.primary).toBeDefined()
		expect(sys.bg).toBeDefined()
		expect(sys.primary.value).toBe('#00f')
	})

	it('should register in designSystems map', () => {
		defineDesignSystem('lookup-sys', { a: '1' })
		expect(getDesignSystem('lookup-sys')).toBeDefined()
		expect(getDesignSystem('lookup-sys').a.value).toBe('1')
	})

	it('should return undefined for unknown system', () => {
		expect(getDesignSystem('nonexistent')).toBeUndefined()
	})
})

describe('applyDesignSystem', () => {
	it('should apply all tokens to document', () => {
		defineDesignSystem('apply-test', { x: '10px' })
		applyDesignSystem('apply-test')
		expect(mockStyle['--apply-test-x']).toBe('10px')
	})

	it('should do nothing for unknown system', () => {
		applyDesignSystem('unknown-system')
	})
})

describe('cssVar / cssVars', () => {
	it('cssVar should return var() for string name', () => {
		expect(cssVar('color')).toBe('var(--color)')
	})

	it('cssVar should return var() for token object', () => {
		const t = token('my-tok', '#000')
		expect(cssVar(t)).toBe('var(--my-tok)')
	})

	it('cssVars should return space-separated declarations', () => {
		const t1 = token('v1', 'a')
		const t2 = token('v2', 'b')
		const result = cssVars(t1, t2)
		expect(result).toContain('--v1: a;')
		expect(result).toContain('--v2: b;')
	})

	it('cssVars should accept string names', () => {
		const result = cssVars('foo', 'bar')
		expect(result).toContain('--foo:')
		expect(result).toContain('--bar:')
	})
})

describe('defaultTokens', () => {
	it('should have color tokens', () => {
		expect(defaultTokens['color-bg']).toBeDefined()
		expect(defaultTokens['color-text']).toBeDefined()
		expect(defaultTokens['color-primary']).toBeDefined()
	})

	it('should have spacing tokens', () => {
		expect(defaultTokens['spacing-sm']).toBe('8px')
		expect(defaultTokens['spacing-md']).toBe('16px')
	})

	it('should have radius tokens', () => {
		expect(defaultTokens['radius-sm']).toBe('6px')
	})
})

describe('initDefaultTokens', () => {
	it('should initialize all default tokens', () => {
		initDefaultTokens()
		expect(token('color-bg').value).toBe('#0f172a')
		expect(token('color-text').value).toBe('#f8fafc')
		expect(token('spacing-md').value).toBe('16px')
	})
})
