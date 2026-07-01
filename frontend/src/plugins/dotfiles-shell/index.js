import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	activeShell: 'bash',
	bashContent: '',
	zshContent: '',
	fishContent: '',
	loading: false,
	error: null,
	saved: false
})

export async function init() {
	// Try to detect active shell and load configs
	try {
		const shell = await window.rpc.shell.execRead('echo $SHELL')
		if (shell && shell.output) {
			state.activeShell = shell.output.trim().includes('zsh') ? 'zsh' 
				: shell.output.trim().includes('fish') ? 'fish' 
				: 'bash'
		}
	} catch (e) {
		console.log('Could not detect shell:', e.message)
	}

	// Try to load existing configs
	await loadConfig('bash')
	await loadConfig('zsh')
	await loadConfig('fish')
}

async function loadConfig(shell) {
	const files = {
		bash: '.bashrc',
		zsh: '.zshrc',
		fish: 'config.fish'
	}
	const home = await window.rpc.shell.execRead('echo $HOME')
	const filePath = home?.output?.trim() ? `${home.output.trim()}/${files[shell]}` : `~/${files[shell]}`
	
	try {
		const result = await window.rpc.shell.execRead(`cat ${filePath} 2>/dev/null || echo ""`)
		if (result && result.output) {
			state[`${shell}Content`] = result.output
		}
	} catch (e) {
		// File doesn't exist, leave empty
	}
}

export function onMount(component) {
	component.delegate('click', '#btn-save-bash', async () => {
		state.loading = true
		try {
			await saveConfig('bash', state.bashContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-save-zsh', async () => {
		state.loading = true
		try {
			await saveConfig('zsh', state.zshContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-save-fish', async () => {
		state.loading = true
		try {
			await saveConfig('fish', state.fishContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('input', '#bash-config', (e) => { state.bashContent = e.target.value })
	component.delegate('input', '#zsh-config', (e) => { state.zshContent = e.target.value })
	component.delegate('input', '#fish-config', (e) => { state.fishContent = e.target.value })
}

async function saveConfig(shell, content) {
	const files = {
		bash: '.bashrc',
		zsh: '.zshrc',
		fish: 'config.fish'
	}
	const home = await window.rpc.shell.execRead('echo $HOME')
	const filePath = home?.output?.trim() ? `${home.output.trim()}/${files[shell]}` : `~/${files[shell]}`
	
	await window.rpc.shell.writeFile(filePath, content)
}

export function render() {
	const { activeShell, bashContent, zshContent, fishContent, loading, error, saved } = state

	return html`
		<div class="card">
			<div class="hdr">Shell Configuration Manager</div>
			<div class="bd">
				<p style="margin-bottom:12px">Edit and synchronize shell configuration files across different shells.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				${saved ? `<div style="color:#22c55e;margin-bottom:12px">✓ Configuration saved!</div>` : ''}
				
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<button class="${activeShell === 'bash' ? 'active' : ''}" data-shell="bash" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">Bash</button>
					<button class="${activeShell === 'zsh' ? 'active' : ''}" data-shell="zsh" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">Zsh</button>
					<button class="${activeShell === 'fish' ? 'active' : ''}" data-shell="fish" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">Fish</button>
				</div>
				
				${activeShell === 'bash' ? `
					<div>
						<label style="display:block;margin-bottom:4px;font-weight:600">.bashrc</label>
						<textarea id="bash-config" style="width:100%;min-height:200px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder="# Bash configuration">${bashContent}</textarea>
						<button id="btn-save-bash" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save .bashrc'}</button>
					</div>
				` : ''}
				
				${activeShell === 'zsh' ? `
					<div>
						<label style="display:block;margin-bottom:4px;font-weight:600">.zshrc</label>
						<textarea id="zsh-config" style="width:100%;min-height:200px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder="# Zsh configuration">${zshContent}</textarea>
						<button id="btn-save-zsh" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save .zshrc'}</button>
					</div>
				` : ''}
				
				${activeShell === 'fish' ? `
					<div>
						<label style="display:block;margin-bottom:4px;font-weight:600">config.fish</label>
						<textarea id="fish-config" style="width:100%;min-height:200px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder="# Fish configuration">${fishContent}</textarea>
						<button id="btn-save-fish" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save config.fish'}</button>
					</div>
				` : ''}
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Quick Actions</div>
			<div class="bd">
				<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">➕ Add Alias</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">🔍 Find Aliases</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">📋 Export Config</button>
				</div>
			</div>
		</div>
	`
}
