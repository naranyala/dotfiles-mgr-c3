export { state as systemState, init as systemInit, render as systemRender } from '../../plugins/system/index.js'
export { state as healthState, init as healthInit, render as healthRender, refresh } from '../../plugins/health/index.js'
export { state as probeState, init as probeInit, render as probeRender } from '../../plugins/probe/index.js'
export { state as processesState, init as processesInit, render as processesRender } from '../../plugins/processes/index.js'

import * as system from '../../plugins/system/index.js'
import * as health from '../../plugins/health/index.js'
import * as probe from '../../plugins/probe/index.js'
import * as processes from '../../plugins/processes/index.js'

export const plugins = [system, health, probe, processes]

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
}

export function render() {
	return `
		${system.render()}
		${health.render()}
		${probe.render()}
		${processes.render()}
	`
}
