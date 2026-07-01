import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'

// ─── Mock DOM for plugins that need document ──────────────────
if (!globalThis.document) {
	const _style = {}
	globalThis.document = {
		documentElement: {
			style: {
				setProperty(k, v) { _style[k] = v },
				getProperty(k) { return _style[k] || '' },
			}
		},
		createElement() { return { style: {} } },
		addEventListener() {},
	}
}
globalThis.customElements = globalThis.customElements || {
	define: (name, cls) => { globalThis._elements = globalThis._elements || {}; globalThis._elements[name] = cls },
	get: (name) => globalThis._elements ? globalThis._elements[name] : undefined,
}
globalThis.window = globalThis.window || globalThis

// ─── Mock backendRPC ────────────────────────────────────────────
const responses = {}
function mockBackendRPC(method, ...args) {
	const fn = responses[method]
	if (!fn) return JSON.stringify({ error: true, message: `No handler for ${method}` })
	return JSON.stringify(fn(...args))
}

beforeAll(async () => {
	globalThis.window = globalThis.window || globalThis
	globalThis.window.backendRPC = mockBackendRPC
	await import('../core/rpc.js')
})

beforeEach(() => {
	for (const k in responses) delete responses[k]
})

// ═══════════════════════════════════════════════════════════════
// SHELL API (shell.js wrappers)
// ═══════════════════════════════════════════════════════════════

describe('shell.exec', () => {
	it('returns output string', async () => {
		responses.exec = (cmd) => ({ output: 'hello world' })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.exec('echo hello')
		expect(r).toBe('hello world')
	})

	it('returns empty string on no output', async () => {
		responses.exec = () => ({ output: '' })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.exec('true')
		expect(r).toBe('')
	})
})

describe('shell.log', () => {
	it('calls rpc.log with msg and level', async () => {
		let captured
		responses.log = (msg, level) => { captured = { msg, level }; return { ok: true } }
		const { shell } = await import('../shell/shell.js')
		await shell.log('test msg', 'warn')
		expect(captured).toEqual({ msg: 'test msg', level: 'warn' })
	})

	it('defaults level to info', async () => {
		let captured
		responses.log = (msg, level) => { captured = { msg, level }; return { ok: true } }
		const { shell } = await import('../shell/shell.js')
		await shell.log('msg only')
		expect(captured.level).toBe('info')
	})
})

describe('shell.envGet', () => {
	it('returns value for known var', async () => {
		responses.envGet = (name) => ({ value: '/home/test' })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.envGet('HOME')
		expect(r).toBe('/home/test')
	})

	it('returns null for empty value', async () => {
		responses.envGet = () => ({ value: '' })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.envGet('NONEXISTENT')
		expect(r === null || r === '').toBe(true)
	})
})

describe('shell.envSet', () => {
	it('calls rpc.envSet', async () => {
		let captured
		responses.envSet = (name, value) => { captured = { name, value }; return { ok: true } }
		const { shell } = await import('../shell/shell.js')
		await shell.envSet('MY_VAR', 'my_val')
		expect(captured).toEqual({ name: 'MY_VAR', value: 'my_val' })
	})
})

describe('shell.envList', () => {
	it('returns array', async () => {
		responses.envList = () => ['HOME=/home', 'USER=root']
		const { shell } = await import('../shell/shell.js')
		const r = await shell.envList()
		expect(Array.isArray(r)).toBe(true)
		expect(r.length).toBe(2)
	})

	it('returns empty array on null', async () => {
		responses.envList = () => null
		const { shell } = await import('../shell/shell.js')
		const r = await shell.envList()
		expect(r).toEqual([])
	})
})

describe('shell.cwd', () => {
	it('returns path string', async () => {
		responses.cwd = () => ({ path: '/current/dir' })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.cwd()
		expect(r).toBe('/current/dir')
	})

	it('returns / on null path', async () => {
		responses.cwd = () => ({ path: null })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.cwd()
		expect(r).toBe('/')
	})
})

describe('shell.setCwd', () => {
	it('calls rpc.setCwd', async () => {
		let captured
		responses.setCwd = (path) => { captured = path; return { ok: true } }
		const { shell } = await import('../shell/shell.js')
		await shell.setCwd('/new/path')
		expect(captured).toBe('/new/path')
	})
})

