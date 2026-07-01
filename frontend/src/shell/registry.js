/**
 * Plugin Registry — formal lifecycle management for frontend plugins.
 *
 * Plugin interface:
 *   name: string           — unique identifier
 *   version?: string       — semver string
 *   description?: string   — human-readable purpose
 *   state: object          — reactive state (must be a signals reactive object)
 *   init(): Promise<void>  — called once at startup
 *   render(): string       — returns HTML template
 *   onMount?(component): void — called when dashboard mounts
 *   onUnmount?(): void     — called when dashboard unmounts
 */

import { reactive } from '../core/signals.js'

export class PluginRegistry {
	#plugins = new Map()
	#names = []
	#initialized = false

	register(plugin) {
		if (!plugin?.name) throw new Error('Plugin must have a name')
		if (this.#plugins.has(plugin.name)) {
			throw new Error(`Plugin "${plugin.name}" already registered`)
		}
		if (!plugin.state) plugin.state = reactive({})
		if (typeof plugin.init !== 'function') plugin.init = async () => {}
		if (typeof plugin.render !== 'function') plugin.render = () => ''

		this.#plugins.set(plugin.name, plugin)
		this.#names.push(plugin.name)
		return this
	}

	unregister(name) {
		const plugin = this.#plugins.get(name)
		if (!plugin) return false
		if (typeof plugin.onUnmount === 'function') plugin.onUnmount()
		this.#plugins.delete(name)
		this.#names = this.#names.filter(n => n !== name)
		return true
	}

	get(name) {
		return this.#plugins.get(name) || null
	}

	has(name) {
		return this.#plugins.has(name)
	}

	get names() {
		return [...this.#names]
	}

	get all() {
		return this.#names.map(n => this.#plugins.get(n))
	}

	get size() {
		return this.#plugins.size
	}

	async initAll() {
		if (this.#initialized) return
		const inits = this.all.map(p => Promise.resolve().then(() => p.init()))
		await Promise.all(inits)
		this.#initialized = true
	}

	mountAll(component) {
		for (const p of this.all) {
			if (typeof p.onMount === 'function') p.onMount(component)
		}
	}

	unmountAll() {
		for (const p of this.all) {
			if (typeof p.onUnmount === 'function') p.onUnmount()
		}
	}

	collectStates() {
		const snapshot = {}
		for (const p of this.all) {
			const raw = {}
			for (const key of Object.keys(p.state)) {
				try { raw[key] = JSON.parse(JSON.stringify(p.state[key])) } catch { raw[key] = String(p.state[key]) }
			}
			snapshot[p.name] = raw
		}
		return snapshot
	}

	mergeStates() {
		const merged = {}
		for (const p of this.all) {
			for (const [k, v] of Object.entries(p.state)) {
				merged[k] = v
			}
		}
		return merged
	}
}

export const registry = new PluginRegistry()
