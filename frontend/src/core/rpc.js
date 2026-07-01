window.rpc = new Proxy({}, {
	get(_, method) {
		return async (...args) => {
			if (!window.backendRPC) {
				throw new Error(`Backend RPC not available`)
			}
			const res = await window.backendRPC(method, ...args)
			try { return JSON.parse(res) } catch (e) { return res }
		}
	},
})
