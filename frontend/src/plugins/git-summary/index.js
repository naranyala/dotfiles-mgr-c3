import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'
import * as git from '../git/index.js'

export const state = reactive({
	reposCount: 0,
	trashCount: 0,
	loading: false,
})

export async function init() {
	await refresh()
}

export async function refresh() {
	state.loading = true
	try {
		await git.loadRepos()
		state.reposCount = git.state.gitRepos.length
		state.trashCount = git.state.gitTrashRepos.length
	} catch (e) {
		console.error(e)
	} finally {
		state.loading = false
	}
}

export function onMount(component) {
	component.delegate('click', '#btn-git-summary-refresh', () => refresh())
}

export function render() {
	return html`
		<div class="card">
			<div class="hdr">
				<span>Git Summary</span>
				<button id="btn-git-summary-refresh" class="btn-icon" title="Refresh">↻</button>
			</div>
			<div class="bd">
				${state.loading ? '<div style="text-align:center;padding:16px;color:#64748b">Loading…</div>' : `
					<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
						<div>
							<label>Repos</label>
							<div class="mono" style="font-size:1.1rem">${state.reposCount}</div>
						</div>
						<div>
							<label>Trash</label>
							<div class="mono" style="font-size:1.1rem;color:#f87171">${state.trashCount}</div>
						</div>
					</div>
				`}
			</div>
		</div>
	`
}
