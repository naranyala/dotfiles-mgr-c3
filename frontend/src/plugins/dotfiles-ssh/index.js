import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	sshConfigContent: '',
	knownHostsContent: '',
	keys: [],
	newKeyName: '',
	newKeyComment: '',
	loading: false,
	error: null,
	saved: false
})

export async function init() {
	// Load SSH config and keys
	await loadSSHConfig()
	await loadKnownHosts()
	await loadKeys()
}

async function loadSSHConfig() {
	const home = await window.rpc.shell.execRead('echo $HOME')
	const filePath = home?.output?.trim() ? `${home.output.trim()}/.ssh/config` : '~/.ssh/config'
	
	try {
		const result = await window.rpc.shell.execRead(`cat ${filePath} 2>/dev/null || echo ""`)
		if (result && result.output) {
			state.sshConfigContent = result.output
		}
	} catch (e) {
		console.log('Could not load SSH config:', e.message)
	}
}

async function loadKnownHosts() {
	const home = await window.rpc.shell.execRead('echo $HOME')
	const filePath = home?.output?.trim() ? `${home.output.trim()}/.ssh/known_hosts` : '~/.ssh/known_hosts'
	
	try {
		const result = await window.rpc.shell.execRead(`cat ${filePath} 2>/dev/null || echo ""`)
		if (result && result.output) {
			state.knownHostsContent = result.output
		}
	} catch (e) {
		console.log('Could not load known_hosts:', e.message)
	}
}

async function loadKeys() {
	const home = await window.rpc.shell.execRead('echo $HOME')
	const sshDir = home?.output?.trim() ? `${home.output.trim()}/.ssh` : '~/.ssh'
	
	try {
		const result = await window.rpc.shell.execRead(`ls ${sshDir}/*.pub 2>/dev/null || echo ""`)
		if (result && result.output) {
			const keys = []
			result.output.trim().split('\n').forEach(line => {
				const file = line.trim()
				if (file && !file.endsWith('.pub')) {
					keys.push(file.replace(sshDir + '/', ''))
				}
			})
			state.keys = keys
		}
	} catch (e) {
		console.log('Could not load SSH keys:', e.message)
	}
}

export function onMount(component) {
	component.delegate('click', '#btn-save-sshconfig', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const filePath = home?.output?.trim() ? `${home.output.trim()}/.ssh/config` : '~/.ssh/config'
			await window.rpc.shell.writeFile(filePath, state.sshConfigContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-generate-key', async () => {
		if (!state.newKeyName) return
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const comment = state.newKeyComment || `dotfiles-mgr-${state.newKeyName}`
			const result = await window.rpc.shell.execRead(`ssh-keygen -t ed25519 -f ${home.output.trim()}/.ssh/${state.newKeyName} -C "${comment}" -N ""`)
			state.newKeyName = ''
			state.newKeyComment = ''
			await loadKeys()
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('input', '#sshconfig-content', (e) => { state.sshConfigContent = e.target.value })
	component.delegate('input', '#new-key-name', (e) => { state.newKeyName = e.target.value })
	component.delegate('input', '#new-key-comment', (e) => { state.newKeyComment = e.target.value })
}

export function render() {
	const { sshConfigContent, knownHostsContent, keys, newKeyName, newKeyComment, loading, error, saved } = state

	return html`
		<div class="card">
			<div class="hdr">SSH Configuration Manager</div>
			<div class="bd">
				<p style="margin-bottom:12px">Edit SSH config, manage known hosts, and configure authentication keys.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				${saved ? `<div style="color:#22c55e;margin-bottom:12px">✓ Configuration saved!</div>` : ''}
				
				<div>
					<label style="display:block;margin-bottom:4px;font-weight:600">~/.ssh/config</label>
					<textarea id="sshconfig-content" style="width:100%;min-height:150px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder="# SSH configuration">${sshConfigContent}</textarea>
					<button id="btn-save-sshconfig" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save SSH Config'}</button>
				</div>
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">SSH Key Management</div>
			<div class="bd">
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<input id="new-key-name" value="${newKeyName}" placeholder="Key name (id_ed25519_xxx)" style="flex:1" />
					<input id="new-key-comment" value="${newKeyComment}" placeholder="Comment (email@host)" style="flex:1" />
					<button id="btn-generate-key" ${loading ? 'disabled' : ''} style="padding:6px 12px">${loading ? 'Generating...' : 'Generate Key'}</button>
				</div>
				
				${keys.length > 0 ? `
					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
						${keys.map(key => html`
							<div class="card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);padding:12px">
								<div style="font-size:0.8rem;color:#e2e8f0">${key}</div>
								<div style="font-size:0.75rem;color:#64748b;margin-top:6px">${key.replace(/^(id_)?(rsa|ed25519|ecdsa)_?/, '')}</div>
							</div>
						`).join('')}
					</div>
				` : `
					<div style="color:#64748b;text-align:center;padding:20px">No SSH keys found in ~/.ssh/</div>
				`}
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Known Hosts</div>
			<div class="bd">
				<p style="color:#64748b;margin-bottom:12px">SSH known hosts file contains fingerprints of servers you've connected to.</p>
				<textarea style="width:100%;min-height:80px;font-family:monospace;font-size:0.75rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px;resize:none" placeholder="# Known hosts" readonly>${knownHostsContent || 'No known hosts yet'}</textarea>
			</div>
		</div>
	`
}
