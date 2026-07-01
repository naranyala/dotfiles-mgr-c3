import { reactive } from '../../core/signals.js'

export const state = reactive({
	gitUrl: '',
	gitStatus: '',
	gitLoading: false,
	gitRepos: [],
	gitTrashRepos: [],
})

export async function loadRepos() {
	try {
		const res = await window.rpc.shell.gitList()
		state.gitRepos = res.repos || []
	} catch (e) { state.gitRepos = [] }
	try {
		const res = await window.rpc.shell.gitTrashList()
		state.gitTrashRepos = res.repos || []
	} catch (e) { state.gitTrashRepos = [] }
}

export async function init() {
	await loadRepos()
}

export function onMount(component) {
	component.delegate('click', '#btn-git-clone', async () => {
		if (!state.gitUrl) return
		state.gitLoading = true
		state.gitStatus = ''
		try {
			const res = await window.rpc.shell.gitClone(state.gitUrl)
			if (res.error) {
				state.gitStatus = res.error
			} else {
				state.gitStatus = `Cloned "${res.repoName}" into workspace/`
				state.gitUrl = ''
				await loadRepos()
			}
		} catch (e) {
			state.gitStatus = e.message
		} finally {
			state.gitLoading = false
		}
	})
	component.delegate('input', '#git-url', (e) => (state.gitUrl = e.target.value))

	component.delegate('click', '.btn-git-remove', async (e) => {
		const name = e.target.dataset.repo
		if (!name || !confirm(`Remove "${name}" from workspace?`)) return
		try {
			await window.rpc.shell.gitRemove(name)
			await loadRepos()
		} catch (err) { alert(err.message) }
	})

	component.delegate('click', '.btn-git-restore', async (e) => {
		const name = e.target.dataset.repo
		if (!name) return
		try {
			await window.rpc.shell.gitRestore(name)
			await loadRepos()
		} catch (err) { alert(err.message) }
	})

	component.delegate('click', '#btn-git-refresh', async () => {
		await loadRepos()
	})
}

export function render() {
	const { gitUrl, gitStatus, gitLoading, gitRepos, gitTrashRepos } = state

	return `
    <div class="card feature-card full-width">
      <div class="hdr">
        <span>Workspace</span>
        <button id="btn-git-refresh" class="btn-icon" title="Refresh">↻ Refresh</button>
      </div>
      <div class="bd">
        <label>Add Repository</label>
        <div class="clone-input-row">
          <input id="git-url" value="${gitUrl}" placeholder="https://github.com/user/repo.git" />
          <button id="btn-git-clone" ${gitLoading ? 'disabled' : ''}>
            ${gitLoading ? 'Cloning…' : '+ Add Repo'}
          </button>
        </div>
        ${gitStatus ? `<div class="git-status ${gitStatus.includes('Error') || gitStatus.includes('error') ? 'err' : 'ok'}">${gitStatus}</div>` : ''}

        <label style="margin-top:20px">Cloned Repositories</label>
        ${gitRepos.length ? `
          <div class="repo-list">
            ${gitRepos.map(name => `
              <div class="repo-item">
                <span class="repo-name">📁 ${name}</span>
                <button class="btn-remove btn-git-remove" data-repo="${name}" title="Remove">✕ Remove</button>
              </div>
            `).join('')}
          </div>
        ` : `<div class="empty-state">No repositories cloned yet. Add a repo URL above to get started.</div>`}

        ${gitTrashRepos.length ? `
          <label style="margin-top:20px; color:#f87171;">Removed Repositories (Trash)</label>
          <div class="repo-list">
            ${gitTrashRepos.map(name => `
              <div class="repo-item" style="border-color:rgba(248,113,113,0.3); background:rgba(248,113,113,0.05);">
                <span class="repo-name" style="color:#fca5a5; text-decoration:line-through;">📁 ${name}</span>
                <button class="btn-restore btn-git-restore" data-repo="${name}" title="Undo removal">↩ Undo</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>`
}
