import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test'

// ─── Mock backendRPC ────────────────────────────────────────────
const handlers = {}
function mockBackendRPC(method, ...args) {
	const fn = handlers[method]
	if (!fn) return JSON.stringify({ error: true, message: `No handler for ${method}` })
	return JSON.stringify(fn(...args))
}

function registerHandler(method, fn) { handlers[method] = fn }
function registerHandlers(obj) { Object.assign(handlers, obj) }

beforeAll(async () => {
	globalThis.window = globalThis.window || globalThis
	globalThis.window.backendRPC = mockBackendRPC
	await import('../core/rpc.js')
})

afterEach(() => {
	for (const k in handlers) delete handlers[k]
})

async function call(method, ...args) {
	return await window.rpc[method](...args)
}

// ═══════════════════════════════════════════════════════════════
// 1. SYSTEM METHODS
// ═══════════════════════════════════════════════════════════════

describe('system RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			systemInfo: () => ({ platform: 'linux', homeDir: '/home/test', cwd: '/tmp' }),
			hostname: () => ({ hostname: 'test-host' }),
			username: () => ({ username: 'testuser' }),
			uname: () => ({ raw: 'Linux 6.1.0 x86_64', sysname: 'Linux', machine: 'x86_64', release: '6.1.0', version: '#1 SMP' }),
			memoryInfo: () => ({ total: 16e9, available: 8e9, used: 8e9, usedPercent: 50 }),
			uptime: () => ({ seconds: 3600.5 }),
			diskUsage: (path) => ({ total: 500e9, used: 200e9, free: 300e9, usedPercent: 40 }),
			systemProbe: () => ({ loadAvg: '0.50 0.40 0.30', pid: 12345 }),
			metrics_getStats: () => ({ uptime: 0, cpuCount: 8 }),
		})
	})

	it('systemInfo returns platform and homeDir', async () => {
		const r = await call('systemInfo')
		expect(r.platform).toBe('linux')
		expect(r.homeDir).toBe('/home/test')
	})

	it('hostname returns hostname string', async () => {
		const r = await call('hostname')
		expect(r.hostname).toBe('test-host')
	})

	it('username returns username string', async () => {
		const r = await call('username')
		expect(r.username).toBe('testuser')
	})

	it('uname returns kernel info', async () => {
		const r = await call('uname')
		expect(r.sysname).toBe('Linux')
		expect(typeof r.raw).toBe('string')
	})

	it('memoryInfo returns total/available/used/usedPercent', async () => {
		const r = await call('memoryInfo')
		expect(r.total).toBeGreaterThan(0)
		expect(r.available).toBeGreaterThan(0)
		expect(r.usedPercent).toBeGreaterThanOrEqual(0)
		expect(r.usedPercent).toBeLessThanOrEqual(100)
	})

	it('uptime returns seconds as number', async () => {
		const r = await call('uptime')
		expect(typeof r.seconds).toBe('number')
		expect(r.seconds).toBeGreaterThanOrEqual(0)
	})

	it('diskUsage returns total/used/free/usedPercent', async () => {
		const r = await call('diskUsage', '/')
		expect(r.total).toBeGreaterThan(0)
		expect(r.used).toBeGreaterThanOrEqual(0)
		expect(r.free).toBeGreaterThanOrEqual(0)
		expect(r.usedPercent).toBeGreaterThanOrEqual(0)
		expect(r.usedPercent).toBeLessThanOrEqual(100)
	})

	it('systemProbe returns loadAvg and pid', async () => {
		const r = await call('systemProbe')
		expect(typeof r.loadAvg).toBe('string')
		expect(r.pid).toBeGreaterThan(0)
	})

	it('metrics_getStats returns cpuCount', async () => {
		const r = await call('metrics_getStats')
		expect(r.cpuCount).toBeGreaterThan(0)
	})
})

// ═══════════════════════════════════════════════════════════════
// 2. FILE METHODS
// ═══════════════════════════════════════════════════════════════

