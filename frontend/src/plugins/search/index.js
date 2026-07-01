import { reactive } from '../../core/signals.js'

export const state = reactive({
	query: '',
	results: '',
	loading: false,
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '#btn-search', async () => {
		if (!state.query.trim()) return
		state.loading = true
		state.results = ''
		try {
			const res = await window.rpc.shell.search_query(state.query)
			if (res.error) state.results = 'Error: ' + res.error
			else state.results = res.results || '(no matches)'
		} catch (e) {
			state.results = 'Error: ' + e.message
		} finally {
			state.loading = false
		}
	})
	component.delegate('input', '#search-term', (e) => (state.query = e.target.value))
	component.delegate('keydown', '#search-term', (e) => {
		if (e.key === 'Enter') {
			e.target.closest('.card').querySelector('#btn-search')?.click()
		}
	})
}

export function render() {
	const { query, results, loading } = state

	return `
    <div class="card">
      <div class="hdr">
        <span>Code Search (git grep)</span>
        ${loading ? '<span style="color:#fbbf24;font-size:0.8rem">Searching…</span>' : ''}
      </div>
      <div class="bd">
        <label>Search Term</label>
        <div style="display:flex;gap:8px">
          <input id="search-term" value="${query}" placeholder="e.g. TODO, function name, regex…" style="flex:1;margin:0" />
          <button id="btn-search" ${loading ? 'disabled' : ''}>Search</button>
        </div>
        ${results ? `<div class="mono" style="margin-top:12px;max-height:400px;overflow:auto;white-space:pre-wrap;font-size:0.78rem">${results}</div>` : ''}
      </div>
    </div>`
}
