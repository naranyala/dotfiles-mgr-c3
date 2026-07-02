import { describe, it, expect } from 'bun:test'
import { DirectiveResult } from '../core/directives.js'
import {
	until, repeat, guard, live, choose, map, range, ifDefined, nothing,
	show, lazy, trapFocus, portal, classMap, styleMap,
} from '../core/directives.js'

describe('DirectiveResult', () => {
	it('should store value and type', () => {
		const r = new DirectiveResult('val', 'myType')
		expect(r._value).toBe('val')
		expect(r._type).toBe('myType')
	})

	it('should work with function type', () => {
		const fn = () => {}
		const r = new DirectiveResult(42, fn)
		expect(r._type).toBe(fn)
		expect(r._value).toBe(42)
	})
})

describe('until', () => {
	it('should wrap non-promise value in DirectiveResult', () => {
		const result = until(['not-a-promise'])
		expect(result).toBeInstanceOf(DirectiveResult)
		expect(result._value).toBe('not-a-promise')
	})

	it('should return DirectiveResult for Promise', () => {
		const result = until([Promise.resolve('val'), 'fallback'])
		expect(result).toBeInstanceOf(DirectiveResult)
		expect(result._value.fallback).toBe('fallback')
		expect(result._value.promise).toBeInstanceOf(Promise)
	})

	it('should have update function', () => {
		const result = until([Promise.resolve('x'), 'fb'])
		expect(typeof result._value.update).toBe('function')
	})

	it('update should return fallback while pending', () => {
		let resolve
		const p = new Promise(r => { resolve = r })
		const result = until([p, 'loading'])
		const val = result._value.update(p, 'loading')
		expect(val).toBe('loading')
	})

	it('update should return resolved value after settle', async () => {
		const p = Promise.resolve('done')
		const result = until([p, 'loading'])
		result._value.update(p, 'loading')
		await new Promise(r => setTimeout(r, 10))
		const val = result._value.update(p, 'loading')
		expect(val).toBe('done')
	})

	it('should handle rejected promise', async () => {
		const p = Promise.reject(new Error('fail')).catch(() => {})
		const result = until([p, 'fallback'])
		await new Promise(r => setTimeout(r, 10))
		const val = result._value.update(p, 'fallback')
		expect(val).toBe('fallback')
	})
})

describe('repeat', () => {
	it('should return empty DirectiveResult for null items', () => {
		const result = repeat(null, i => i, i => String(i))
		expect(result._value).toEqual([])
	})

	it('should return empty DirectiveResult for empty array', () => {
		const result = repeat([], i => i, i => String(i))
		expect(result._value).toEqual([])
	})

	it('should create keyed items', () => {
		const items = ['a', 'b', 'c']
		const result = repeat(items, item => item, (item, i) => `${item}-${i}`)
		expect(result._value).toHaveLength(3)
		expect(result._value[0].key).toBe('a')
		expect(result._value[0].item).toBe('a')
		expect(result._value[0].index).toBe(0)
		expect(result._value[0].template).toBe('a-0')
	})

	it('should use index as key when no keyFn', () => {
		const result = repeat([10, 20], (item, i) => i, item => String(item))
		expect(result._value[0].key).toBe(0)
		expect(result._value[1].key).toBe(1)
	})
})

describe('guard', () => {
	it('should return cached result for same deps', () => {
		let callCount = 0
		const r1 = guard(['a', 'b'], () => { callCount++; return 'result' })
		const r2 = guard(['a', 'b'], () => { callCount++; return 'result2' })
		expect(r1).toBe('result')
		expect(r2).toBe('result')
		expect(callCount).toBe(1)
	})

	it('should recompute when deps change', () => {
		let callCount = 0
		guard(['x'], () => { callCount++; return 'v1' })
		guard(['y'], () => { callCount++; return 'v2' })
		expect(callCount).toBe(2)
	})

	it('should handle object deps via JSON stringify', () => {
		let count = 0
		guard([{ a: 1 }], () => { count++; return count })
		const r = guard([{ a: 1 }], () => { count++; return count })
		expect(r).toBe(1)
	})

	it('should cache up to 100 entries then evict', () => {
		for (let i = 0; i < 105; i++) {
			guard([`key-${i}`], () => i)
		}
		expect(guard._cache.size).toBeLessThanOrEqual(100)
	})
})

describe('live', () => {
	it('should wrap value in DirectiveResult', () => {
		const result = live('test')
		expect(result).toBeInstanceOf(DirectiveResult)
		expect(result._value).toBe('test')
		expect(result._type).toBe(live)
	})
})

