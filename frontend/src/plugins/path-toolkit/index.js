import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'
import { uiCard } from '../../shared/index.js'

export const state = reactive({
	pathInput: '/tmp',
	pathResult: '',
	joinedParts: ['', '', ''],
	joinedResult: '',
})

export function render() {
	const { pathInput, pathResult, joinedParts, joinedResult } = state

	return html`
		<!-- Path Join Builder -->
		<div class="card">
			<div class="hdr">Path Join Builder</div>
			<div class="bd">
				<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
					<input placeholder="part1" style="flex:1;min-width:80px" value="${joinedParts[0]}" data-part="0" />
					<input placeholder="part2" style="flex:1;min-width:80px" value="${joinedParts[1]}" data-part="1" />
					<input placeholder="part3" style="flex:1;min-width:80px" value="${joinedParts[2]}" data-part="2" />
				</div>
				<button id="btn-path-join" style="margin-bottom:8px">Join Path</button>
				${joinedResult ? `<div class="mono" style="margin-top:6px;padding:8px;background:rgba(148,163,173,0.1);border-radius:4px">${joinedResult}</div>` : ''}
			</div>
		</div>

		<!-- Path Operations -->
		<div class="card">
			<div class="hdr">Path Operations</div>
			<div class="bd">
				<label>Path</label>
				<input id="path-input" value="${pathInput}" placeholder="/path/to/file.txt" />
				<div style="display:flex;gap:6px;margin-top:6px">
					<button id="btn-path-dirname">Dirname</button>
					<button id="btn-path-basename">Basename</button>
				</div>
				${pathResult ? `<div class="mono" style="margin-top:6px;padding:8px;background:rgba(148,163,173,0.1);border-radius:4px">${pathResult}</div>` : ''}
			</div>
		</div>

		<!-- Expand Env -->
		<div class="card">
			<div class="hdr">Environment Expand</div>
			<div class="bd">
				<input id="path-expand-input" placeholder="$HOME/.config" value="${pathInput}" />
				<button id="btn-path-expand" style="margin-top:6px">Expand</button>
				<div id="path-expand-result" style="margin-top:6px"></div>
			</div>
		</div>`
}

export function onMount(component) {
	component.delegate('click', '#btn-path-join', async () => {
		const parts = []
		const inputs = component.shadowRoot.querySelectorAll('[data-part]')
		inputs.forEach(i => { if (i.value) parts.push(i.value) })
		if (parts.length === 0) return
		try {
			const res = await window.rpc.shell.pathJoin(...parts)
			state.joinedResult = res.path || ''
		} catch (e) {
			state.joinedResult = 'Error: ' + e.message
		}
	})
	component.delegate('click', '#btn-path-dirname', async () => {
		try {
			const res = await window.rpc.shell.pathDirname(state.pathInput)
			state.pathResult = res.path || ''
		} catch (e) {
			state.pathResult = 'Error: ' + e.message
		}
	})
	component.delegate('click', '#btn-path-basename', async () => {
		try {
			const res = await window.rpc.shell.pathBasename(state.pathInput)
			state.pathResult = res.name || ''
		} catch (e) {
			state.pathResult = 'Error: ' + e.message
		}
	})
	component.delegate('input', '#path-input', (e) => { state.pathInput = e.target.value })
	component.delegate('click', '#btn-path-expand', async () => {
		const tpl = component.shadowRoot.querySelector('#path-expand-input')?.value || ''
		try {
			const res = await window.rpc.shell.expandEnv(tpl)
			const resultEl = component.shadowRoot.querySelector('#path-expand-result')
			if (resultEl) resultEl.innerHTML = `<div class="mono" style="padding:8px;background:rgba(148,163,173,0.1);border-radius:4px">${res.value}</div>`
		} catch (e) {
			const resultEl = component.shadowRoot.querySelector('#path-expand-result')
			if (resultEl) resultEl.innerHTML = `<span class="err">Error: ${e.message}</span>`
		}
	})
	component.delegate('input', '[data-part]', (e) => {
		const idx = parseInt(e.target.dataset.part)
		state.joinedParts[idx] = e.target.value
	})
}