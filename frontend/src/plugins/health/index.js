import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	memory: null,
	disk: null,
	uptime: null,
	hostname: '',
	loadAvg: '',
	refreshing: false,
})

function bar(pct) {
	const clamped = Math.max(0, Math.min(100, pct || 0))
	const filled = Math.round(clamped / 5)
	const empty = 20 - filled
	const color = clamped > 80 ? '#f87171' : clamped > 60 ? '#fbbf24' : '#34d399'
	return `<span style="color:${color}">${'█'.repeat(filled)}${'░'.repeat(empty)}</span> ${clamped.toFixed(1)}%`
}

function formatBytes(b) {
	if (b == null) return '—'
	if (b < 1024) return b + ' B'
	if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
	if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'
	return (b / 1073741824).toFixed(2) + ' GB'
}

function formatUptime(s) {
	if (s == null) return '—'
	const d = Math.floor(s / 86400)
	const h = Math.floor((s % 86400) / 3600)
	const m = Math.floor((s % 3600) / 60)
	if (d > 0) return `${d}d ${h}h ${m}m`
	if (h > 0) return `${h}h ${m}m`
	return `${m}m`
}

export async function init() {
	try { state.memory = await window.rpc.memoryInfo() } catch (e) { state.memory = { error: e.message } }
	try { state.disk = await window.rpc.diskUsage('/') } catch (e) { state.disk = { error: e.message } }
	try { state.uptime = await window.rpc.uptime() } catch (e) { state.uptime = { error: e.message } }
	try { state.hostname = (await window.rpc.hostname()).hostname } catch (e) { state.hostname = '—' }
	try {
		const res = await window.rpc.exec('cat /proc/loadavg')
		if (!res.error) state.loadAvg = res.output.trim().split(' ').slice(0, 3).join('  ')
	} catch (e) { state.loadAvg = '—' }
}

export async function refresh() {
	state.refreshing = true
	await init()
	state.refreshing = false
}

export function onMount(component) {
	component.delegate('click', '#btn-health-refresh', () => refresh())
}

export function render() {
	const m = state.memory
	const d = state.disk
	const u = state.uptime
	const memPct = m && !m.error ? m.usedPercent : 0
	const diskPct = d && !d.error ? d.usedPercent : 0
	const memUsed = m && !m.error ? formatBytes(m.total - m.available) : '—'
	const memTotal = m && !m.error ? formatBytes(m.total) : '—'
	const diskUsed = d && !d.error ? formatBytes(d.total - d.free) : '—'
	const diskTotal = d && !d.error ? formatBytes(d.total) : '—'

	return html`
		<div class="card">
			<div class="hdr">
				<span>System Health</span>
				<button id="btn-health-refresh" class="btn-icon" title="Refresh">↻</button>
			</div>
			<div class="bd">
				<div style="margin-bottom:12px">
					<label>Memory</label>
					<div class="mono" style="font-size:0.8rem">${m && !m.error ? bar(memPct) : '—'}</div>
					<div style="font-size:0.75rem;color:#64748b;margin-top:4px">${memUsed} / ${memTotal}</div>
				</div>
				<div style="margin-bottom:12px">
					<label>Disk (/)</label>
					<div class="mono" style="font-size:0.8rem">${d && !d.error ? bar(diskPct) : '—'}</div>
					<div style="font-size:0.75rem;color:#64748b;margin-top:4px">${diskUsed} / ${diskTotal}</div>
				</div>
				<div>
					<label>System</label>
					<div class="mono" style="font-size:0.8rem">
Host: ${state.hostname}
Uptime: ${u && !u.error ? formatUptime(u.seconds) : '—'}
Load: ${state.loadAvg || '—'}
					</div>
				</div>
			</div>
		</div>
	`
}
