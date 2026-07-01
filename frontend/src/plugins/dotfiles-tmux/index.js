import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	tmuxConfContent: '',
	sessions: [],
	newSessionName: '',
	loading: false,
	error: null,
	saved: false
})

export async function init() {
	// Load tmux.conf
	await loadConfig()
	await loadSessions()
}

async function loadConfig() {
	const home = await window.rpc.shell.execRead('echo $HOME')
	const filePath = home?.output?.trim() ? `${home.output.trim()}/.tmux.conf` : '~/.tmux.conf'
	
	try {
		const result = await window.rpc.shell.execRead(`cat ${filePath} 2>/dev/null || echo ""`)
		if (result && result.output) {
			state.tmuxConfContent = result.output
		}
	} catch (e) {
		console.log('Could not load tmux.conf:', e.message)
	}
}

async function loadSessions() {
	try {
		const result = await window.rpc.shell.execRead('tmux list-sessions 2>/dev/null || echo ""')
		if (result && result.output) {
			const sessions = []
			result.output.trim().split('\n').forEach(line => {
				const match = line.match(/^([^:]+)/)
				if (match && match[1]) {
					sessions.push(match[1])
				}
			})
			state.sessions = sessions
		}
	} catch (e) {
		console.log('Could not load tmux sessions:', e.message)
	}
}

export function onMount(component) {
	component.delegate('click', '#btn-save-tmuxconf', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const filePath = home?.output?.trim() ? `${home.output.trim()}/.tmux.conf` : '~/.tmux.conf'
			await window.rpc.shell.writeFile(filePath, state.tmuxConfContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-create-session', async () => {
		if (!state.newSessionName) return
		state.loading = true
		try {
			await window.rpc.shell.execRead(`tmux new-session -d -s ${state.newSessionName}`)
			state.newSessionName = ''
			await loadSessions()
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('input', '#tmuxconf-content', (e) => { state.tmuxConfContent = e.target.value })
	component.delegate('input', '#new-session-name', (e) => { state.newSessionName = e.target.value })
	component.delegate('click', '[data-kill-session]', async (e) => {
		const session = e.target.closest('[data-kill-session]').dataset.killSession
		if (confirm(`Kill session "${session}"?`)) {
			state.loading = true
			try {
				await window.rpc.shell.execRead(`tmux kill-session -t ${session}`)
				await loadSessions()
			} catch (e) {
				state.error = e.message
			} finally {
				state.loading = false
			}
		}
	})
}

export function render() {
	const { tmuxConfContent, sessions, newSessionName, loading, error, saved } = state

	return html`
		<div class="card">
			<div class="hdr">TMUX Configuration Manager</div>
			<div class="bd">
				<p style="margin-bottom:12px">Edit tmux.conf and manage sessions, windows, and panes.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				${saved ? `<div style="color:#22c55e;margin-bottom:12px">✓ Configuration saved!</div>` : ''}
				
				<div>
					<label style="display:block;margin-bottom:4px;font-weight:600">.tmux.conf</label>
					<textarea id="tmuxconf-content" style="width:100%;min-height:200px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder="# TMUX configuration">${tmuxConfContent}</textarea>
					<button id="btn-save-tmuxconf" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save .tmux.conf'}</button>
				</div>
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Session Management</div>
			<div class="bd">
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<input id="new-session-name" value="${newSessionName}" placeholder="New session name" style="flex:1" />
					<button id="btn-create-session" ${loading ? 'disabled' : ''} style="padding:6px 12px">${loading ? 'Creating...' : 'Create Session'}</button>
				</div>
				
				${sessions.length > 0 ? `
					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
						${sessions.map(session => html`
							<div class="card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);padding:12px">
								<div style="display:flex;justify-content:space-between;align-items:center">
									<span style="font-size:0.85rem;color:#e2e8f0">${session}</span>
									<button data-kill-session="${session}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem" title="Kill session">✕</button>
								</div>
								<div style="font-size:0.75rem;color:#64748b;margin-top:6px">Attach: tmux attach -t ${session}</div>
							</div>
						`).join('')}
					</div>
				` : `
					<div style="color:#64748b;text-align:center;padding:20px">No active tmux sessions</div>
				`}
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Quick Commands</div>
			<div class="bd">
				<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
					<button style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer" onclick="alert('Feature coming soon!')">📋 List Windows</button>
					<button style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer" onclick="alert('Feature coming soon!')">🎯 Attach Last</button>
					<button style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer" onclick="alert('Feature coming soon!')">🔄 Reload Config</button>
				</div>
			</div>
		</div>
	`
}
