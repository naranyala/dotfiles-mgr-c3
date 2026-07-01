import { reactive } from './signals.js'

export function createStore(initial, actions) {
	const state = reactive(initial)
	const bound = {}
	for (const key of Object.keys(actions)) {
		bound[key] = (...args) => {
			const result = actions[key](state, ...args)
			if (typeof result === 'function') return result()
			return result
		}
	}
	return { state, actions: bound }
}
