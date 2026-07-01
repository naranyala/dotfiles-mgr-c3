let activeEffect = null
let batchDepth = 0
const pendingEffects = new Set()

export function batch(fn) {
	batchDepth++
	try { fn() } finally {
		batchDepth--
		if (batchDepth === 0) {
			const run = Array.from(pendingEffects)
			pendingEffects.clear()
			for (const f of run) f()
		}
	}
}

export function signal(initial) {
	let value = initial
	const subs = new Set()

	const get = () => {
		if (activeEffect) subs.add(activeEffect)
		return value
	}
	const set = (v) => {
		if (Object.is(value, v)) return
		value = v
		if (batchDepth > 0) {
			for (const s of subs) pendingEffects.add(s)
		} else {
			for (const s of Array.from(subs)) s()
		}
	}

	const peek = () => value
	return {
		get value() { return get() },
		set value(v) { set(v) },
		peek,
		set,
		update: (fn) => set(fn(value)),
	}
}

export function computed(fn) {
	const s = signal(undefined)
	let initialized = false
	let disposed = false
	effect(() => { if (!disposed) { s.value = fn(); initialized = true } })
	return {
		get value() { return initialized ? s.value : fn() },
		peek: () => initialized ? s.peek() : fn(),
	}
}

const cleanupMap = new Map()

export function effect(fn) {
	const run = () => {
		const prevCleanups = cleanupMap.get(run)
		if (prevCleanups) for (const c of prevCleanups) c()
		cleanupMap.set(run, new Set())

		activeEffect = run
		let result
		try { result = fn() }
		finally { activeEffect = null }

		if (typeof result === 'function') {
			cleanupMap.get(run).add(result)
		} else if (result instanceof Promise) {
			result.then(r => { if (typeof r === 'function' && cleanupMap.has(run)) cleanupMap.get(run).add(r) })
		}
	}
	run()
	return () => {
		const c = cleanupMap.get(run)
		if (c) { for (const cb of c) cb(); cleanupMap.delete(run) }
	}
}

export function onCleanup(fn) {
	if (activeEffect) {
		const set = cleanupMap.get(activeEffect)
		if (set) set.add(fn)
	}
}

export function watch(src, cb) {
	if (typeof src === 'function') {
		let old = src()
		effect(() => { const v = src(); if (!Object.is(v, old)) { cb(v, old); old = v } })
		return
	}
	let old = src.peek()
	effect(() => { const v = src.value; if (!Object.is(v, old)) { cb(v, old); old = v } })
}

export function ref() {
	return { value: undefined }
}

export function memo(fn, eq = Object.is) {
	let cached
	let hasCached = false
	return computed(() => {
		const v = fn()
		if (hasCached && eq(cached, v)) return cached
		cached = v
		hasCached = true
		return v
	})
}

function deepReactive(obj, visited) {
	if (obj === null || typeof obj !== 'object') return obj
	if (visited.has(obj)) return obj
	visited.add(obj)

	const signals = {}

	for (const key of Object.keys(obj)) {
		const val = obj[key]
		if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
			obj[key] = deepReactive(val, visited)
		}
	}

	return new Proxy(obj, {
		get(_, prop) {
			const v = obj[prop]
			if (v !== null && typeof v === 'object' && !Array.isArray(v)) return v
			if (!signals[prop]) signals[prop] = signal(v)
			return signals[prop].value
		},
		set(_, prop, v) {
			obj[prop] = v
			if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
				obj[prop] = deepReactive(v, visited)
			}
			if (!signals[prop]) signals[prop] = signal(v)
			else signals[prop].value = v
			return true
		},
		getOwnPropertyDescriptor(target, prop) {
			return Object.getOwnPropertyDescriptor(target, prop)
		},
		ownKeys(target) { return Reflect.ownKeys(target) },
	})
}

export function reactive(obj) {
	return deepReactive(obj, new WeakSet())
}
