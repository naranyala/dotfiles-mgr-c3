import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	repoUrl: '',
	repoPath: '',
	status: '',
	files: [],
	loading: false,
	error: null,
	syncing: false
})

export async function init() {
	// Try to detect existing dotfiles repo
	await detectRepo()
}

async function detectRepo() {
	try {
		// Check for common dotfiles repo locations
		const paths = [
			'~/.dotfiles',
			'~/dotfiles',
			'~/code/dotfiles',
			'~/projects/dotfiles'
		]
		
		for (const path of paths) {
			const expanded = path.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			const result = await window.rpc.shell.execRead(`test -d ${expanded} && echo "${path}" || echo ""`)
			if (result && result.output && result.output.trim()) {
				state.repoPath = result.output.trim()
				break
			}
		}
		
		// Try to get git remote if repo exists
		if (state.repoPath) {
			const expanded = state.repoPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			const result = await window.rpc.shell.execRead(`cd ${expanded} && git remote get-url origin 2>/dev/null || echo ""`)
			if (result && result.output) {
				state.repoUrl = result.output.trim()
			}
		}
		
		updateStatus()
	} catch (e) {
		console.log('Could not detect repo:', e.message)
	}
}

function updateStatus() {
	if (!state.repoPath) {
		state.status = 'No dotfiles repository detected'
	} else if (!state.repoUrl) {
		state.status = 'Local repository found, no remote configured'
	} else {
		state.status = `Repository ready: ${state.repoPath}`
	}
}

async function loadFiles() {
	if (!state.repoPath) return
	
	try {
		const expanded = state.repoPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
		const result = await window.rpc.shell.execRead(`find ${expanded} -type f -name "*.sh" -o -name "*.vim" -o -name "*.lua" -o -name ".*rc" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.conf" | head -50`)
		if (result && result.output) {
			state.files = result.output.trim().split('\n').filter(f => f && f.trim())
		}
	} catch (e) {
		console.log('Could not load files:', e.message)
	}
}

export function onMount(component) {
	// Load files on mount
	loadFiles()

	component.delegate('click', '#btn-init-repo', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const repoPath = `${home.output.trim()}/.dotfiles`
			
			// Create repo directory
			await window.rpc.shell.execRead(`mkdir -p ${repoPath}`)
			
			// Initialize git repo
			await window.rpc.shell.execRead(`cd ${repoPath} && git init`)
			
			// Create README
			await window.rpc.shell.writeFile(`${repoPath}/README.md`, '# Dotfiles\n\nManaged by dotfiles-mgr')
			
			state.repoPath = '~/.dotfiles'
			state.repoUrl = ''
			updateStatus()
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-set-remote', async () => {
		if (!state.repoUrl) {
			state.error = 'Please enter a repository URL'
			return
		}
		state.loading = true
		try {
			const expanded = state.repoPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			const url = state.repoUrl.startsWith('git@') || state.repoUrl.startsWith('http') ? state.repoUrl : `https://github.com/${state.repoUrl}`
			await window.rpc.shell.execRead(`cd ${expanded} && git remote add origin ${url}`)
			state.repoUrl = url
			updateStatus()
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-push', async () => {
		if (!state.repoPath) {
			state.error = 'No repository configured'
			return
		}
		state.syncing = true
		try {
			const expanded = state.repoPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			
			// Add all files
			await window.rpc.shell.execRead(`cd ${expanded} && git add .`)
			
			// Commit
			await window.rpc.shell.execRead(`cd ${expanded} && git commit -m "Update dotfiles - $(date +%Y-%m-%d)"`)
			
			// Push
			await window.rpc.shell.execRead(`cd ${expanded} && git push -u origin main`)
			
			state.error = null
		} catch (e) {
			state.error = e.message
		} finally {
			state.syncing = false
		}
	})

	component.delegate('click', '#btn-pull', async () => {
		if (!state.repoPath) {
			state.error = 'No repository configured'
			return
		}
		state.syncing = true
		try {
			const expanded = state.repoPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			await window.rpc.shell.execRead(`cd ${expanded} && git pull`)
			state.error = null
		} catch (e) {
			state.error = e.message
		} finally {
			state.syncing = false
		}
	})

	component.delegate('input', '#repo-url', (e) => { state.repoUrl = e.target.value })
	component.delegate('input', '#repo-path', (e) => { state.repoPath = e.target.value })
}

