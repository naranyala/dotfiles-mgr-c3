import { batch } from '../../core/signals.js'
import { createStore } from '../../core/store.js'
import { html } from '../../core/template.js'

const _store = createStore({
	path: '',
	exists: null,
	isDir: null,
	stat: null,
	error: null,
	busy: false,
}, {
	setPath: (s, p) => { s.path = p; s.error = null },
	check: (s) => async () => {
		if (!s.path) return
		s.busy = true; s.error = null
		try {
			const [exists, isDir, stat] = await Promise.all([
				window.rpc.exists(s.path),
				window.rpc.isDir(s.path),
				window.rpc.stat(s.path),
			])
			batch(() => { s.exists = exists; s.isDir = isDir; s.stat = stat })
		} catch (e) { s.error = e.message }
		s.busy = false
	},
	mkdir: (s) => async () => {
		if (!s.path) return
		s.busy = true; s.error = null
		try { await window.rpc.mkdir(s.path); await s.actions.check() }
		catch (e) { s.error = e.message }
		s.busy = false
	},
	remove: (s) => async () => {
		if (!s.path || !confirm(`Remove ${s.path}?`)) return
		s.busy = true; s.error = null
		try { await window.rpc.remove(s.path); batch(() => { s.exists = false; s.stat = null }) }
		catch (e) { s.error = e.message }
		s.busy = false
	},
})

export const state = _store.state
const { actions } = _store

export async function init() {}
export function onMount(component) {
	component.delegate('input', '#ft-path', (e) => actions.setPath(e.target.value))
	component.delegate('click', '#ft-check', () => actions.check())
	component.delegate('click', '#ft-mkdir', () => actions.mkdir())
	component.delegate('click', '#ft-remove', () => actions.remove())
}

export function render() {
	return html`
		<div class="card">
			<div class="hdr">File Tools</div>
			<div class="bd">
				<label style="font-size:0.8rem">Path</label>
				<div style="display:flex;gap:8px">
					<input id="ft-path" placeholder="/tmp/example" value="${state.path}" style="flex:1;margin:0" />
				</div>
				<div style="display:flex;gap:6px;margin-top:8px">
					<button id="ft-check" class="btn-icon" style="font-size:0.8rem" ${state.busy ? 'disabled' : ''}>Check</button>
					<button id="ft-mkdir" class="btn-icon" style="font-size:0.8rem" ${state.busy ? 'disabled' : ''}>Mkdir</button>
					<button id="ft-remove" class="btn-icon" style="font-size:0.8rem;color:#f87171" ${state.busy ? 'disabled' : ''}>Remove</button>
				</div>
				${state.error ? `<div class="err" style="margin-top:8px">${state.error}</div>` : ''}
				${state.exists !== null ? `
					<div class="mono" style="margin-top:12px;font-size:0.8rem">
						Exists: <span style="color:${state.exists ? '#34d399' : '#f87171'}">${state.exists}</span>
						${state.isDir !== null ? `<br>Is Dir: <span style="color:#94a3b8">${state.isDir}</span>` : ''}
						${state.stat ? `<br>Size: ${state.stat.size || '—'}<br>Mode: ${state.stat.mode || '—'}` : ''}
					</div>
				` : ''}
			</div>
		</div>
	`
}
