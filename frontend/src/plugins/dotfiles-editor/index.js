import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	activeEditor: 'vscode',
	vscodeSettings: '',
	vscodeKeybindings: '',
	sublimeSettings: '',
	loading: false,
	error: null,
	saved: false
})

export async function init() {
	// Load editor configs if they exist
	await loadConfigs()
}

async function loadConfigs() {
	const home = await window.rpc.shell.execRead('echo $HOME')
	
	// Try to load VS Code settings
	const vscodeDirs = [
		`${home?.output?.trim() || '~'}/.config/Code/User`,
		`${home?.output?.trim() || '~'}/.vscode`,
		`${home?.output?.trim() || '~'}/AppData/Roaming/Code/User`
	]
	
	for (const dir of vscodeDirs) {
		try {
			const result = await window.rpc.shell.execRead(`cat ${dir}/settings.json 2>/dev/null || echo ""`)
			if (result && result.output) {
				state.vscodeSettings = result.output
				break
			}
		} catch (e) {}
	}
	
	// Try to load VS Code keybindings
	for (const dir of vscodeDirs) {
		try {
			const result = await window.rpc.shell.execRead(`cat ${dir}/keybindings.json 2>/dev/null || echo ""`)
			if (result && result.output) {
				state.vscodeKeybindings = result.output
				break
			}
		} catch (e) {}
	}
	
	// Try to load Sublime settings
	try {
		const result = await window.rpc.shell.execRead(`cat ${home?.output?.trim() || '~'}/.config/sublime-text/Packages/User/Preferences.sublime-settings 2>/dev/null || echo ""`)
		if (result && result.output) {
			state.sublimeSettings = result.output
		}
	} catch (e) {}
}

export function onMount(component) {
	component.delegate('click', '[data-editor]', (e) => {
		const editor = e.target.closest('[data-editor]').dataset.editor
		state.activeEditor = editor
	})

	component.delegate('click', '#btn-save-vscode-settings', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const dir = `${home?.output?.trim() || '~'}/.config/Code/User`
			await window.rpc.shell.writeFile(`${dir}/settings.json`, state.vscodeSettings)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-save-vscode-keybindings', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const dir = `${home?.output?.trim() || '~'}/.config/Code/User`
			await window.rpc.shell.writeFile(`${dir}/keybindings.json`, state.vscodeKeybindings)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-save-sublime', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const dir = `${home?.output?.trim() || '~'}/.config/sublime-text/Packages/User`
			await window.rpc.shell.writeFile(`${dir}/Preferences.sublime-settings`, state.sublimeSettings)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('input', '#vscode-settings', (e) => { state.vscodeSettings = e.target.value })
	component.delegate('input', '#vscode-keybindings', (e) => { state.vscodeKeybindings = e.target.value })
	component.delegate('input', '#sublime-settings', (e) => { state.sublimeSettings = e.target.value })
}

export function render() {
	const { activeEditor, vscodeSettings, vscodeKeybindings, sublimeSettings, loading, error, saved } = state

	return html`
		<div class="card">
			<div class="hdr">Editor Configuration Manager</div>
			<div class="bd">
				<p style="margin-bottom:12px">Configure settings, keybindings, and extensions for your favorite editors.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				${saved ? `<div style="color:#22c55e;margin-bottom:12px">✓ Configuration saved!</div>` : ''}
				
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<button class="${activeEditor === 'vscode' ? 'active' : ''}" data-editor="vscode" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">VS Code</button>
					<button class="${activeEditor === 'sublime' ? 'active' : ''}" data-editor="sublime" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">Sublime Text</button>
				</div>
				
				${activeEditor === 'vscode' ? `
					<div>
						<div style="margin-bottom:12px">
							<label style="display:block;margin-bottom:4px;font-weight:600">settings.json</label>
							<textarea id="vscode-settings" style="width:100%;min-height:150px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder='{"editor.fontSize": 14}'>${vscodeSettings}</textarea>
							<button id="btn-save-vscode-settings" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save settings.json'}</button>
						</div>
						<div>
							<label style="display:block;margin-bottom:4px;font-weight:600">keybindings.json</label>
							<textarea id="vscode-keybindings" style="width:100%;min-height:100px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder='[{"key": "ctrl+k", "command": "..."}]'>${vscodeKeybindings}</textarea>
							<button id="btn-save-vscode-keybindings" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save keybindings.json'}</button>
						</div>
					</div>
				` : ''}
				
				${activeEditor === 'sublime' ? `
					<div>
						<label style="display:block;margin-bottom:4px;font-weight:600">Preferences.sublime-settings</label>
						<textarea id="sublime-settings" style="width:100%;min-height:200px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder='{"font_size": 14}'>${sublimeSettings}</textarea>
						<button id="btn-save-sublime" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save Preferences'}</button>
					</div>
				` : ''}
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Quick Actions</div>
			<div class="bd">
				<p style="color:#64748b;margin-bottom:12px">Common editor configuration tasks</p>
				<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">📋 Import Settings</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">📤 Export Settings</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">🔄 Sync All</button>
				</div>
			</div>
		</div>
	`
}
