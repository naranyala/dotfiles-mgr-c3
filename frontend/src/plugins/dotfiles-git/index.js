import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	gitConfig: null,
	userName: '',
	userEmail: '',
	currentProfile: 'default',
	profiles: {},
	loading: false,
	error: null
})

export async function init() {
	// Load initial git config
	state.loading = true
	try {
		const config = await window.rpc.shell.execRead('git config --list')
		if (config && config.output) {
			const configObj = {}
			config.output.trim().split('\n').forEach(line => {
				const [key, value] = line.split('=')
				if (key && value) configObj[key.trim()] = value.trim()
			})
			state.gitConfig = configObj
			state.userName = configObj['user.name'] || ''
			state.userEmail = configObj['user.email'] || ''
		}
	} catch (e) {
		state.error = e.message
	} finally {
		state.loading = false
	}
}

export function onMount(component) {
	component.delegate('click', '#btn-save-git', async () => {
		state.loading = true
		try {
			const name = state.userName
			const email = state.userEmail
			if (name) {
				await window.rpc.shell.execRead(`git config --global user.name "${name}"`)
			}
			if (email) {
				await window.rpc.shell.execRead(`git config --global user.email "${email}"`)
			}
			// Reload config
			await init()
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('input', '#git-user-name', (e) => { state.userName = e.target.value })
	component.delegate('input', '#git-user-email', (e) => { state.userEmail = e.target.value })
}

export function render() {
	const { gitConfig, userName, userEmail, loading, error } = state

	return html`
		<div class="card">
			<div class="hdr">Git Configuration Manager</div>
			<div class="bd">
				<p style="margin-bottom:12px">Manage git user, email, aliases, and repository-specific configurations.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				
				<div style="margin-bottom:12px">
					<label style="display:block;margin-bottom:4px;font-weight:600">User Name</label>
					<input id="git-user-name" value="${userName}" placeholder="Your Name" />
				</div>
				
				<div style="margin-bottom:12px">
					<label style="display:block;margin-bottom:4px;font-weight:600">User Email</label>
					<input id="git-user-email" value="${userEmail}" placeholder="your@email.com" />
				</div>
				
				<button id="btn-save-git" ${loading ? 'disabled' : ''} style="margin-top:8px">
					${loading ? 'Saving...' : 'Save Global Config'}
				</button>
				
				${gitConfig ? `
					<div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05)">
						<div style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Current Configuration</div>
						<pre class="mono" style="font-size:0.75rem;background:rgba(255,255,255,0.02);padding:8px;border-radius:4px;overflow-x:auto">${JSON.stringify(gitConfig, null, 2)}</pre>
					</div>
				` : ''}
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Profiles</div>
			<div class="bd">
				<p style="color:#64748b">Save and switch between different git configurations (work, personal, etc.)</p>
				<p style="margin-top:8px;color:#64748b">Coming soon: Profile management UI.</p>
			</div>
		</div>
	`
}
