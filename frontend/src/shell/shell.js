/**
 * Shell API — frontend wrappers for the expanded shell plugin RPCs.
 * These are available via window.rpc automatically; this module adds
 * convenience and type hints.
 */

export const shell = {
	async exec(cmd) {
		const res = await window.rpc.exec(cmd)
		return res?.output ?? ''
	},

	async log(msg, level = 'info') {
		return window.rpc.log(msg, level)
	},

	// Environment
	async envGet(name) {
		const res = await window.rpc.envGet(name)
		return res?.value ?? null
	},

	async envSet(name, value) {
		return window.rpc.envSet(name, value)
	},

	async envList() {
		const res = await window.rpc.envList()
		return res ?? []
	},

	// Working directory
	async cwd() {
		const res = await window.rpc.cwd()
		return res?.path ?? '/'
	},

	async setCwd(path) {
		return window.rpc.setCwd(path)
	},

	// Background jobs
	async execBg(cmd) {
		const res = await window.rpc.execBg(cmd)
		return { jobId: res?.jobId, pid: res?.pid }
	},

	async execRead(jobId) {
		const res = await window.rpc.execRead(String(jobId))
		return { output: res?.output ?? '', running: res?.running ?? false, exitCode: res?.exitCode }
	},

	async execKill(jobId) {
		return window.rpc.execKill(String(jobId))
	},

	// Process signals
	async processSignal(pid, signal = 9) {
		return window.rpc.processSignal(pid, signal)
	},

	// Path utilities
	async pathJoin(...parts) {
		const res = await window.rpc.pathJoin(...parts)
		return res?.path ?? ''
	},

	async pathDirname(path) {
		const res = await window.rpc.pathDirname(path)
		return res?.path ?? '.'
	},

	async pathBasename(path) {
		const res = await window.rpc.pathBasename(path)
		return res?.name ?? ''
	},

	// Environment expansion
	async expandEnv(template) {
		const res = await window.rpc.expandEnv(template)
		return res?.value ?? template
	},
}
