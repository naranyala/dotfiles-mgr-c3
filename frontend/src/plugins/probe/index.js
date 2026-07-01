import { reactive, computed } from '../../core/signals.js'
import { html } from '../../core/template.js'
import { token, initDefaultTokens } from '../../core/tokens.js'

initDefaultTokens()

const colorOk = token('color-success')
const colorWarn = token('color-bg-hover')

export const state = reactive({
	data: null,
	refreshing: false,
})

const loadPerCore = computed(() => {
	if (!state.data || !Array.isArray(state.data.loadAvg)) return null
	const cores = state.data.cpuCores || 1
	return state.data.loadAvg.map(v => (v / cores).toFixed(2))
})

export async function init() {
	await refresh()
}

async function refresh() {
	state.refreshing = true
	try {
		state.data = await window.rpc.shell.systemProbe()
	} catch (e) { state.data = { error: e.message } }
	state.refreshing = false
}

export function onMount(component) {
	component.delegate('click', '#btn-probe-refresh', () => refresh())
}

function bar(pct) {
	const clamped = Math.max(0, Math.min(100, pct || 0))
	const filled = Math.round(clamped / 5)
	const empty = 20 - filled
	const color = clamped > 80 ? '#f87171' : clamped > 60 ? '#fbbf24' : '#34d399'
	return `<span style="color:${color}">${'█'.repeat(filled)}${'░'.repeat(empty)}</span> ${clamped.toFixed(1)}%`
}

export function render() {
	const d = state.data
	const lpc = loadPerCore.value

	return html`
		<div class="card">
			<div class="hdr">
				<span>System Probe</span>
				<button id="btn-probe-refresh" class="btn-icon" title="Refresh">↻</button>
			</div>
			<div class="bd">
				${!d ? '<div style="color:#64748b">Loading…</div>' :
				d.error ? `<span class="err">${d.error}</span>` :
				!d.loadAvg ? '<div style="color:#64748b">No data available</div>' : `
					<label style="font-size:0.8rem;margin-bottom:12px">CPU Load (per core)</label>
					<div class="mono" style="font-size:0.8rem">
						${['1m', '5m', '15m'].map((label, i) => `
							<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
								<span style="color:#64748b;width:24px">${label}</span>
								<span style="color:${d.loadAvg[i] > d.cpuCores ? '#f87171' : d.loadAvg[i] > d.cpuCores * 0.7 ? '#fbbf24' : '#34d399'}">
									${'█'.repeat(Math.min(20, Math.round((d.loadAvg[i] / Math.max(d.cpuCores, 1)) * 20)))}
								</span>
								<span style="color:#94a3b8;font-size:0.75rem">${lpc ? lpc[i] : '—'}</span>
							</div>`).join('')}
					</div>

					<label style="font-size:0.8rem;margin:16px 0 8px">Processes</label>
					<div class="mono" style="font-size:0.8rem">
						Total: <span style="color:#cbd5e1">${d.procsTotal}</span>
						&nbsp;&nbsp;Running: <span style="color:#34d399">${d.procsRunning}</span>
					</div>

					<label style="font-size:0.8rem;margin:16px 0 8px">CPU Cores</label>
					<div class="mono" style="font-size:0.8rem">
						<span style="color:#cbd5e1">${d.cpuCores}</span>
					</div>
				`}
			</div>
		</div>
	`
}