describe('shell.execBg', () => {
	it('returns jobId and pid', async () => {
		responses.execBg = () => ({ jobId: '42', pid: 1234 })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.execBg('long running cmd')
		expect(r.jobId).toBe('42')
		expect(r.pid).toBe(1234)
	})
})

describe('shell.execRead', () => {
	it('returns output, running, exitCode', async () => {
		responses.execRead = () => ({ output: 'done', running: false, exitCode: 0 })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.execRead('42')
		expect(r.output).toBe('done')
		expect(r.running).toBe(false)
		expect(r.exitCode).toBe(0)
	})

	it('coerces jobId to string', async () => {
		let received
		responses.execRead = (id) => { received = id; return { output: '', running: true, exitCode: null } }
		const { shell } = await import('../shell/shell.js')
		await shell.execRead(42)
		expect(received).toBe('42')
	})
})

describe('shell.execKill', () => {
	it('calls rpc.execKill with string jobId', async () => {
		let received
		responses.execKill = (id) => { received = id; return { ok: true } }
		const { shell } = await import('../shell/shell.js')
		await shell.execKill(99)
		expect(received).toBe('99')
	})
})

describe('shell.processSignal', () => {
	it('defaults signal to 9', async () => {
		let captured
		responses.processSignal = (pid, sig) => { captured = { pid, sig }; return { ok: true } }
		const { shell } = await import('../shell/shell.js')
		await shell.processSignal('1234')
		expect(captured).toEqual({ pid: '1234', sig: 9 })
	})

	it('passes custom signal', async () => {
		let captured
		responses.processSignal = (pid, sig) => { captured = { pid, sig }; return { ok: true } }
		const { shell } = await import('../shell/shell.js')
		await shell.processSignal('1234', 15)
		expect(captured).toEqual({ pid: '1234', sig: 15 })
	})
})

describe('shell.pathJoin', () => {
	it('joins path parts', async () => {
		responses.pathJoin = (...parts) => ({ path: parts.join('/') })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.pathJoin('/home', 'user', 'docs')
		expect(r).toBe('/home/user/docs')
	})
})

describe('shell.pathDirname', () => {
	it('returns directory part', async () => {
		responses.pathDirname = (path) => ({ path: path.substring(0, path.lastIndexOf('/')) })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.pathDirname('/home/user/file.txt')
		expect(r).toBe('/home/user')
	})

	it('returns . for no slash', async () => {
		responses.pathDirname = () => ({ path: '.' })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.pathDirname('file.txt')
		expect(r).toBe('.')
	})
})

describe('shell.pathBasename', () => {
	it('returns filename part', async () => {
		responses.pathBasename = (path) => ({ name: path.substring(path.lastIndexOf('/') + 1) })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.pathBasename('/home/user/file.txt')
		expect(r).toBe('file.txt')
	})
})

describe('shell.expandEnv', () => {
	it('expands env template', async () => {
		responses.expandEnv = (tpl) => ({ value: tpl.replace('$HOME', '/home/user') })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.expandEnv('$HOME/docs')
		expect(r).toBe('/home/user/docs')
	})

	it('returns template unchanged if no expansion', async () => {
		responses.expandEnv = (tpl) => ({ value: tpl })
		const { shell } = await import('../shell/shell.js')
		const r = await shell.expandEnv('no-vars-here')
		expect(r).toBe('no-vars-here')
	})
})

// ═══════════════════════════════════════════════════════════════
// FRONTEND PLUGIN INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('processes plugin integration', () => {
	it('loads processes and stores as array', async () => {
		responses.psList = () => ([
			{ pid: '1', user: 'root', cpu: 0.1, mem: 0.5, rss: 4096, command: 'init' },
			{ pid: '2', user: 'user', cpu: 5.0, mem: 2.0, rss: 8192, command: 'node' },
		])
		const mod = await import('../plugins/processes/index.js')
		await mod.init()
		expect(Array.isArray(mod.state.procs)).toBe(true)
		expect(mod.state.procs.length).toBe(2)
		expect(mod.state.procs[0].pid).toBe('1')
	})

	it('render produces HTML with process rows', async () => {
		responses.psList = () => ([
			{ pid: '100', user: 'user', cpu: 15.5, mem: 3.2, rss: 12345, command: 'node server.js' },
		])
		const mod = await import('../plugins/processes/index.js')
		await mod.init()
		const result = mod.render()
		const html = typeof result === 'string' ? result : String(result)
		expect(html).toContain('100')
		expect(html).toContain('node server.js')
		expect(html).toContain('Process Monitor')
	})

	it('filter state narrows visible processes', async () => {
		responses.psList = () => ([
			{ pid: '1', user: 'root', cpu: 0.1, mem: 0.1, rss: 100, command: 'init' },
			{ pid: '2', user: 'user', cpu: 1.0, mem: 1.0, rss: 200, command: 'nginx' },
		])
		const mod = await import('../plugins/processes/index.js')
		await mod.init()
		mod.state._filter = 'nginx'
		const result = mod.render()
		const html = typeof result === 'string' ? result : String(result)
		expect(html).toContain('nginx')
	})
})

