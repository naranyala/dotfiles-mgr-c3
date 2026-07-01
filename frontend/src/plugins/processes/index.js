import { reactive, computed, watch } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	procs: [],
	loading: false,
	sortBy: 'cpu',
	autoRefresh: false,
	_filter: '',
})

const visible = computed(() => {
	const q = state._filter.toLowerCase()
	return !q ? state.procs : state.procs.filter(p =>
		(p.command + p.user).toLowerCase().includes(q)
	)
})

let _autoInterval = null

watch(() => state.autoRefresh, (v) => {
	if (v) {
		_autoInterval = setInterval(loadProcs, 3000)
	} else if (_autoInterval) {
		clearInterval(_autoInterval)
		_autoInterval = null
	}
})

export async function init() {
	await loadProcs()
}

async function loadProcs() {
	state.loading = true
	try {
		const res = await window.rpc.shell.psList(state.sortBy)
		if (res && !res.error) state.procs = res
	} catch (e) { /* ignore */ }
	state.loading = false
}

export function onMount(component) {
	component.delegate('click', '#btn-proc-refresh', () => loadProcs())
	component.delegate('click', '#btn-proc-sort-cpu', () => { state.sortBy = 'cpu'; loadProcs() })
	component.delegate('click', '#btn-proc-sort-mem', () => { state.sortBy = 'mem'; loadProcs() })
	component.delegate('click', '#btn-proc-auto', () => { state.autoRefresh = !state.autoRefresh })
	component.delegate('input', '#proc-filter', (e) => { state._filter = e.target.value })
	component.delegate('click', '[data-kill-pid]', (e) => {
		const pid = e.target.closest('[data-kill-pid]').dataset.killPid
		if (confirm(`Kill PID ${pid}?`)) {
			window.rpc.shell.psKill(pid).then(() => loadProcs())
		}
	})
}

export function render() {
	const filtered = visible.value
	const rows = filtered.map(p => {
		const cpuColor = p.cpu > 50 ? '#f87171' : p.cpu > 20 ? '#fbbf24' : '#34d399'
		const memColor = p.mem > 50 ? '#f87171' : p.mem > 20 ? '#fbbf24' : '#34d399'
		return `<div style="display:grid;grid-template-columns:40px 50px 50px 50px 1fr 40px;gap:4px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.78rem;font-family:ui-monospace,'Fira Code',monospace">
			<span style="color:#94a3b8">${p.pid}</span>
			<span style="color:${cpuColor}">${p.cpu}%</span>
			<span style="color:${memColor}">${p.mem}%</span>
			<span style="color:#94a3b8">${p.rss}</span>
			<span style="color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.command}</span>
			<button data-kill-pid="${p.pid}" style="background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);color:#f87171;padding:1px 6px;border-radius:4px;cursor:pointer;font-size:0.7rem;margin:0;box-shadow:none">✕</button>
		</div>`
	}).join('')

	return html`
		<div class="card">
			<div class="hdr">
				<span>Process Monitor</span>
				<div style="display:flex;gap:6px">
					<button id="btn-proc-auto" class="btn-icon" title="Auto-refresh" style="font-size:0.75rem;padding:4px 8px;${state.autoRefresh ? 'color:#34d399;border-color:rgba(52,211,153,0.4)' : ''}">${state.autoRefresh ? '⏸ Auto' : '⏵ Auto'}</button>
					<button id="btn-proc-refresh" class="btn-icon" title="Refresh">↻</button>
				</div>
			</div>
			<div class="bd">
				<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">
					<input id="proc-filter" placeholder="Filter…" style="margin:0;flex:1;padding:8px 10px;font-size:0.8rem" value="${state._filter}" />
					<button id="btn-proc-sort-cpu" class="btn-icon" style="font-size:0.75rem;padding:4px 8px;${state.sortBy === 'cpu' ? 'color:#818cf8;border-color:rgba(129,140,248,0.4)' : ''}">CPU</button>
					<button id="btn-proc-sort-mem" class="btn-icon" style="font-size:0.75rem;padding:4px 8px;${state.sortBy === 'mem' ? 'color:#818cf8;border-color:rgba(129,140,248,0.4)' : ''}">MEM</button>
				</div>
				<div style="display:grid;grid-template-columns:40px 50px 50px 50px 1fr 40px;gap:4px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.7rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">
					<span>PID</span><span>CPU</span><span>MEM</span><span>RSS</span><span>COMMAND</span><span></span>
				</div>
				${state.loading ? '<div style="text-align:center;padding:16px;color:#64748b">Loading…</div>' : rows || '<div style="text-align:center;padding:16px;color:#64748b">No processes</div>'}
			</div>
		</div>
	`
}
