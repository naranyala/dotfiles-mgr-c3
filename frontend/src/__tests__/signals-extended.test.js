import { describe, it, expect } from 'bun:test'
import { signal, ref, memo, effect } from '../core/signals.js'

describe('ref', () => {
	it('should return object with undefined value', () => {
		const r = ref()
		expect(r.value).toBeUndefined()
	})

	it('should allow setting value', () => {
		const r = ref()
		r.value = 'hello'
		expect(r.value).toBe('hello')
	})

	it('should be a plain object (not reactive)', () => {
		const r = ref()
		let effectCount = 0
		effect(() => {
			r.value
			effectCount++
		})
		r.value = 'changed'
		expect(effectCount).toBe(1)
	})

	it('should hold any type', () => {
		const r = ref()
		r.value = 42
		expect(r.value).toBe(42)
		r.value = { nested: true }
		expect(r.value).toEqual({ nested: true })
		r.value = [1, 2, 3]
		expect(r.value).toEqual([1, 2, 3])
	})

	it('should allow overwriting', () => {
		const r = ref()
		r.value = 'first'
		r.value = 'second'
		expect(r.value).toBe('second')
	})
})

describe('memo', () => {
	it('should return computed-like object', () => {
		const s = signal(5)
		const m = memo(() => s.value * 2)
		expect(m.value).toBe(10)
	})

	it('should update when deps change', () => {
		const s = signal(3)
		const m = memo(() => s.value + 1)
		expect(m.value).toBe(4)
		s.value = 10
		expect(m.value).toBe(11)
	})

	it('should cache when value is equal', () => {
		const s = signal('x')
		let computeCount = 0
		const m = memo(() => { computeCount++; return s.value.toUpperCase() })
		m.value
		m.value
		m.value
		expect(computeCount).toBe(1)
	})

	it('should recompute when value changes', () => {
		const s = signal('a')
		let computeCount = 0
		const m = memo(() => { computeCount++; return s.value })
		m.value
		expect(computeCount).toBe(1)
		s.value = 'b'
		m.value
		expect(computeCount).toBe(2)
	})

	it('should support custom equality function', () => {
		const s = signal({ x: 1 })
		let computeCount = 0
		const m = memo(
			() => { computeCount++; return s.value.x },
			(a, b) => a === b
		)
		m.value
		expect(computeCount).toBe(1)
		s.value = { x: 1 }
		m.value
		expect(computeCount).toBe(2)
	})

	it('should have peek method', () => {
		const s = signal(7)
		const m = memo(() => s.value)
		expect(m.peek()).toBe(7)
	})

	it('should not track in peek', () => {
		const s = signal(1)
		let effectCount = 0
		const m = memo(() => s.value * 10)
		effect(() => {
			m.peek()
			effectCount++
		})
		const before = effectCount
		s.value = 2
		expect(effectCount).toBe(before)
	})

	it('should handle null/undefined', () => {
		const s = signal(null)
		const m = memo(() => s.value)
		expect(m.value).toBeNull()
		s.value = undefined
		expect(m.value).toBeUndefined()
	})

	it('should handle object memoization', () => {
		const s = signal(1)
		const m = memo(() => ({ doubled: s.value * 2 }))
		const r1 = m.value
		const r2 = m.value
		expect(r1).toBe(r2)
		expect(r1.doubled).toBe(2)
		s.value = 5
		const r3 = m.value
		expect(r3.doubled).toBe(10)
	})
})
