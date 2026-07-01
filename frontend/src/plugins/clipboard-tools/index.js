import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	clipText: '',
	clipHistory: [],
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '#btn-clip-get', async () => {
		try {
			const res = await window.rpc.shell.clipboardGet()
			state.clipText = res.text || ''
			state.clipHistory = [{ text: res.text, time: Date.now() }, ...state.clipHistory.slice(0, 9)]
		} catch (e) {
			state.clipText = 'Error: ' + e.message
		}
	})
	component.delegate('click', '#btn-clip-set', async () => {
		try {
			await window.rpc.shell.clipboardSet(state.clipText)
		} catch (e) {
			alert('Error: ' + e.message)
		}
	})
	component.delegate('input', '#clip-text', (e) => { state.clipText = e.target.value })
}

export function render() {
	const { clipText } = state

	return html`
		<div class="card">
			<div class="hdr">Clipboard Tools</div>
			<div class="bd">
				<textarea id="clip-text" placeholder="Paste or type text to copy..." style="width:100%;height:80px;resize:vertical">${clipText}</textarea>
				<div style="display:flex;gap:6px;margin-top:8px">
					<button id="btn-clip-get">📋 Paste from System</button>
					<button id="btn-clip-set">📋 Copy to System</button>
				</div>
			</div>
		</div>

		<div class="card" style="margin-top:12px">
			<div class="hdr">Recent Clipboard</div>
			<div class="bd">
				${state.clipHistory.length ? state.clipHistory.map((h, i) => `
					<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.75rem">
						<span style="color:#64748b">${h.time ? new Date(h.time).toLocaleTimeString() : ''}</span>
						<span class="mono" style="color:#cbd5e1;display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.text}</span>
					</div>
				`).join('') : '<span style="color:#64748b">No clipboard history yet</span>'}
			</div>
		</div>`
}