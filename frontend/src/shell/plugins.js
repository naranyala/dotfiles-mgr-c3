import { registry } from './registry.js'
import * as system from '../plugins/system/index.js'
import * as git from '../plugins/git/index.js'
import * as files from '../plugins/files/index.js'
import * as tools from '../plugins/tools/index.js'
import * as health from '../plugins/health/index.js'
import * as processes from '../plugins/processes/index.js'
import * as commands from '../plugins/commands/index.js'
import * as network from '../plugins/network/index.js'
import * as probe from '../plugins/probe/index.js'
import * as filetools from '../plugins/filetools/index.js'
import * as theme from '../plugins/theme/index.js'
import * as search from '../plugins/search/index.js'
import * as metrics from '../plugins/metrics/index.js'
import * as fstree from '../plugins/fstree/index.js'

export const plugins = [system, git, files, tools, health, processes, commands, network, probe, filetools, theme, search, metrics, fstree]

const pluginNames = ['system', 'git', 'files', 'tools', 'health', 'processes', 'commands', 'network', 'probe', 'filetools', 'theme', 'search', 'metrics', 'fstree']

for (let i = 0; i < plugins.length; i++) {
	registry.register({ name: pluginNames[i], ...plugins[i] })
}

export function getPluginName(p) {
	const idx = plugins.indexOf(p)
	if (idx >= 0) return pluginNames[idx] || `plugin-${idx}`
	return p.name || 'unknown'
}

export function mergeStates() {
	const merged = {}
	for (const p of plugins) {
		for (const [k, v] of Object.entries(p.state)) {
			merged[k] = v
		}
	}
	return merged
}

export function collectPluginStates() {
	const snapshot = {}
	for (let i = 0; i < plugins.length; i++) {
		const name = pluginNames[i] || `plugin-${i}`
		const raw = {}
		for (const key of Object.keys(plugins[i].state)) {
			try { raw[key] = JSON.parse(JSON.stringify(plugins[i].state[key])) } catch { raw[key] = String(plugins[i].state[key]) }
		}
		snapshot[name] = raw
	}
	return snapshot
}

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
	setTimeout(() => window.dumpAllState(), 500)
}
