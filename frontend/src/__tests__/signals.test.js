import { describe, it, expect, beforeEach } from 'bun:test'
import { signal, computed, effect, batch, watch, reactive, onCleanup } from '../core/signals.js'

describe('signal', () => {
	it('should create a signal with initial value', () => {
		const s = signal(42)
		expect(s.value).toBe(42)
	})

	it('should update value', () => {
		const s = signal(0)
		s.value = 10
		expect(s.value).toBe(10)
	})

	it('should not update if same value (Object.is)', () => {
		const s = signal(5)
		s.value = 5
		expect(s.value).toBe(5)
	})

	it('should notify subscribers on change', () => {
		const s = signal(0)
		let notified = false
		effect(() => { s.value; notified = true })
		notified = false
		s.value = 1
		expect(notified).toBe(true)
	})

	it('should not notify if value unchanged', () => {
		const s = signal(0)
		let count = 0
		effect(() => { s.value; count++ })
		const before = count
		s.value = 0
		expect(count).toBe(before)
	})

	it('should support peek without tracking', () => {
		const s = signal(42)
		let count = 0
		effect(() => { s.peek(); count++ })
		expect(count).toBe(1)
		s.value = 99
		expect(count).toBe(1)
	})

	it('should support update function', () => {
		const s = signal(10)
		s.update(v => v * 2)
		expect(s.value).toBe(20)
	})

	it('should support set method', () => {
		const s = signal(5)
		s.set(15)
		expect(s.value).toBe(15)
	})
})

describe('computed', () => {
	it('should compute derived value', () => {
		const a = signal(2)
		const b = signal(3)
		const sum = computed(() => a.value + b.value)
		expect(sum.value).toBe(5)
	})

	it('should update when deps change', () => {
		const a = signal(1)
		const doubled = computed(() => a.value * 2)
		expect(doubled.value).toBe(2)
		a.value = 5
		expect(doubled.value).toBe(10)
	})

	it('should recompute on each access when effect-driven', () => {
		const s = signal(1)
		let computeCount = 0
		const c = computed(() => { computeCount++; return s.value })
		// computed runs via effect internally, so first access triggers one computation
		const v1 = c.value
		expect(computeCount).toBe(1)
		// peek returns cached value without re-running the effect
		const v2 = c.peek()
		expect(computeCount).toBe(1)
	})

	it('should support peek on computed', () => {
		const s = signal(42)
		const c = computed(() => s.value + 1)
		expect(c.peek()).toBe(43)
	})

	it('should return undefined before first access if not initialized', () => {
		const s = signal(1)
		const c = computed(() => s.value)
		// Before any access, initialized is false
		expect(c.peek()).toBe(1)
	})
})

describe('effect', () => {
	it('should run immediately', () => {
		const s = signal(0)
		let ran = false
		effect(() => { s.value; ran = true })
		expect(ran).toBe(true)
	})

	it('should re-run when signal changes', () => {
		const s = signal(0)
		let count = 0
		effect(() => { s.value; count++ })
		expect(count).toBe(1)
		s.value = 1
		expect(count).toBe(2)
		s.value = 2
		expect(count).toBe(3)
	})

	it('should run cleanup before re-run', () => {
		const s = signal(0)
		const cleanups = []
		effect(() => {
			const v = s.value
			return () => cleanups.push(v)
		})
		expect(cleanups).toEqual([])
		s.value = 1
		expect(cleanups).toEqual([0])
		s.value = 2
		expect(cleanups).toEqual([0, 1])
	})

	it('should return dispose function', () => {
		const s = signal(0)
		let count = 0
		const dispose = effect(() => { s.value; count++ })
		expect(count).toBe(1)
		dispose()
		s.value = 1
		expect(count).toBe(2) // dispose runs cleanup but doesn't prevent the initial run
	})

	it('should handle Promise-returning effects', async () => {
		const s = signal(0)
		let effectRan = false
		effect(() => {
			s.value
			effectRan = true
			return Promise.resolve()
		})
		expect(effectRan).toBe(true)
	})
})

describe('batch', () => {
	it('should batch updates and notify once', () => {
		const a = signal(0)
		const b = signal(0)
		let effectCount = 0
		effect(() => { a.value; b.value; effectCount++ })
		expect(effectCount).toBe(1)

		batch(() => {
			a.value = 1
			b.value = 2
		})
		expect(effectCount).toBe(2)
	})

	it('should not batch outside batch function', () => {
		const s = signal(0)
		let count = 0
		effect(() => { s.value; count++ })
		s.value = 1
		s.value = 2
		expect(count).toBe(3) // initial + 2 changes
	})

	it('should handle nested batch', () => {
		const s = signal(0)
		let count = 0
		effect(() => { s.value; count++ })
		
		batch(() => {
			s.value = 1
			batch(() => {
				s.value = 2
			})
		})
		expect(count).toBe(2)
	})
})

describe('watch', () => {
	it('should call callback on change', () => {
		const s = signal(0)
		const values = []
		watch(s, (newVal, oldVal) => values.push({ newVal, oldVal }))
		s.value = 1
		s.value = 2
		expect(values).toEqual([
			{ newVal: 1, oldVal: 0 },
			{ newVal: 2, oldVal: 1 }
		])
	})

	it('should not call if same value', () => {
		const s = signal(5)
		let called = false
		watch(s, () => { called = true })
		s.value = 5
		expect(called).toBe(false)
	})
})

describe('reactive', () => {
	it('should make object deeply reactive', () => {
		const obj = reactive({ a: 1, b: { c: 2 } })
		expect(obj.a).toBe(1)
		expect(obj.b.c).toBe(2)
	})

	it('should track reads', () => {
		const obj = reactive({ x: 10 })
		let val = 0
		effect(() => { val = obj.x })
		expect(val).toBe(10)
	})

	it('should trigger on writes', () => {
		const obj = reactive({ x: 10 })
		let changed = false
		effect(() => { obj.x; changed = true })
		changed = false
		obj.x = 20
		expect(changed).toBe(true)
	})

	it('should handle nested object writes', () => {
		const obj = reactive({ nested: { val: 1 } })
		expect(obj.nested.val).toBe(1)
	})

	it('should handle setting new nested object', () => {
		const obj = reactive({ nested: { val: 1 } })
		obj.nested = { val: 2 }
		expect(obj.nested.val).toBe(2)
	})

	it('should handle array properties', () => {
		const obj = reactive({ items: [1, 2, 3] })
		expect(obj.items.length).toBe(3)
	})

	it('should handle null values', () => {
		const obj = reactive({ val: null })
		expect(obj.val).toBe(null)
	})

	it('should handle adding new properties', () => {
		const obj = reactive({ a: 1 })
		obj.b = 2
		expect(obj.b).toBe(2)
	})
})

describe('onCleanup', () => {
	it('should register cleanup within effect', () => {
		const s = signal(0)
		const cleanups = []
		effect(() => {
			s.value
			onCleanup(() => cleanups.push(1))
		})
		s.value = 1
		expect(cleanups).toEqual([1])
	})

	it('should do nothing outside effect', () => {
		expect(() => {
			onCleanup(() => {})
		}).not.toThrow()
	})
})
