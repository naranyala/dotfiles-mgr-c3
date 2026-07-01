import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	backendState: null,
	logs: [],
	loading: false,
})

export async function init() {
	await refresh()
}

async function refresh() {
	state.loading = true
	try {
		state.backendState = await window.rpc.state.get()
	} catch (e) {
		state.backendState = { error: e.message }
	}
	state.loading = false
}

export function onMount(component) {
	component.delegate('click', '#btn-backend-refresh', () => refresh())
}

export function render() {
	const { backendState, loading } = state

	if (!backendState) return `<div class="card"><div class="bd">Loading…</div></div>`

	return html`
		<div class="card">
			<div class="hdr">
				<span>Backend State</span>
				<button id="btn-backend-refresh" class="btn-icon" title="Refresh">↻</button>
			</div>
			<div class="bd">
				${backendState.error ? `<span class="err">${backendState.error}</span>` : `
					<div class="mono" style="font-size:0.8rem">
						<span style="color:#818cf8">Error Count:</span> ${backendState?.errors?.length || 0}<br>
						<span style="color:#818cf8">RPC Methods:</span> ${backendState?.registry?.method_count || 0}
					</div>
					${backendState?.errors?.length ? `
						<div style="margin-top:8px">
							<label style="font-size:0.8rem">Recent Errors</label>
							${backendState.errors.slice(0, 5).map(e => `
								<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.02);font-size:0.75rem">
									<span class="err">[${e.code}]</span> ${e.message || '—'}
								</div>
							`).join('')}
						</div>
					` : ''}
				`}
			</div>
		</div>`
}