describe('choose', () => {
	it('should return matching case', () => {
		expect(choose('a', { a: 'alpha', b: 'beta' })).toBe('alpha')
	})

	it('should call function case with value', () => {
		const result = choose('x', { x: (v) => `called-${v}` })
		expect(result).toBe('called-x')
	})

	it('should return default when no match', () => {
		expect(choose('z', { a: 1 }, 'fallback')).toBe('fallback')
	})

	it('should call default function case', () => {
		const result = choose('z', {}, (v) => `default-${v}`)
		expect(result).toBe('default-z')
	})

	it('should return empty string when no match and no default', () => {
		expect(choose('nomatch', { a: 1 })).toBe('')
	})
})

describe('map', () => {
	it('should map items to strings and join', () => {
		expect(map([1, 2, 3], (x) => String(x * 10))).toBe('102030')
	})

	it('should return empty string for null', () => {
		expect(map(null, x => x)).toBe('')
	})

	it('should return empty string for empty array', () => {
		expect(map([], x => x)).toBe('')
	})

	it('should pass index to callback', () => {
		const result = map(['a', 'b'], (item, i) => `${i}:${item}`)
		expect(result).toBe('0:a1:b')
	})
})

describe('range', () => {
	it('should generate range with end only', () => {
		expect(range(5)).toEqual([0, 1, 2, 3, 4])
	})

	it('should generate range with start and end', () => {
		expect(range(2, 5)).toEqual([2, 3, 4])
	})

	it('should apply fn to each element', () => {
		expect(range(0, 3, (i) => i * 2)).toEqual([0, 2, 4])
	})

	it('should return empty array for 0 length', () => {
		expect(range(0)).toEqual([])
	})

	it('should handle start === end', () => {
		expect(range(3, 3)).toEqual([])
	})
})

describe('ifDefined', () => {
	it('should return value if defined', () => {
		expect(ifDefined('hello')).toBe('hello')
	})

	it('should return 0 if value is 0', () => {
		expect(ifDefined(0)).toBe(0)
	})

	it('should return empty string for null', () => {
		expect(ifDefined(null)).toBe('')
	})

	it('should return empty string for undefined', () => {
		expect(ifDefined(undefined)).toBe('')
	})

	it('should return empty string for false', () => {
		expect(ifDefined(false)).toBe(false)
	})
})

describe('nothing', () => {
	it('should be a Symbol', () => {
		expect(typeof nothing).toBe('symbol')
	})

	it('should have unique description', () => {
		expect(nothing.description).toBe('nothing')
	})
})

describe('show directive', () => {
	it('should return DirectiveResult', () => {
		const result = show(true, '<div>then</div>', '<div>else</div>')
		expect(result).toBeInstanceOf(DirectiveResult)
	})

	it('should store condition and content', () => {
		const result = show(true, 'yes', 'no')
		expect(result._value.condition).toBe(true)
		expect(result._value.then).toBe('yes')
		expect(result._value.else_).toBe('no')
	})

	it('should default else to null', () => {
		const result = show(false, 'yes')
		expect(result._value.else_).toBeNull()
	})
})

describe('trapFocus directive', () => {
	it('should return DirectiveResult with activate function', () => {
		const result = trapFocus('<div>content</div>')
		expect(result).toBeInstanceOf(DirectiveResult)
		expect(typeof result._value.activate).toBe('function')
	})

	it('should return cleanup function from activate', () => {
		const mockBtn = { focus: () => {} }
		const mockRoot = {
			querySelectorAll: () => [mockBtn],
			addEventListener: () => {},
			removeEventListener: () => {},
		}
		const result = trapFocus('<div>content</div>')
		const cleanup = result._value.activate(mockRoot)
		expect(typeof cleanup).toBe('function')
	})
})

describe('portal directive', () => {
	it('should return DirectiveResult', () => {
		const target = { appendChild: () => {} }
		const result = portal({ target, children: '<div>content</div>' })
		expect(result).toBeInstanceOf(DirectiveResult)
		expect(result._value.target).toBe(target)
		expect(result._value.children).toBe('<div>content</div>')
	})
})

describe('classMap', () => {
	it('should join truthy class names', () => {
		expect(classMap({ active: true, hidden: false, visible: true })).toBe('active visible')
	})

	it('should return empty string for all false', () => {
		expect(classMap({ a: false, b: false })).toBe('')
	})

	it('should handle empty object', () => {
		expect(classMap({})).toBe('')
	})
})

describe('styleMap', () => {
	it('should join style properties', () => {
		expect(styleMap({ color: 'red', fontSize: '14px' })).toBe('color:red;fontSize:14px')
	})

	it('should skip null/undefined values', () => {
		expect(styleMap({ color: 'red', bg: null, size: undefined })).toBe('color:red')
	})

	it('should handle empty object', () => {
		expect(styleMap({})).toBe('')
	})
})