describe('file RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			readFile: (path) => ({ content: 'file content here', size: 17, path }),
			writeFile: (path, content) => ({ ok: true, bytes: content.length }),
			exists: (path) => ({ exists: path === '/exists' }),
			isDir: (path) => ({ isDir: path === '/dir' }),
			stat: (path) => ({ path, size: 1024, mode: 33188, isDir: false, isFile: true }),
			mkdir: (path) => ({ ok: true }),
			remove: (path) => ({ ok: true }),
			listDir: (path) => ({
				entries: [
					{ name: 'file1.txt', isDir: false },
					{ name: 'subdir', isDir: true },
				],
				path,
			}),
			glob: (pattern) => ({ matches: ['/tmp/file1.txt', '/tmp/file2.js'] }),
		})
	})

	it('readFile returns content, size, path', async () => {
		const r = await call('readFile', '/tmp/test.txt')
		expect(r.content).toBe('file content here')
		expect(r.size).toBe(17)
		expect(r.path).toBe('/tmp/test.txt')
	})

	it('writeFile returns ok and byte count', async () => {
		const r = await call('writeFile', '/tmp/out.txt', 'hello')
		expect(r.ok).toBe(true)
		expect(r.bytes).toBe(5)
	})

	it('exists returns boolean-like', async () => {
		expect((await call('exists', '/exists')).exists).toBe(true)
		expect((await call('exists', '/missing')).exists).toBe(false)
	})

	it('isDir returns boolean-like', async () => {
		expect((await call('isDir', '/dir')).isDir).toBe(true)
		expect((await call('isDir', '/file')).isDir).toBe(false)
	})

	it('stat returns size, mode, isDir, isFile', async () => {
		const r = await call('stat', '/tmp/test.txt')
		expect(r.size).toBe(1024)
		expect(r.isFile).toBe(true)
		expect(r.isDir).toBe(false)
	})

	it('mkdir returns ok', async () => {
		const r = await call('mkdir', '/tmp/newdir')
		expect(r.ok).toBe(true)
	})

	it('remove returns ok', async () => {
		const r = await call('remove', '/tmp/oldfile')
		expect(r.ok).toBe(true)
	})

	it('listDir returns entries array with name and isDir', async () => {
		const r = await call('listDir', '/tmp')
		expect(Array.isArray(r.entries)).toBe(true)
		expect(r.entries.length).toBe(2)
		expect(r.entries[0].name).toBe('file1.txt')
		expect(r.entries[0].isDir).toBe(false)
		expect(r.entries[1].isDir).toBe(true)
	})

	it('glob returns matches array', async () => {
		const r = await call('glob', '/tmp/*.txt')
		expect(Array.isArray(r.matches)).toBe(true)
		expect(r.matches.length).toBe(2)
		expect(r.matches[0]).toContain('file1')
	})
})

// ═══════════════════════════════════════════════════════════════
// 3. GIT METHODS
// ═══════════════════════════════════════════════════════════════

describe('git RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			gitList: () => ({ repos: ['repo-a', 'repo-b', 'repo-c'] }),
			gitClone: (url) => ({ ok: true, repoName: 'cloned-repo' }),
			gitRemove: (name) => ({ ok: true }),
			gitRestore: (name) => ({ ok: true }),
			gitTrashList: () => ({ repos: ['deleted-repo'] }),
		})
	})

	it('gitList returns repos array', async () => {
		const r = await call('gitList')
		expect(Array.isArray(r.repos)).toBe(true)
		expect(r.repos.length).toBe(3)
	})

	it('gitClone returns ok and repoName', async () => {
		const r = await call('gitClone', 'https://github.com/test/repo.git')
		expect(r.ok).toBe(true)
		expect(r.repoName).toBe('cloned-repo')
	})

	it('gitRemove returns ok', async () => {
		const r = await call('gitRemove', 'repo-a')
		expect(r.ok).toBe(true)
	})

	it('gitRestore returns ok', async () => {
		const r = await call('gitRestore', 'deleted-repo')
		expect(r.ok).toBe(true)
	})

	it('gitTrashList returns repos array', async () => {
		const r = await call('gitTrashList')
		expect(Array.isArray(r.repos)).toBe(true)
	})
})

// ═══════════════════════════════════════════════════════════════
// 4. EXEC / SHELL METHODS
// ═══════════════════════════════════════════════════════════════

describe('exec and shell RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			exec: (cmd) => ({ output: `ran: ${cmd}` }),
			log: (msg, level) => ({ ok: true }),
			cwd: () => ({ path: '/current/dir' }),
			setCwd: (path) => ({ ok: true }),
			expandEnv: (tpl) => ({ value: tpl.replace('$HOME', '/home/user') }),
			pathJoin: (...parts) => ({ path: parts.join('/') }),
			pathDirname: (path) => ({ path: path.substring(0, path.lastIndexOf('/')) || '.' }),
			pathBasename: (path) => ({ name: path.substring(path.lastIndexOf('/') + 1) }),
		})
	})

	it('exec returns output string', async () => {
		const r = await call('exec', 'ls -la')
		expect(typeof r.output).toBe('string')
	})

	it('log returns ok', async () => {
		const r = await call('log', 'test message', 'info')
		expect(r.ok).toBe(true)
	})

	it('cwd returns path', async () => {
		const r = await call('cwd')
		expect(typeof r.path).toBe('string')
	})

	it('setCwd returns ok', async () => {
		const r = await call('setCwd', '/tmp')
		expect(r.ok).toBe(true)
	})

	it('expandEnv expands $HOME', async () => {
		const r = await call('expandEnv', '$HOME/docs')
		expect(r.value).toBe('/home/user/docs')
	})

	it('pathJoin joins parts', async () => {
		const r = await call('pathJoin', '/home', 'user', 'docs')
		expect(r.path).toBe('/home/user/docs')
	})

	it('pathDirname returns directory', async () => {
		const r = await call('pathDirname', '/home/user/file.txt')
		expect(r.path).toBe('/home/user')
	})

	it('pathBasename returns filename', async () => {
		const r = await call('pathBasename', '/home/user/file.txt')
		expect(r.name).toBe('file.txt')
	})
})

