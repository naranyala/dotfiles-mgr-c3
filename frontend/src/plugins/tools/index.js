import { reactive } from '../../core/signals.js'

export const state = reactive({
	envKey: 'HOME',
	envVal: '',
	clipText: '',
	execCmd: 'uname -a',
	execResult: '',
	whichCmd: '',
	whichFound: false,
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '#btn-env', async () => {
		const res = await window.rpc.envGet(state.envKey)
		if (res.error) state.envVal = 'not set'
		else state.envVal = res.value
	})
	component.delegate('input', '#env-key', (e) => (state.envKey = e.target.value))

	component.delegate('click', '#btn-clip-get', async () => {
		const res = await window.rpc.clipboardGet()
		if (res.error) alert('Clipboard Error: ' + res.error)
		else state.clipText = res.text
	})
	component.delegate('click', '#btn-clip-set', async () => {
		const res = await window.rpc.clipboardSet(state.clipText)
		if (res.error) alert('Clipboard Error: ' + res.error)
		else alert('Copied!')
	})
	component.delegate('input', '#clip-text', (e) => (state.clipText = e.target.value))

	component.delegate('click', '#btn-exec', async () => {
		const res = await window.rpc.exec(state.execCmd)
		if (res.error) state.execResult = 'Error: ' + res.error
		else state.execResult = res.output || '(no output)'
	})
	component.delegate('input', '#exec-cmd', (e) => (state.execCmd = e.target.value))

	component.delegate('click', '#btn-which', async () => {
		const r1 = await window.rpc.which(state.whichCmd)
		state.whichFound = r1.found
	})
	component.delegate('input', '#which-cmd', (e) => (state.whichCmd = e.target.value))
}

export function render() {
	const { envKey, envVal, clipText, execCmd, execResult, whichCmd, whichFound } = state

	return `
    <!-- Env -->
    <div class="card">
      <div class="hdr">Environment</div>
      <div class="bd">
        <label>Key</label>
        <input id="env-key" value="${envKey}" />
        <button id="btn-env">Get</button>
        ${envVal ? `<div class="mono" style="margin-top:6px">${envVal}</div>` : ''}
      </div>
    </div>

    <!-- Clipboard -->
    <div class="card">
      <div class="hdr">Clipboard</div>
      <div class="bd">
        <textarea id="clip-text">${clipText}</textarea>
        <div><button id="btn-clip-get">Paste</button><button id="btn-clip-set">Copy</button></div>
      </div>
    </div>

    <!-- Exec -->
    <div class="card">
      <div class="hdr">Execute</div>
      <div class="bd">
        <label>Command</label>
        <input id="exec-cmd" value="${execCmd}" />
        <button id="btn-exec">Run</button>
        ${execResult ? `<div class="mono" style="margin-top:6px">${execResult}</div>` : ''}
      </div>
    </div>

    <!-- Which -->
    <div class="card">
      <div class="hdr">which</div>
      <div class="bd">
        <label>Program</label>
        <input id="which-cmd" value="${whichCmd}" />
        <button id="btn-which">Check</button>
        ${whichCmd ? `<div style="margin-top:6px">${whichFound ? '<span class="ok">found</span>' : '<span class="err">not found</span>'}</div>` : ''}
      </div>
    </div>`
}
