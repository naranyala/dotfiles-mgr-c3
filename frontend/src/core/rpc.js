const createRpcProxy = (path = []) => new Proxy({}, {
	get(_, method) {
		const newPath = [...path, method];

		// This allows window.rpc.foo() AND window.rpc.plugin.foo()
		const proxy = async (...args) => {
			const fullMethod = newPath.join('.');
			if (!window.backendRPC) {
				throw new Error(`Backend RPC not available`)
			}
			const res = await window.backendRPC(fullMethod, ...args)
			try { return JSON.parse(res) } catch (e) { return res }
		}

		// To support nesting, the returned function must also be a proxy
		return Object.assign(proxy, createRpcProxy(newPath))
	},
})

window.rpc = createRpcProxy()
