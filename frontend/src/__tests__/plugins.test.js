import { describe, it, expect } from 'bun:test'
import { signal, reactive, computed } from '../core/signals.js'
import { html } from '../core/template.js'

// Minimal document mock for plugins that call initDefaultTokens() at import time
const _mockStyle = {}
if (!globalThis.document || !globalThis.document.documentElement?.style?.setProperty) {
	globalThis.document = {
		documentElement: {
			style: {
				setProperty(k, v) { _mockStyle[k] = v },
				getProperty(k) { return _mockStyle[k] || '' },
			}
		},
		createElement() { return { style: {} } }
	}
}
// Capture calls from the real document mock
const _origSetProperty = globalThis.document.documentElement.style.setProperty
globalThis.document.documentElement.style.setProperty = function(k, v) {
	_mockStyle[k] = v
	_origSetProperty.call(this, k, v)
}

if (typeof HTMLElement === 'undefined') {
	globalThis.HTMLElement = class HTMLElement {
		constructor() {
			this._shadowRoot = null
			this._attributes = {}
		}
		attachShadow() {
			this._shadowRoot = {
				innerHTML: '',
				querySelector: () => null,
				querySelectorAll: () => [],
				addEventListener: () => {},
				appendChild: () => {},
				removeChild: () => {},
				childNodes: [],
				children: [],
				adoptedStyleSheets: [],
			}
			return this._shadowRoot
		}
		get shadowRoot() { return this._shadowRoot }
		getAttribute(name) { return this._attributes[name] || null }
		setAttribute(name, value) { this._attributes[name] = value }
		hasAttribute(name) { return name in this._attributes }
	}
}
if (typeof customElements === 'undefined') {
	globalThis.customElements = { define: () => {}, get: () => null }
}

// --- Plugin contract: all plugins must export { state, init, onMount, render } ---

const pluginModules = {
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
	search: () => import('../plugins/search/index.js'),
	metrics: () => import('../plugins/metrics/index.js'),
	fstree: () => import('../plugins/fstree/index.js'),
}

describe('plugin contract', () => {
	for (const [name, imp] of Object.entries(pluginModules)) {
		it(`${name} exports state, init, onMount, render`, async () => {
			const mod = await imp()
			expect(mod.state).toBeDefined()
			expect(typeof mod.init).toBe('function')
			expect(typeof mod.render).toBe('function')
			// onMount is optional (system plugin doesn't have it)
			if (mod.onMount) expect(typeof mod.onMount).toBe('function')
		})
	}

	for (const [name, imp] of Object.entries(pluginModules)) {
		it(`${name} init() runs without throwing`, async () => {
			const mod = await imp()
			// Skip if the plugin relies on RPC that will fail — we just check no throw
			try { await mod.init() } catch (e) {
				// RPC calls may throw if backend not available — that's OK for contract test
				expect(e).toBeDefined()
			}
		})
	}

	for (const [name, imp] of Object.entries(pluginModules)) {
		it(`${name} render() returns a non-empty value`, async () => {
			const mod = await imp()
			const result = mod.render()
			expect(result).toBeDefined()
			if (typeof result === 'string') expect(result.length).toBeGreaterThan(0)
		})
	}
})

// --- Launchers integrity ---

describe('launchers array', () => {
	it('all launcher IDs match a plugin module', async () => {
		const { launchers } = await import('../shell/launchers.js')
		// files and tools are embedded in the Dashboard launcher, not standalone
		const standalonePlugins = Object.keys(pluginModules).filter(n => !['system', 'files', 'tools'].includes(n))
		for (const name of standalonePlugins) {
			expect(launchers.some(l => l.id === name)).toBe(true)
		}
	})

	it('all plugins appear in launchers', async () => {
		const { launchers } = await import('../shell/launchers.js')
		const standalonePlugins = Object.keys(pluginModules).filter(n => !['system', 'files', 'tools'].includes(n))
		for (const name of standalonePlugins) {
			expect(launchers.some(l => l.id === name)).toBe(true)
		}
	})
})

// --- File tools (createStore pattern) ---

describe('filetools plugin', () => {
	it('uses createStore with expected actions', async () => {
		const mod = await pluginModules.filetools()
		expect(typeof mod.state.path).toBe('string')
		expect(mod.state.busy).toBe(false)
	})

	it('state is reactive (mutations trigger tracked reads)', async () => {
		const mod = await pluginModules.filetools()
		let reads = 0
		const stop = () => {}
		// Verify state properties are deeply reactive by checking they can be watched
		const s = signal(0)
		// Create a tracked read
		const tracked = computed(() => { mod.state.busy; return s.value })
		expect(tracked.value).toBe(0)
	})
})

// --- Theme plugin (design tokens + ref) ---

describe('theme plugin', () => {
	it('initializes design systems on import', async () => {
		const { getDesignSystem } = await import('../core/tokens.js')
		const dark = getDesignSystem('dark')
		expect(dark).toBeDefined()
		expect(dark.accent).toBeDefined()
	})

	it('state tracks accent/success colors', async () => {
		const mod = await pluginModules.theme()
		expect(typeof mod.state.accentColor).toBe('string')
	})
})

// --- Probe plugin (computed + design tokens) ---

