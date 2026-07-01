import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { signal, reactive, computed, effect, batch } from '../core/signals.js'
import { html } from '../core/template.js'

// Minimal DOM for tests
const _mockStyle = {}
globalThis.document = globalThis.document || {
	documentElement: {
		style: { setProperty(k, v) { _mockStyle[k] = v }, getPropertyValue(k) { return _mockStyle[k] || '' } },
	},
	createElement() { return { style: {} } },
}
globalThis.customElements = globalThis.customElements || {
	define: (name, cls) => { globalThis._elements = globalThis._elements || {}; globalThis._elements[name] = cls },
	get: (name) => globalThis._elements ? globalThis._elements[name] : undefined,
}
globalThis.window = globalThis.window || globalThis

// --- RPC bridge integration ---

describe('RPC bridge pattern', () => {
	beforeAll(() => {
		globalThis.psList = async () => JSON.stringify([
			{ user: 'root', pid: '1', cpu: 0.1, mem: 0.5, command: 'init' },
		])
		globalThis.psKill = async () => JSON.stringify({ ok: true })
		globalThis.systemProbe = async () => JSON.stringify({
			loadAvg: [1.0, 0.8, 0.5], procsTotal: 200, procsRunning: 3, cpuCores: 4,
		})
		globalThis.exists = async () => JSON.stringify(true)
		globalThis.isDir = async () => JSON.stringify(false)
		globalThis.stat = async () => JSON.stringify({ size: 1024, mode: '0644' })
		globalThis.mkdir = async () => JSON.stringify({ success: true })
		globalThis.remove = async () => JSON.stringify({ success: true })

		globalThis.window.rpc = globalThis.window.rpc || {}
		for (const method of ['shell.psList', 'shell.psKill', 'shell.systemProbe', 'shell.exists', 'shell.isDir', 'shell.stat', 'shell.mkdir', 'shell.remove']) {
			const name = method.split('.').pop()
			globalThis.window.rpc[method.split('.')[0]] = globalThis.window.rpc[method.split('.')[0]] || {}
			globalThis.window.rpc[method.split('.')[0]][name] = async (...args) => {
				const res = await globalThis[name](...args)
				try { return JSON.parse(res) } catch { return res }
			}
		}
	})

	it('rpc.proxy returns parsed JSON', async () => {
		const res = await globalThis.window.rpc.shell.psList('cpu')
		expect(Array.isArray(res)).toBe(true)
		expect(res[0].pid).toBe('1')
	})

	it('rpc.proxy returns object for systemProbe', async () => {
		const res = await globalThis.window.rpc.shell.systemProbe()
		expect(res.cpuCores).toBe(4)
	})
})

// --- Reactive Patterns ---

describe('Reactive core integration', () => {
	it('computed tracks reactive state changes', () => {
		const state = reactive({ items: [1, 2, 3], filter: '' })
		const filtered = computed(() =>
			!state.filter ? state.items : state.items.filter(i => i.toString().includes(state.filter))
		)
		expect(filtered.value).toEqual([1, 2, 3])
		state.filter = '2'
		expect(filtered.value).toEqual([2])
	})

	it('batch defers multiple reactive updates', () => {
		const state = reactive({ a: 0, b: 0 })
		let count = 0
		effect(() => { state.a; state.b; count++ })
		expect(count).toBe(1)
		batch(() => { state.a = 1; state.b = 2 })
		expect(count).toBe(2)
	})
})

// --- Plugin Contract Verification ---

describe('Plugin contract checks', () => {
	const plugins = {
		system: () => import('../plugins/system/index.js'),
		git: () => import('../plugins/git/index.js'),
		files: () => import('../plugins/files/index.js'),
		tools: () => import('../plugins/tools/index.js'),
		health: () => import('../plugins/health/index.js'),
		processes: () => import('../plugins/processes/index.js'),
		commands: () => import('../plugins/commands/index.js'),
		network: () => import('../plugins/network/index.js'),
		probe: () => import('../plugins/probe/index.js'),
		filetools: () => import('../plugins/filetools/index.js'),
		theme: () => import('../plugins/theme/index.js'),
	}

	for (const [name, imp] of Object.entries(plugins)) {
		it(`${name} plugin has required exports`, async () => {
			const mod = await imp()
			expect(mod.state).toBeDefined()
			expect(typeof mod.init).toBe('function')
			expect(typeof mod.render).toBe('function')
		})

		it(`${name} plugin render() returns string or template`, async () => {
			const mod = await imp()
			const res = mod.render()
			expect(res).toBeDefined()
		})
	}
})

// --- store.js integration ---

describe('Store integration', () => {
	it('handles async actions with loading state', async () => {
		const { createStore } = await import('../core/store.js')
		const { state, actions } = createStore(
			{ data: null, loading: false },
			{
				fetch: (s) => async () => {
					s.loading = true
					await new Promise(r => setTimeout(r, 5))
					s.data = 'done'
					s.loading = false
				},
			}
		)
		const p = actions.fetch()
		expect(state.loading).toBe(true)
		await p
		expect(state.data).toBe('done')
		expect(state.loading).toBe(false)
	})
})

// --- Token integration ---

describe('Token system integration', () => {
	it('applies design system to document', async () => {
		const { defineDesignSystem, applyDesignSystem, token } = await import('../core/tokens.js')
		defineDesignSystem('test', { color: '#fff' })
		applyDesignSystem('test')
		expect(token('test-color').value).toBe('#fff')
	})
})
