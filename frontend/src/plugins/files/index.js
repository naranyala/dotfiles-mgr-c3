import { reactive } from '../../core/signals.js'

export const state = reactive({
	listDirPath: '/',
	dirEntries: [],
	fileContent: '',
	filePath: '/tmp/test.txt',
	statInfo: null,
	statPath: '/',
	globPat: '**/*.json',
	globResults: [],
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '#btn-ls', async () => {
		const res = await window.rpc.shell.listDir(state.listDirPath)
		if (res.error) alert('List Error: ' + res.error)
		else state.dirEntries = res.entries || []
	})
	component.delegate('input', '#ls-path', (e) => (state.listDirPath = e.target.value))

	component.delegate('click', '#btn-read', async () => {
		const res = await window.rpc.shell.readFile(state.filePath)
		if (res.error) alert('Read Error: ' + res.error)
		else state.fileContent = res.content || ''
	})
	component.delegate('click', '#btn-write', async () => {
		const res = await window.rpc.shell.writeFile(state.filePath, state.fileContent)
		if (res.error) alert('Write Error: ' + res.error)
		else alert('Wrote to ' + state.filePath)
	})
	component.delegate('input', '#file-path', (e) => (state.filePath = e.target.value))
	component.delegate('input', '#file-content', (e) => (state.fileContent = e.target.value))

	component.delegate('click', '#btn-stat', async () => {
		const res = await window.rpc.shell.stat(state.statPath)
		if (res.error) alert('Stat Error: ' + res.error)
		else state.statInfo = res
	})
	component.delegate('input', '#stat-path', (e) => (state.statPath = e.target.value))

	component.delegate('click', '#btn-glob', async () => {
		const res = await window.rpc.shell.glob(state.globPat)
		if (res.error) alert('Glob Error: ' + res.error)
		else state.globResults = res.matches || []
	})
	component.delegate('input', '#glob-pat', (e) => (state.globPat = e.target.value))
}

export function render() {
	const { listDirPath, dirEntries, filePath, fileContent,
		statInfo, statPath, globResults, globPat } = state

	return `
    <!-- Glob -->
    <div class="card">
      <div class="hdr">Glob</div>
      <div class="bd">
        <label>Pattern</label>
        <input id="glob-pat" value="${globPat}" />
        <button id="btn-glob">Search</button>
        <div style="margin-top:6px">${globResults.length ? globResults.map(e => `<span class="badge">${e}</span>`).join(' ') : '<span style="color:#94a3b8">(no matches)</span>'}</div>
      </div>
    </div>

    <!-- Stat -->
    <div class="card">
      <div class="hdr">Stat</div>
      <div class="bd">
        <label>Path</label>
        <input id="stat-path" value="${statPath}" />
        <button id="btn-stat">Stat</button>
        ${statInfo ? `<div class="mono" style="margin-top:6px">size: ${statInfo.size}<br>dir: ${statInfo.isDir}<br>link: ${statInfo.isLink}<br>mode: ${statInfo.mode}</div>` : ''}
      </div>
    </div>

    <!-- File Browser (full width) -->
    <div class="card">
      <div class="hdr">File Browser</div>
      <div class="bd">
        <label>Path</label>
        <input id="ls-path" value="${listDirPath}" />
        <button id="btn-ls">List</button>
        <div style="margin-top:6px">${dirEntries.length ? dirEntries.map(e => `<span class="badge">${e}</span>`).join(' ') : '<span style="color:#94a3b8">(empty)</span>'}</div>
      </div>
    </div>

    <!-- File Editor (full width) -->
    <div class="card">
      <div class="hdr">File Editor</div>
      <div class="bd">
        <label>File Path</label>
        <input id="file-path" value="${filePath}" />
        <label>Content</label>
        <textarea id="file-content">${fileContent}</textarea>
        <div><button id="btn-read">Read</button><button id="btn-write">Write</button></div>
      </div>
    </div>`
}