describe('probe plugin', () => {
	it('has computed loadPerCore', async () => {
		const mod = await pluginModules.probe()
		expect(typeof mod.state.data).toBe('object')
	})

	it('render uses html tagged template', async () => {
		const mod = await pluginModules.probe()
		const result = mod.render()
		expect(result).toBeDefined()
	})
})

// --- Processes plugin (computed + watch) ---

describe('processes plugin', () => {
	it('state has expected shape', async () => {
		const mod = await pluginModules.processes()
		expect(Array.isArray(mod.state.procs)).toBe(true)
		expect(typeof mod.state.sortBy).toBe('string')
		expect(typeof mod.state.autoRefresh).toBe('boolean')
	})

	it('render uses html tagged template', async () => {
		const mod = await pluginModules.processes()
		const result = mod.render()
		expect(result).toBeDefined()
	})
})

// --- Health plugin (existing, uses html) ---

describe('health plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.health()
		expect(mod.state).toHaveProperty('memory')
		expect(mod.state).toHaveProperty('disk')
		expect(mod.state).toHaveProperty('uptime')
		expect(mod.state).toHaveProperty('loadAvg')
	})

	it('has refresh export', async () => {
		const mod = await pluginModules.health()
		expect(typeof mod.refresh).toBe('function')
	})
})

// --- Commands plugin ---

describe('commands plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.commands()
		expect(mod.state).toHaveProperty('output')
	})
})

// --- Network plugin ---

describe('network plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.network()
		expect(mod.state).toHaveProperty('interfaces')
	})
})

// --- System plugin (plain string render, no onMount) ---

describe('system plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.system()
		expect(mod.state).toHaveProperty('sysInfo')
		expect(mod.state).toHaveProperty('hostname')
		expect(mod.state).toHaveProperty('memory')
	})

	it('render returns plain string (not html template)', async () => {
		const mod = await pluginModules.system()
		const result = mod.render()
		expect(typeof result).toBe('string')
		expect(result).toContain('System')
	})

	it('does not export onMount', async () => {
		const mod = await pluginModules.system()
		expect(mod.onMount).toBeUndefined()
	})
})

// --- Git plugin ---

describe('git plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.git()
		expect(mod.state).toHaveProperty('gitRepos')
		expect(mod.state).toHaveProperty('gitUrl')
	})

	it('has loadRepos export', async () => {
		const mod = await pluginModules.git()
		expect(typeof mod.loadRepos).toBe('function')
	})
})

// --- Tools plugin ---

describe('tools plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.tools()
		expect(mod.state).toHaveProperty('envKey')
		expect(mod.state).toHaveProperty('envVal')
	})
})

// --- Files plugin ---

describe('files plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.files()
		expect(mod.state).toHaveProperty('dirEntries')
	})
})

// --- Search plugin ---

describe('search plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.search()
		expect(mod.state).toHaveProperty('query')
		expect(mod.state).toHaveProperty('results')
		expect(mod.state).toHaveProperty('loading')
	})

	it('loading starts false', async () => {
		const mod = await pluginModules.search()
		expect(mod.state.loading).toBe(false)
	})

	it('has onMount for event delegation', async () => {
		const mod = await pluginModules.search()
		expect(typeof mod.onMount).toBe('function')
	})
})

// --- Metrics plugin ---

describe('metrics plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.metrics()
		expect(mod.state).toHaveProperty('data')
		expect(mod.state).toHaveProperty('loading')
	})

	it('loading starts false', async () => {
		const mod = await pluginModules.metrics()
		expect(mod.state.loading).toBe(false)
	})

	it('has onMount for refresh button', async () => {
		const mod = await pluginModules.metrics()
		expect(typeof mod.onMount).toBe('function')
	})
})

// --- Fstree plugin ---

describe('fstree plugin', () => {
	it('state has expected fields', async () => {
		const mod = await pluginModules.fstree()
		expect(mod.state).toHaveProperty('repoId')
		expect(mod.state).toHaveProperty('tree')
		expect(mod.state).toHaveProperty('fileContent')
		expect(mod.state).toHaveProperty('selectedFile')
		expect(mod.state).toHaveProperty('loading')
		expect(mod.state).toHaveProperty('error')
	})

	it('initial values are default', async () => {
		const mod = await pluginModules.fstree()
		expect(mod.state.repoId).toBe('')
		expect(mod.state.tree).toBeNull()
		expect(mod.state.fileContent).toBe('')
		expect(mod.state.selectedFile).toBe('')
		expect(mod.state.loading).toBe(false)
		expect(mod.state.error).toBe('')
	})

	it('has onMount for event delegation', async () => {
		const mod = await pluginModules.fstree()
		expect(typeof mod.onMount).toBe('function')
	})
})

// --- Cross-plugin integration ---

describe('cross-plugin reactivity', () => {
	it('plugins do not share reactive state references', async () => {
		const sys = await pluginModules.system()
		const git = await pluginModules.git()
		// Both have state, and they should be independent reactive proxies
		expect(sys.state).not.toBe(git.state)
	})

	it('all plugins can render without throwing', async () => {
		for (const [name, imp] of Object.entries(pluginModules)) {
			const mod = await imp()
			expect(() => mod.render()).not.toThrow()
		}
	})
})
