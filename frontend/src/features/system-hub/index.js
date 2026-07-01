import * as system from '../../plugins/system/index.js'
import * as health from '../../plugins/health/index.js'
import * as probe from '../../plugins/probe/index.js'
import * as network from '../../plugins/network/index.js'
import * as metrics from '../../plugins/metrics/index.js'
import * as processes from '../../plugins/processes/index.js'

export const plugins = [system, health, probe, network, metrics, processes]

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
}

export function render() {
	return `
		<div class="grid2">
			<div class="card">${system.render()}</div>
			<div class="card">${health.render()}</div>
			<div class="card">${probe.render()}</div>
			<div class="card">${network.render()}</div>
			<div class="card">${metrics.render()}</div>
			<div class="card">${processes.render()}</div>
		</div>
	`
}
