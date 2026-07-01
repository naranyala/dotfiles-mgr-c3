export const shell = {
	async exec(cmd) {
		const res = await window.rpc.shell.exec(cmd)
		return res?.output ?? ''
	},

	async log(msg, level = 'info') {
		return window.rpc.shell.log(msg, level)
	},

	async envGet(name) {
		const res = await window.rpc.shell.envGet(name)
		return res?.value ?? null
	},

	async envSet(name, value) {
		return window.rpc.shell.envSet(name, value)
	},

	async envList() {
		const res = await window.rpc.shell.envList()
		return res ?? []
	},

	async cwd() {
		const res = await window.rpc.shell.cwd()
		return res?.path ?? '/'
	},

	async setCwd(path) {
		return window.rpc.shell.setCwd(path)
	},

	async execBg(cmd) {
		const res = await window.rpc.shell.execBg(cmd)
		return { jobId: res?.jobId, pid: res?.pid }
	},

	async execRead(jobId) {
		const res = await window.rpc.shell.execRead(String(jobId))
		return { output: res?.output ?? '', running: res?.running ?? false, exitCode: res?.exitCode }
	},

	async execKill(jobId) {
		return window.rpc.shell.execKill(String(jobId))
	},

	async processSignal(pid, signal = 9) {
		return window.rpc.shell.processSignal(pid, signal)
	},

	async pathJoin(...parts) {
		const res = await window.rpc.shell.pathJoin(...parts)
		return res?.path ?? ''
	},

	async pathDirname(path) {
		const res = await window.rpc.shell.pathDirname(path)
		return res?.path ?? '.'
	},

	async pathBasename(path) {
		const res = await window.rpc.shell.pathBasename(path)
		return res?.name ?? ''
	},

	async expandEnv(template) {
		const res = await window.rpc.shell.expandEnv(template)
		return res?.value ?? template
	},
}