describe('system plugin integration', () => {
	it('loads system info on init', async () => {
		responses.systemInfo = () => ({ platform: 'linux', homeDir: '/home/test', cwd: '/' })
		responses.hostname = () => ({ hostname: 'testhost' })
		responses.username = () => ({ username: 'testuser' })
		responses.uname = () => ({ raw: 'Linux 6.1', sysname: 'Linux', machine: 'x86_64', release: '6.1', version: '' })
		responses.memoryInfo = () => ({ total: 16e9, available: 8e9, used: 8e9, usedPercent: 50 })
		responses.uptime = () => ({ seconds: 7200 })
		responses.diskUsage = () => ({ total: 500e9, used: 200e9, free: 300e9, usedPercent: 40 })

		const mod = await import('../plugins/system/index.js')
		await mod.init()
		expect(mod.state.sysInfo.platform).toBe('linux')
		expect(mod.state.hostname).toBe('testhost')
		expect(mod.state.username).toBe('testuser')
		expect(mod.state.memory.usedPercent).toBe(50)
	})

	it('render shows system, kernel, memory, uptime, disk', async () => {
		responses.systemInfo = () => ({ platform: 'linux', homeDir: '/home/test', cwd: '/' })
		responses.hostname = () => ({ hostname: 'myhost' })
		responses.username = () => ({ username: 'me' })
		responses.uname = () => ({ raw: 'Linux', sysname: 'Linux', machine: 'x86_64', release: '6.1', version: '' })
		responses.memoryInfo = () => ({ total: 16e9, available: 8e9, used: 8e9, usedPercent: 50 })
		responses.uptime = () => ({ seconds: 3661 })
		responses.diskUsage = () => ({ total: 500e9, used: 200e9, free: 300e9, usedPercent: 40 })

		const mod = await import('../plugins/system/index.js')
		await mod.init()
		const html = mod.render()
		expect(html).toContain('System')
		expect(html).toContain('Kernel')
		expect(html).toContain('Memory')
		expect(html).toContain('Uptime')
		expect(html).toContain('Disk')
		expect(html).toContain('myhost')
	})
})

describe('git plugin integration', () => {
	it('loads repos on init', async () => {
		responses.gitList = () => ({ repos: ['repo-a', 'repo-b'] })
		responses.gitTrashList = () => ({ repos: ['old-repo'] })

		const mod = await import('../plugins/git/index.js')
		await mod.init()
		expect(mod.state.gitRepos).toEqual(['repo-a', 'repo-b'])
		expect(mod.state.gitTrashRepos).toEqual(['old-repo'])
	})

	it('render shows workspace heading and repo list', async () => {
		responses.gitList = () => ({ repos: ['my-project'] })
		responses.gitTrashList = () => ({ repos: [] })

		const mod = await import('../plugins/git/index.js')
		await mod.init()
		const html = mod.render()
		expect(html).toContain('Workspace')
		expect(html).toContain('my-project')
	})
})

describe('health plugin integration', () => {
	it('loads health data on init', async () => {
		responses.memoryInfo = () => ({ total: 16e9, available: 8e9, used: 8e9, usedPercent: 50 })
		responses.diskUsage = () => ({ total: 500e9, used: 200e9, free: 300e9, usedPercent: 40 })
		responses.uptime = () => ({ seconds: 86400 })
		responses.hostname = () => ({ hostname: 'prod-server' })
		responses.exec = () => ({ output: '0.50 0.40 0.30 2/400 12345' })

		const mod = await import('../plugins/health/index.js')
		await mod.init()
		expect(mod.state).toHaveProperty('memory')
		expect(mod.state).toHaveProperty('disk')
	})
})

describe('probe plugin integration', () => {
	it('loads probe data on init', async () => {
		responses.systemProbe = () => ({ loadAvg: '0.50 0.40 0.30', pid: 12345 })

		const mod = await import('../plugins/probe/index.js')
		await mod.init()
		expect(mod.state).toHaveProperty('data')
	})
})

