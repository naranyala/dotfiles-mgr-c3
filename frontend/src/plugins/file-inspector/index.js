import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	statPath: '/tmp',
	statInfo: null,
	existsPath: '/tmp',
	existsResult: null,
	isDirPath: '/tmp',
	isDirResult: null,
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '#btn-stat', async () => {
		try {
			state.statInfo = await window.rpc.shell.stat(state.statPath)
		} catch (e) {
			state.statInfo = { error: e.message }
		}
	})
	component.delegate('click', '#btn-exists', async () => {
		try {
			state.existsResult = await window.rpc.shell.exists(state.existsPath)
		} catch (e) {
			state.existsResult = { error: e.message }
		}
	})
	component.delegate('click', '#btn-isdir', async () => {
		try {
			state.isDirResult = await window.rpc.shell.isDir(state.isDirPath)
		} catch (e) {
			state.isDirResult = { error: e.message }
		}
	})
	component.delegate('input', '#stat-path', (e) => { state.statPath = e.target.value })
	component.delegate('input', '#exists-path', (e) => { state.existsPath = e.target.value })
	component.delegate('input', '#isdir-path', (e) => { state.isDirPath = e.target.value })
}

function statResult(info) {
	if (!info) return ''
	if (info.error) return `<span class="err">${info.error}</span>`
	return `
		<div class="mono" style="font-size:0.8rem">
			<span style="color:#818cf8">size:</span> ${info.size}<br>
			<span style="color:#818cf8">isDir:</span> ${info.isDir ? 'yes' : 'no'}<br>
			<span style="color:#818cf8">isFile:</span> ${info.isFile ? 'yes' : 'no'}<br>
			<span style="color:#818cf8">mode:</span> ${info.mode ? '0' + info.mode.toString(8) : '—'}
		</div>`
}

function existsResult(info) {
	if (!info) return ''
	if (info.error) return `<span class="err">${info.error}</span>`
	return `<span class="${info.exists ? 'ok' : 'err'}">${info.exists ? '✓ exists' : '✗ not found'}</span>`
}

function isDirResult(info) {
	if (!info) return ''
	if (info.error) return `<span class="err">${info.error}</span>`
	return `<span class="${info.isDir ? 'ok' : 'err'}">${info.isDir ? '✓ is directory' : '✗ not a directory'}</span>`
}

export function render() {
	const { statPath, statInfo, existsPath: ep, existsResult: er, isDirPath, isDirResult: idr } = state

	return html`
		<div class="card">
			<div class="hdr">File Stat</div>
			<div class="bd">
				<input id="stat-path" value="${statPath}" placeholder="/path/to/file" />
				<button id="btn-stat" style="margin-top:6px">Get Stats</button>
				${statInfo ? `<div style="margin-top:8px">${statResult(statInfo)}</div>` : ''}
			</div>
		</div>

		<div class="card" style="margin-top:12px">
			<div class="hdr">Path Exists Check</div>
			<div class="bd">
				<input id="exists-path" value="${ep}" placeholder="/path/to/check" />
				<button id="btn-exists" style="margin-top:6px">Check</button>
				${er ? `<div style="margin-top:8px">${existsResult(er)}</div>` : ''}
			</div>
		</div>

		<div class="card" style="margin-top:12px">
			<div class="hdr">Is Directory</div>
			<div class="bd">
				<input id="isdir-path" value="${isDirPath}" placeholder="/path/to/check" />
				<button id="btn-isdir" style="margin-top:6px">Check</button>
				${idr ? `<div style="margin-top:8px">${isDirResult(idr)}</div>` : ''}
			</div>
		</div>`
}