import { reactive, computed } from '../../core/signals.js'
import { html } from '../../core/template.js'
import { uiCard } from '../../shared/index.js'

export const state = reactive({
	envList: [],
	envKey: '',
	envVal: '',
	searchQuery: '',
	loading: false,
})

export async function init() {
	await loadEnv()
}

async function loadEnv() {
	state.loading = true
	try {
		state.envList = await window.rpc.shell.envList()
	} catch (e) {
		state.envList = []
	}
	state.loading = false
}

const filteredEnv = computed(() => {
	const q = state.searchQuery.toLowerCase()
	if (!q) return state.envList
	return state.envList.filter(e => e.toLowerCase().includes(q))
})

export function onMount(component) {
	component.delegate('click', '#btn-env-refresh', () => loadEnv())
	component.delegate('input', '#env-search', (e) => { state.searchQuery = e.target.value })
	component.delegate('input', '#env-key-input', (e) => { state.envKey = e.target.value })
	component.delegate('input', '#env-val-input', (e) => { state.envVal = e.target.value })
	component.delegate('click', '#btn-env-get', async () => {
		if (!state.envKey) return
		try {
			const res = await window.rpc.shell.envGet(state.envKey)
			state.envVal = res.value || 'not set'
		} catch (e) {
			state.envVal = 'Error: ' + e.message
		}
	})
	component.delegate('click', '#btn-env-set', async () => {
		if (!state.envKey || !state.envVal) return
		try {
			await window.rpc.shell.envSet(state.envKey, state.envVal)
			await loadEnv()
		} catch (e) {
			alert('Error: ' + e.message)
		}
	})
}

export function render() {
	const list = filteredEnv.value
	const { envKey, envVal } = state
	const envRows = list.slice(0, 50).map(e => {
		const parts = e.split('=')
		const k = parts[0] || ''
		const v = parts.slice(1).join('=') || ''
		return `<div style="display:grid;grid-template-columns:100px 1fr;gap:6px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.02)">
			<span style="color:#818cf8;font-family:monospace">${escapeHtml(k)}</span>
			<span style="color:#cbd5e1;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(v)}</span>
		</div>`
	}).join('')

	return html`
		<!-- Environment Variables -->
		<div class="card">
			<div class="hdr">
				<span>Environment Variables</span>
				<button id="btn-env-refresh" class="btn-icon" title="Refresh">↻</button>
			</div>
			<div class="bd">
				<input id="env-search" placeholder="Filter…" style="width:100%;margin-bottom:8px" value="${state.searchQuery}" />
				${state.loading ? '<div style="color:#64748b">Loading…</div>' : `
					<div style="max-height:120px;overflow:auto;font-size:0.75rem;margin-bottom:12px">${envRows || '<span style="color:#64748b">(none)</span>'}</div>
				`}
			</div>
		</div>

		<!-- Env Editor -->
		<div class="card">
			<div class="hdr">Set Environment Variable</div>
			<div class="bd">
				<label>Key</label>
				<input id="env-key-input" placeholder="HOME" value="${envKey}" />
				<label>Value</label>
				<input id="env-val-input" placeholder="/home/user" value="${envVal}" />
				<div style="display:flex;gap:6px;margin-top:6px">
					<button id="btn-env-set">Set</button>
				</div>
			</div>
		</div>`
}

function escapeHtml(s) {
	return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}