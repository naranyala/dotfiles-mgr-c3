import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	cmdInput: 'ls -la',
	cmdOutput: '',
	cmdCwd: '',
	loading: false,
})

export async function init() {
	try {
		const res = await window.rpc.shell.cwd()
		state.cmdCwd = res.path || ''
	} catch (e) {
		state.cmdCwd = 'unknown'
	}
}

export function onMount(component) {
	component.delegate('click', '#btn-run-cmd', async () => {
		state.loading = true
		state.cmdOutput = ''
		try {
			const res = await window.rpc.shell.exec(state.cmdInput)
			state.cmdOutput = res.output || res.error || ''
		} catch (e) {
			state.cmdOutput = 'Error: ' + e.message
		}
		state.loading = false
	})
	component.delegate('input', '#cmd-input', (e) => { state.cmdInput = e.target.value })
	component.delegate('click', '#btn-cwd', async () => {
		try {
			const res = await window.rpc.shell.cwd()
			state.cmdCwd = res.path || ''
		} catch (e) {
			state.cmdCwd = 'error'
		}
	})
}

export function render() {
	const { cmdInput, cmdOutput, cmdCwd, loading } = state

	return html`
		<div class="card">
			<div class="hdr">Workspace CLI</div>
			<div class="bd">
				<label>Working Directory</label>
				<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
					<input id="cmd-cwd" value="${cmdCwd}" readonly style="flex:1;background:rgba(255,255,255,0.03)" />
					<button id="btn-cwd">⟳</button>
				</div>

				<label>Command</label>
				<input id="cmd-input" value="${cmdInput}" placeholder="ls -la" />
				<button id="btn-run-cmd" style="margin-top:6px" ${loading ? 'disabled' : ''}>${loading ? 'Running…' : '▶ Run'}</button>

				${cmdOutput ? `
					<label style="margin-top:12px">Output</label>
					<pre class="mono" style="background:rgba(0,0,0,0.3);border-radius:4px;padding:8px;max-height:150px;overflow:auto;font-size:0.75rem;white-space:pre-wrap">${escapeHtml(cmdOutput)}</pre>
				` : ''}
			</div>
		</div>`
}

function escapeHtml(s) {
	return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}