// ═══════════════════════════════════════════════════════════════
// 5. ENVIRONMENT / TOOLS METHODS
// ═══════════════════════════════════════════════════════════════

describe('environment and tools RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			envGet: (name) => ({ value: name === 'HOME' ? '/home/user' : '' }),
			envSet: (name, value) => ({ ok: true }),
			envList: () => ['HOME=/home/user', 'USER=testuser', 'PATH=/usr/bin'],
			which: (cmd) => ({ path: cmd === 'node' ? '/usr/bin/node' : '', found: cmd === 'node' }),
			clipboardGet: () => ({ text: 'clipboard content' }),
			clipboardSet: (text) => ({ ok: true }),
		})
	})

	it('envGet returns value for known var', async () => {
		const r = await call('envGet', 'HOME')
		expect(r.value).toBe('/home/user')
	})

	it('envGet returns empty for unknown var', async () => {
		const r = await call('envGet', 'NONEXISTENT')
		expect(r.value).toBe('')
	})

	it('envSet returns ok', async () => {
		const r = await call('envSet', 'MY_VAR', 'my_value')
		expect(r.ok).toBe(true)
	})

	it('envList returns array of KEY=VALUE strings', async () => {
		const r = await call('envList')
		expect(Array.isArray(r)).toBe(true)
		expect(r.length).toBeGreaterThan(0)
	})

	it('which returns path and found for existing cmd', async () => {
		const r = await call('which', 'node')
		expect(r.found).toBe(true)
	})

	it('which returns empty for missing cmd', async () => {
		const r = await call('which', 'nonexistent_cmd_xyz')
		expect(r.found).toBe(false)
	})

	it('clipboardGet returns text', async () => {
		const r = await call('clipboardGet')
		expect(typeof r.text).toBe('string')
	})

	it('clipboardSet returns ok', async () => {
		const r = await call('clipboardSet', 'new text')
		expect(r.ok).toBe(true)
	})
})

// ═══════════════════════════════════════════════════════════════
// 6. PROCESS METHODS
// ═══════════════════════════════════════════════════════════════

describe('process RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			psList: (sortBy) => ([
				{ pid: '1', user: 'root', cpu: 0.1, mem: 0.5, rss: 4096, command: 'init' },
				{ pid: '100', user: 'user', cpu: 5.2, mem: 2.1, rss: 8192, command: 'node server.js' },
			]),
			psKill: (pid) => ({ ok: true }),
			processSignal: (pid, sig) => ({ ok: true }),
		})
	})

	it('psList returns array of process objects', async () => {
		const r = await call('psList', 'cpu')
		expect(Array.isArray(r)).toBe(true)
		expect(r.length).toBe(2)
		expect(r[0].pid).toBe('1')
	})

	it('psList items have required fields', async () => {
		const r = await call('psList', 'cpu')
		for (const proc of r) {
			expect(typeof proc.pid).toBe('string')
			expect(typeof proc.user).toBe('string')
			expect(typeof proc.cpu).toBe('number')
			expect(typeof proc.mem).toBe('number')
			expect(typeof proc.command).toBe('string')
		}
	})

	it('psKill returns ok', async () => {
		const r = await call('psKill', '1234')
		expect(r.ok).toBe(true)
	})

	it('processSignal returns ok', async () => {
		const r = await call('processSignal', '1234', 9)
		expect(r.ok).toBe(true)
	})
})

// ═══════════════════════════════════════════════════════════════
// 7. SEARCH / METRICS / STATE METHODS
// ═══════════════════════════════════════════════════════════════

