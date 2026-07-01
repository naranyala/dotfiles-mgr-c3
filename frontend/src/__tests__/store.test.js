import { describe, it, expect } from 'bun:test'
import { createStore } from '../core/store.js'

describe('createStore', () => {
	it('should create store with state and actions', () => {
		const { state, actions } = createStore(
			{ count: 0 },
			{ increment: (s) => s.count++ }
		)
		expect(state.count).toBe(0)
		expect(typeof actions.increment).toBe('function')
	})

	it('should mutate state via actions', () => {
		const { state, actions } = createStore(
			{ count: 0 },
			{ increment: (s) => s.count++ }
		)
		actions.increment()
		expect(state.count).toBe(1)
	})

	it('should pass extra args to actions', () => {
		const { state, actions } = createStore(
			{ value: 0 },
			{ add: (s, n) => s.value += n }
		)
		actions.add(10)
		expect(state.value).toBe(10)
	})

	it('should support multiple actions', () => {
		const { state, actions } = createStore(
			{ count: 0 },
			{
				increment: (s) => s.count++,
				decrement: (s) => s.count--,
				reset: (s) => s.count = 0,
			}
		)
		actions.increment()
		actions.increment()
		expect(state.count).toBe(2)
		actions.decrement()
		expect(state.count).toBe(1)
		actions.reset()
		expect(state.count).toBe(0)
	})

	it('should create new actions object on each createStore', () => {
		const store1 = createStore({ x: 1 }, { inc: (s) => s.x++ })
		const store2 = createStore({ x: 10 }, { inc: (s) => s.x++ })
		store1.actions.inc()
		expect(store1.state.x).toBe(2)
		expect(store2.state.x).toBe(10)
	})

	it('should handle complex state objects', () => {
		const { state, actions } = createStore(
			{ items: [], name: 'test' },
			{
				addItem: (s, item) => s.items.push(item),
				setName: (s, name) => s.name = name,
			}
		)
		actions.addItem('a')
		actions.setName('new')
		expect(state.items).toEqual(['a'])
		expect(state.name).toBe('new')
	})

	it('should handle async actions', async () => {
		const { state, actions } = createStore(
			{ data: null, loading: false },
			{
				fetchData: async (s) => {
					s.loading = true
					await new Promise(r => setTimeout(r, 10))
					s.data = 'result'
					s.loading = false
				},
			}
		)
		expect(state.loading).toBe(false)
		const promise = actions.fetchData()
		expect(state.loading).toBe(true)
		await promise
		expect(state.data).toBe('result')
		expect(state.loading).toBe(false)
	})
})
