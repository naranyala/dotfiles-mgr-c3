import { reactive } from '../../core/signals.js'

export const state = reactive({
	data: null,
	loading: false,
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '#btn-metrics-refresh', async () => {
		state.loading = true
		try {
			const res = await window.rpc.metrics_getStats()
			if (res.error) state.data = { error: res.error }
			else state.data = res
		} catch (e) {
			state.data = { error: e.message }
		} finally {
			state.loading = false
		}
	})
}

function formatSize(bytes) {
	if (bytes == null) return '—'
	if (bytes < 1024) return bytes + ' B'
	if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
	if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
	return (bytes / 1073741824).toFixed(2) + ' GB'
}

export function render() {
	const { data, loading } = state

	return `
    <div class="card">
      <div class="hdr">
        <span>Workspace Metrics</span>
        <button id="btn-metrics-refresh" class="btn-icon" title="Refresh">↻</button>
      </div>
      <div class="bd">
        ${loading ? '<div style="text-align:center;padding:16px;color:#64748b">Loading…</div>'
          : data ? data.error ? `<span class="err">${data.error}</span>`
          : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div>
                <label>Total Files</label>
                <div class="mono" style="font-size:1.1rem">${data.total_files ?? '—'}</div>
              </div>
              <div>
                <label>Total Size</label>
                <div class="mono" style="font-size:1.1rem">${formatSize(data.total_size_bytes)}</div>
              </div>
            </div>`
          : '<div style="color:#64748b;text-align:center;padding:16px">No workspace selected. Click Refresh to load metrics.</div>'}
      </div>
    </div>`
}