describe('search, metrics, and state RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			search_query: (query) => ({ results: `results for: ${query}` }),
			metrics_getStats: () => ({ uptime: 12345, cpuCount: 8 }),
			dumpBackendState: () => ({
				cwd: '/current',
				workspace: '/workspace',
				trash: '/workspace/.trash',
				methodCount: 42,
			}),
		})
	})

	it('search_query returns results string', async () => {
		const r = await call('search_query', 'function main')
		expect(typeof r.results).toBe('string')
		expect(r.results).toContain('function main')
	})

	it('metrics_getStats returns cpuCount', async () => {
		const r = await call('metrics_getStats')
		expect(r.cpuCount).toBeGreaterThan(0)
	})

	it('dumpBackendState returns cwd, workspace, trash, methodCount', async () => {
		const r = await call('dumpBackendState')
		expect(typeof r.cwd).toBe('string')
		expect(typeof r.workspace).toBe('string')
		expect(typeof r.trash).toBe('string')
		expect(typeof r.methodCount).toBe('number')
		expect(r.methodCount).toBeGreaterThan(0)
	})
})

// ═══════════════════════════════════════════════════════════════
// 8. FILE TREE METHODS (fstree plugin)
// ═══════════════════════════════════════════════════════════════

describe('file tree RPC methods', () => {
	beforeEach(() => {
		registerHandlers({
			get_tree: (repoId) => ([
				{ name: 'src', type: 'folder', children: [
					{ name: 'main.c3', type: 'file', id: `/workspace/${repoId}/src/main.c3` },
				]},
				{ name: 'README.md', type: 'file', id: `/workspace/${repoId}/README.md` },
			]),
			get_file_content: (entryId) => 'file content here',
		})
	})

	it('get_tree returns array of tree nodes', async () => {
		const r = await call('get_tree', 'my-repo')
		expect(Array.isArray(r)).toBe(true)
		expect(r.length).toBe(2)
	})

	it('get_tree nodes have name and type', async () => {
		const r = await call('get_tree', 'my-repo')
		for (const node of r) {
			expect(typeof node.name).toBe('string')
			expect(['folder', 'file']).toContain(node.type)
		}
	})

	it('get_tree folder nodes have children', async () => {
		const r = await call('get_tree', 'my-repo')
		const folder = r.find(n => n.type === 'folder')
		expect(folder).toBeDefined()
		expect(Array.isArray(folder.children)).toBe(true)
		expect(folder.children.length).toBeGreaterThan(0)
	})

	it('get_tree file nodes have id', async () => {
		const r = await call('get_tree', 'my-repo')
		const file = r.find(n => n.type === 'file')
		expect(file).toBeDefined()
		expect(typeof file.id).toBe('string')
		expect(file.id).toContain('/workspace/my-repo')
	})

	it('get_file_content returns raw string content', async () => {
		const r = await call('get_file_content', '/workspace/my-repo/src/main.c3')
		expect(typeof r).toBe('string')
		expect(r).toBe('file content here')
	})

	it('get_file_content entryId is used as file path', async () => {
		let captured
		registerHandler('get_file_content', (entryId) => { captured = entryId; return 'content' })
		await call('get_file_content', '/workspace/my-repo/README.md')
		expect(captured).toBe('/workspace/my-repo/README.md')
	})
})

// ═══════════════════════════════════════════════════════════════
// 9. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

describe('RPC error handling', () => {
	it('returns error object for unknown method', async () => {
		const r = await call('nonExistentMethod')
		expect(r.error).toBe(true)
		expect(typeof r.message).toBe('string')
	})

	it('returns error for handler that throws', async () => {
		registerHandler('throwingMethod', () => { throw new Error('boom') })
		await expect(call('throwingMethod')).rejects.toThrow()
	})

	it('backendRPC not available throws', async () => {
		const orig = window.backendRPC
		delete window.backendRPC
		await expect(call('anything')).rejects.toThrow('Backend RPC not available')
		window.backendRPC = orig
	})
})

// ═══════════════════════════════════════════════════════════════
// 10. PROXY BEHAVIOR
// ═══════════════════════════════════════════════════════════════

describe('RPC proxy behavior', () => {
	it('passes method name correctly', async () => {
		let received
		registerHandler('testProxy', (...args) => { received = args; return { ok: true } })
		await call('testProxy', 'a', 'b', 'c')
		expect(received).toEqual(['a', 'b', 'c'])
	})

	it('handles zero arguments', async () => {
		let called = false
		registerHandler('noArgs', () => { called = true; return { ok: true } })
		await call('noArgs')
		expect(called).toBe(true)
	})

	it('handles many arguments', async () => {
		let received
		registerHandler('manyArgs', (...args) => { received = args; return {} })
		await call('manyArgs', 1, 2, 3, 4, 5)
		expect(received).toEqual([1, 2, 3, 4, 5])
	})

	it('JSON-parses string results', async () => {
		registerHandler('jsonResult', () => ({ nested: { deep: true } }))
		const r = await call('jsonResult')
		expect(r.nested.deep).toBe(true)
	})

	it('returns raw string if not JSON', async () => {
		registerHandler('rawResult', () => 'not json')
		const r = await call('rawResult')
		expect(r).toBe('not json')
	})
})