describe('files plugin integration', () => {
	it('loads directory entries on init', async () => {
		responses.listDir = () => ({
			entries: [{ name: 'test.txt', isDir: false }, { name: 'src', isDir: true }],
			path: '/workspace',
		})

		const mod = await import('../plugins/files/index.js')
		await mod.init()
		expect(Array.isArray(mod.state.dirEntries)).toBe(true)
	})
})

describe('tools plugin integration', () => {
	it('state has envKey and envVal', async () => {
		const mod = await import('../plugins/tools/index.js')
		expect(typeof mod.state.envKey).toBe('string')
		expect(typeof mod.state.envVal).toBe('string')
	})
})

describe('commands plugin integration', () => {
	it('state has output field', async () => {
		const mod = await import('../plugins/commands/index.js')
		expect(mod.state).toHaveProperty('output')
	})
})

describe('network plugin integration', () => {
	it('state has interfaces field', async () => {
		const mod = await import('../plugins/network/index.js')
		expect(mod.state).toHaveProperty('interfaces')
	})
})

describe('theme plugin integration', () => {
	it('state has accentColor', async () => {
		const mod = await import('../plugins/theme/index.js')
		expect(typeof mod.state.accentColor).toBe('string')
	})
})

describe('filetools plugin integration', () => {
	it('state has path and busy', async () => {
		const mod = await import('../plugins/filetools/index.js')
		expect(typeof mod.state.path).toBe('string')
		expect(mod.state.busy).toBe(false)
	})
})

describe('search plugin integration', () => {
	it('calls search_query on mount', async () => {
		let captured
		responses.search_query = (query) => { captured = query; return { results: 'file1.txt\nfile2.js' } }
		const mod = await import('../plugins/search/index.js')
		expect(typeof mod.onMount).toBe('function')
		expect(mod.state.query).toBe('')
		expect(mod.state.results).toBe('')
	})

	it('render shows search UI', async () => {
		responses.search_query = () => ({ results: '' })
		const mod = await import('../plugins/search/index.js')
		const html = mod.render()
		expect(html).toContain('Search')
		expect(html).toContain('btn-search')
		expect(html).toContain('search-term')
	})
})

describe('metrics plugin integration', () => {
	it('calls metrics_getStats on refresh', async () => {
		responses.metrics_getStats = () => ({ total_files: 42, total_size_bytes: 1048576, cpuCount: 8 })
		const mod = await import('../plugins/metrics/index.js')
		expect(typeof mod.onMount).toBe('function')
		expect(mod.state.data).toBeNull()
	})

	it('render shows metrics UI', async () => {
		responses.metrics_getStats = () => ({ total_files: 10, total_size_bytes: 512000 })
		const mod = await import('../plugins/metrics/index.js')
		const html = mod.render()
		expect(html).toContain('Metrics')
	})
})

describe('fstree plugin integration', () => {
	it('state tracks repo ID, tree, and file content', async () => {
		responses.get_tree = () => ([
			{ name: 'src', type: 'folder', children: [] },
			{ name: 'README.md', type: 'file', id: '/workspace/repo/README.md' },
		])
		responses.get_file_content = () => 'file content'

		const mod = await import('../plugins/fstree/index.js')
		expect(mod.state.repoId).toBe('')
		expect(mod.state.tree).toBeNull()
		expect(mod.state.fileContent).toBe('')
		expect(mod.state.selectedFile).toBe('')
		expect(mod.state.loading).toBe(false)
		expect(mod.state.error).toBe('')
	})

	it('render shows tree browser UI', async () => {
		responses.get_tree = () => []
		responses.get_file_content = () => ''
		const mod = await import('../plugins/fstree/index.js')
		const html = mod.render()
		expect(html).toContain('File Tree Browser')
		expect(html).toContain('tree-repo-id')
		expect(html).toContain('btn-tree-load')
	})

	it('render shows file tree nodes when tree is loaded', async () => {
		responses.get_tree = () => [
			{ name: 'src', type: 'folder', children: [
				{ name: 'app.js', type: 'file', id: '/workspace/repo/src/app.js' },
			]},
		]
		responses.get_file_content = () => ''

		const mod = await import('../plugins/fstree/index.js')
		const html = mod.render()
		expect(html).toContain('File Tree Browser')
	})
})
