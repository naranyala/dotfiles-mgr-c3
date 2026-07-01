import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'
import * as processMonitor from '../process-monitor/index.js'
import * as health from '../health/index.js'
import * as network from '../network/index.js'
import * as metrics from '../metrics/index.js'

export const state = reactive({
	activeView: 'processes', // 'processes', 'health', 'network', 'metrics'
})

export async function init() {
	await Promise.all([
		processMonitor.init(),
		health.init(),
		network.init(),
		metrics.init()
	])
}

export function onMount(component) {
	component.delegate('click', '.tm-tab', (e) => {
		const tab = e.target.closest('.tm-tab')
		if (tab) {
			state.activeView = tab.dataset.view
		}
	})
}

export function render() {
	const views = [
		{ id: 'processes', label: 'Processes', icon: '⚙️' },
		{ id: 'health', label: 'Health', icon: '🌡️' },
		{ id: 'network', label: 'Network', icon: '🌐' },
		{ id: 'metrics', label: 'Metrics', icon: '📈' },
	]

	const activeTabs = views.map(v => `
		<button class="tm-tab ${state.activeView === v.id ? 'active' : ''}" data-view="${v.id}" style="padding: 8px 16px; border: none; background: transparent; color: ${state.activeView === v.id ? '#818cf8' : '#64748b'}; border-bottom: 2px solid ${state.activeView === v.id ? '#818cf8' : 'transparent'}; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;">
			${v.icon} ${v.label}
		</button>
	`).join('')

	let content = ''
	if (state.activeView === 'processes') content = processMonitor.render()
	else if (state.activeView === 'health') content = health.render()
	else if (state.activeView === 'network') content = network.render()
	else if (state.activeView === 'metrics') content = metrics.render()

	return html`
		<div class="card" style="height: 100%; display: flex; flex-direction: column; padding: 0;">
			<div class="hdr" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0 12px; display: flex; align-items: center;">
				<div style="display: flex; gap: 4px; width: 100%;">
					${activeTabs}
				</div>
			</div>
			<div class="bd" style="flex: 1; overflow-y: auto; padding: 12px;">
				${content}
			</div>
		</div>
	`
}
