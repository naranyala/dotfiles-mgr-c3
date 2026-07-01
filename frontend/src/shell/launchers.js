import * as systemFeature from '../features/system/index.js'
import * as gitFeature from '../features/git/index.js'
import * as filesFeature from '../features/files/index.js'
import * as toolsFeature from '../features/tools/index.js'
import * as workspaceFeature from '../features/workspace/index.js'
import * as themeFeature from '../features/theme/index.js'
import * as health from '../plugins/health/index.js'
import * as processes from '../plugins/processes/index.js'
import * as commands from '../plugins/commands/index.js'
import * as network from '../plugins/network/index.js'
import * as probe from '../plugins/probe/index.js'
import * as filetools from '../plugins/filetools/index.js'
import * as search from '../plugins/search/index.js'
import * as metrics from '../plugins/metrics/index.js'
import * as fstree from '../plugins/fstree/index.js'

export const launchers = [
	{
		id: 'dashboard', icon: '⊞', title: 'Dashboard',
		desc: 'System overview, workspace management & tools',
		content: () => `
			${gitFeature.render()}
			<div class="grid2">
				${systemFeature.render()}
				${toolsFeature.render()}
				${filesFeature.render()}
			</div>
			<div class="full-width">
				<label>Terminal Logs</label>
				<terminal-view></terminal-view>
			</div>`
	},
	{
		id: 'health', icon: '♥', title: 'System Health',
		desc: 'Memory, disk usage, uptime & load averages',
		content: () => `${health.render()}`
	},
	{
		id: 'processes', icon: '⚙', title: 'Processes',
		desc: 'Live process monitor with CPU & memory usage',
		content: () => `${processes.render()}`
	},
	{
		id: 'commands', icon: '⌨', title: 'Commands',
		desc: 'Run shell commands with preset shortcuts',
		content: () => `${commands.render()}`
	},
	{
		id: 'network', icon: '⊕', title: 'Network',
		desc: 'Interfaces, gateway, DNS & public IP',
		content: () => `${network.render()}`
	},
	{
		id: 'git', icon: '⑂', title: 'Git',
		desc: 'Clone, manage & restore git repositories',
		content: () => `${gitFeature.render()}`
	},
	{
		id: 'terminal', icon: '〉', title: 'Terminal',
		desc: 'Interactive terminal with command history',
		content: () => `
			<div class="full-width">
				<xterm-terminal></xterm-terminal>
			</div>`
	},
	{
		id: 'probe', icon: '◎', title: 'System Probe',
		desc: 'CPU load, processes & core info via /proc',
		content: () => `${probe.render()}`
	},
	{
		id: 'monitor', icon: '◫', title: 'System Monitor',
		desc: 'Real-time CPU & memory usage charts',
		content: () => `<div class="full-width"><system-monitor></system-monitor></div>`
	},
	{
		id: 'editor', icon: '✎', title: 'Config Editor',
		desc: 'Edit config files with syntax highlighting',
		content: () => `<div class="full-width"><config-editor></config-editor></div>`
	},
	{
		id: 'filetools', icon: '⚒', title: 'File Tools',
		desc: 'Quick path check, mkdir & remove',
		content: () => `${filetools.render()}`
	},
	{
		id: 'theme', icon: '◐', title: 'Theme Switcher',
		desc: 'Toggle dark/light design tokens',
		content: () => `${themeFeature.render()}`
	},
	{
		id: 'search', icon: '⌕', title: 'Code Search',
		desc: 'Search code with git grep',
		content: () => `${search.render()}`
	},
	{
		id: 'metrics', icon: '📊', title: 'Metrics',
		desc: 'File count and total size of workspace',
		content: () => `${metrics.render()}`
	},
	{
		id: 'fstree', icon: '🌳', title: 'File Tree',
		desc: 'Browse repository directory tree',
		content: () => `${fstree.render()}`
	},
]

export function fuzzyMatch(text, query) {
	if (!query) return true
	text = text.toLowerCase()
	query = query.toLowerCase()
	let qi = 0
	for (let ti = 0; ti < text.length && qi < query.length; ti++) {
		if (text[ti] === query[qi]) qi++
	}
	return qi === query.length
}
