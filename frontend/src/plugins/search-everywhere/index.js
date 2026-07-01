import { reactive, computed } from '../../core/signals.js'
import { html } from '../../core/template.js'
import { fuzzyMatch } from '../../shared/index.js'

export const state = reactive({
	searchQuery: '',
	fileResults: [],
	repoResults: [],
	loading: false,
})

const fileMatches = computed(() => {
	if (!state.searchQuery) return state.fileResults
	return state.fileResults.filter(f => fuzzyMatch(f, state.searchQuery))
})

const repoMatches = computed(() => {
	if (!state.searchQuery) return state.repoResults
	return state.repoResults.filter(r => fuzzyMatch(r, state.searchQuery))
})

export async function init() {}

export function onMount(component) {
	component.delegate('input', '#search-everywhere', (e) => { state.searchQuery = e.target.value })
	component.delegate('click', '#btn-search-files', async () => {
		state.loading = true
		try {
			const res = await window.rpc.shell.glob(state.searchQuery || '.')
			state.fileResults = res.matches || []
		} catch (e) {
			state.fileResults = []
		}
		state.loading = false
	})
	component.delegate('click', '#btn-search-repos', async () => {
		state.loading = true
		try {
			const res = await window.rpc.repo.list()
			state.repoResults = (res || []).map(r => r.name || r.path) || []
		} catch (e) {
			state.repoResults = []
		}
		state.loading = false
	})
	component.delegate('click', '#btn-search-all', async () => {
		state.loading = true
		try {
			const fileRes = await window.rpc.shell.glob(state.searchQuery || '.')
			state.fileResults = fileRes.matches || []
			const repoRes = await window.rpc.repo.list()
			state.repoResults = (repoRes || []).map(r => r.name || r.path) || []
		} catch (e) {
			state.fileResults = []
			state.repoResults = []
		}
		state.loading = false
	})
}

export function render() {
	const { searchQuery, loading } = state
	const fMatches = fileMatches.value
	const rMatches = repoMatches.value

	return html`
		<div class="card">
			<div class="hdr">Search Everywhere</div>
			<div class="bd">
				<div style="display:flex;gap:6px;margin-bottom:8px">
					<input id="search-everywhere" placeholder="Search files or repos…" style="flex:1" value="${searchQuery}" />
					<button id="btn-search-all" ${loading ? 'disabled' : ''}>${loading ? '…' : '🔍'}</button>
				</div>
				<div style="display:flex;gap:6px;margin-bottom:12px">
					<button id="btn-search-files" ${loading ? 'disabled' : ''}>Files</button>
					<button id="btn-search-repos" ${loading ? 'disabled' : ''}>Repos</button>
				</div>

				${fMatches.length ? `
					<label style="font-size:0.8rem;margin-bottom:4px">Files</label>
					<div style="max-height:100px;overflow:auto;font-size:0.75rem">
						${fMatches.slice(0, 20).map(f => `
							<div class="mono" style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.02)">${escapeHtml(f)}</div>
						`).join('')}
					</div>
				` : ''}

				${rMatches.length ? `
					<label style="font-size:0.8rem;margin:12px 0 4px">Repositories</label>
					<div style="max-height:100px;overflow:auto;font-size:0.75rem">
						${rMatches.slice(0, 20).map(r => `
							<div class="mono" style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.02)">${escapeHtml(r)}</div>
						`).join('')}
					</div>
				` : ''}

				${!loading && !fMatches.length && !rMatches.length && searchQuery ? `
					<span style="color:#64748b">No matches found</span>
				` : ''}
			</div>
		</div>`
}

function escapeHtml(s) {
	return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}