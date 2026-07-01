import { describe, it, expect } from 'bun:test'

// rpc.js depends on window.__rpc being set at module scope
// Testing the proxy behavior directly

describe('rpc proxy', () => {
	it('should create proxy that delegates to __rpc', () => {
		const calls = []
		const mockRpc = (method, ...args) => {
			calls.push({ method, args })
			return { result: method }
		}

		const rpc = new Proxy({}, {
			get(_, method) {
				return (...args) => mockRpc(method, ...args)
			},
		})

		rpc.testMethod('arg1', 'arg2')
		expect(calls).toEqual([{ method: 'testMethod', args: ['arg1', 'arg2'] }])
	})

	it('should handle multiple method calls', () => {
		const calls = []
		const mockRpc = (method, ...args) => {
			calls.push(method)
			return {}
		}

		const rpc = new Proxy({}, {
			get(_, method) {
				return (...args) => mockRpc(method, ...args)
			},
		})

		rpc.hostname()
		rpc.username()
		rpc.memInfo()
		expect(calls).toEqual(['hostname', 'username', 'memInfo'])
	})

	it('should pass through return value', () => {
		const mockRpc = (method) => {
			return { custom: 'response', method }
		}

		const rpc = new Proxy({}, {
			get(_, method) {
				return (...args) => mockRpc(method, ...args)
			},
		})

		const result = rpc.systemInfo()
		expect(result).toEqual({ custom: 'response', method: 'systemInfo' })
	})

	it('should handle complex arguments', () => {
		let receivedArgs
		const mockRpc = (method, ...args) => {
			receivedArgs = args
			return {}
		}

		const rpc = new Proxy({}, {
			get(_, method) {
				return (...args) => mockRpc(method, ...args)
			},
		})

		rpc.writeFile('/tmp/test', 'content', { encoding: 'utf8' })
		expect(receivedArgs).toEqual(['/tmp/test', 'content', { encoding: 'utf8' }])
	})

	it('should handle no arguments', () => {
		let receivedMethod
		const mockRpc = (method) => {
			receivedMethod = method
			return { found: true }
		}

		const rpc = new Proxy({}, {
			get(_, method) {
				return (...args) => mockRpc(method, ...args)
			},
		})

		const result = rpc.noArgs()
		expect(receivedMethod).toBe('noArgs')
		expect(result).toEqual({ found: true })
	})

	it('should support different return types', () => {
		const mockRpc = (method) => {
			if (method === 'string') return 'hello'
			if (method === 'number') return 42
			if (method === 'boolean') return true
			if (method === 'array') return [1, 2, 3]
			return null
		}

		const rpc = new Proxy({}, {
			get(_, method) {
				return (...args) => mockRpc(method, ...args)
			},
		})

		expect(rpc.string()).toBe('hello')
		expect(rpc.number()).toBe(42)
		expect(rpc.boolean()).toBe(true)
		expect(rpc.array()).toEqual([1, 2, 3])
	})
})
