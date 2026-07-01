const createRpcProxy = (path = []) => {
	const handler = {
		get(_, method) {
			return createRpcProxy([...path, method])
		},
		apply(_, __, args) {
			const fullMethod = path.join('.');
			if (!window.backendRPC) {
				throw new Error(`Backend RPC not available`)
			}
			return (async () => {
				const res = await window.backendRPC(fullMethod, ...args)
				try { return JSON.parse(res) } catch (e) { return res }
			})()
		}
	}
	return new Proxy(() => {}, handler)
}

window.rpc = createRpcProxy()