export function render() {
	const { repoUrl, repoPath, status, files, loading, error, syncing } = state

	return html`
		<div class="card">
			<div class="hdr">Dotfiles Synchronization</div>
			<div class="bd">
				<p style="margin-bottom:12px">Initialize, manage, and sync your dotfiles repository across multiple machines.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				
				<div style="margin-bottom:12px">
					<label style="display:block;margin-bottom:4px;font-weight:600">Repository URL</label>
					<input id="repo-url" value="${repoUrl}" placeholder="git@github.com:username/dotfiles.git or https://github.com/username/dotfiles" />
				</div>
				
				<div style="margin-bottom:12px">
					<label style="display:block;margin-bottom:4px;font-weight:600">Local Path</label>
					<input id="repo-path" value="${repoPath}" placeholder="~/.dotfiles or /path/to/dotfiles" />
				</div>
				
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<button id="btn-init-repo" ${loading ? 'disabled' : ''} style="padding:8px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer">
						${loading ? 'Initializing...' : 'Initialize Repo'}
					</button>
					<button id="btn-set-remote" ${loading ? 'disabled' : ''} style="padding:8px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer">
						${loading ? 'Setting...' : 'Set Remote'}
					</button>
				</div>
				
				<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:12px;margin-bottom:12px">
					<div style="font-size:0.8rem;color:#64748b;margin-bottom:4px">Status</div>
					<div style="font-size:0.85rem;color:#e2e8f0">${status || 'Ready to sync'}</div>
				</div>
				
				<div style="display:flex;gap:8px">
					<button id="btn-pull" ${syncing ? 'disabled' : ''} style="padding:8px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer">
						${syncing ? 'Pulling...' : 'Pull Changes'}
					</button>
					<button id="btn-push" ${syncing ? 'disabled' : ''} style="padding:8px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer">
						${syncing ? 'Pushing...' : 'Push Changes'}
					</button>
				</div>
			</div>
		</div>
		
		${files.length > 0 ? `
			<div class="card" style="margin-top:12px">
				<div class="hdr">Repository Files</div>
				<div class="bd">
					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
						${files.slice(0, 20).map(file => html`
							<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px">
								<div style="font-size:0.75rem;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${file}</div>
							</div>
						`).join('')}
						${files.length > 20 ? `
							<div style="grid-column:1/-1;text-align:center;color:#64748b;font-size:0.75rem;margin-top:8px">+ ${files.length - 20} more files</div>
						` : ''}
					</div>
				</div>
			</div>
		` : ''}
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Quick Start Guide</div>
			<div class="bd">
				<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:16px">
					<div style="font-size:0.85rem;color:#e2e8f0;margin-bottom:8px">Initialize your dotfiles repository:</div>
					<div style="font-size:0.75rem;color:#64748b">
						<div style="margin-bottom:6px">1. Click "Initialize Repo" to create ~/.dotfiles</div>
						<div style="margin-bottom:6px">2. Enter your GitHub (or other) repository URL</div>
						<div style="margin-bottom:6px">3. Click "Set Remote" to configure git remote</div>
						<div>4. Add your config files and click "Push Changes"</div>
					</div>
				</div>
				
				<div style="margin-top:12px;color:#64748b">
					<p><strong>Pro Tip:</strong> Use symlinks to connect your dotfiles to your home directory:</p>
					<code style="background:rgba(255,255,255,0.02);padding:4px 6px;border-radius:4px;font-size:0.75rem">ln -s ~/.dotfiles/.vimrc ~/.vimrc</code>
				</div>
			</div>
		</div>
	`
}
