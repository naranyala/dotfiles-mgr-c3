export { state as toolsState, init as toolsInit, render as toolsRender } from '../../plugins/tools/index.js'
export { state as commandsState, init as commandsInit, render as commandsRender } from '../../plugins/commands/index.js'
export { state as searchState, init as searchInit, render as searchRender } from '../../plugins/search/index.js'
export { state as metricsState, init as metricsInit, render as metricsRender } from '../../plugins/metrics/index.js'

import * as tools from '../../plugins/tools/index.js'
import * as commands from '../../plugins/commands/index.js'
import * as search from '../../plugins/search/index.js'
import * as metrics from '../../plugins/metrics/index.js'

export const plugins = [tools, commands, search, metrics]

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
}

export function render() {
	return `
		${tools.render()}
		${commands.render()}
		${search.render()}
		${metrics.render()}
	`
}
