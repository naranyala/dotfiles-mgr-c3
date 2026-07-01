import { reactive } from '../../core/signals.js'

export const state = reactive({
	repoId: '',
	tree: null,
	fileContent: '',
	selectedFile: '',
	loading: false,
	error: '',
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '#btn-tree-load', async () => {
		if (!state.repoId.trim()) return
		state.loading = true
		state.tree = null
		state.error = ''
		state.fileContent = ''
		state.selectedFile = ''
		try {
			const res = await window.rpc.shell.get_tree(state.repoId)
			if (res.error) state.error = res.error
			else state.tree = res
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})
	component.delegate('input', '#tree-repo-id', (e) => (state.repoId = e.target.value))

	component.delegate('click', '.tree-file', async (e) => {
		const entryId = e.target.closest('.tree-file')?.dataset.entryId
		if (!entryId) return
		state.loading = true
		state.error = ''
		try {
			const res = await window.rpc.shell.get_file_content(entryId)
			if (res.error) state.error = res.error
			else {
				state.fileContent = res
				state.selectedFile = entryId.split('/').pop()
			}
		} catch (err) {
			state.error = err.message
		} finally {
			state.loading = false
		}
	})
}

function renderNode(node, depth = 0) {
	const indent = depth * 16
	if (node.type === 'folder') {
		const children = node.children || []
		return `
			<div style="padding-left:${indent}px;margin-top:4px">
				<span style="color:#fbbf24">📁 ${node.name}</span>
			</div>
			${children.map(c => renderNode(c, depth + 1)).join('')}`
	}
	return `
		<div class="tree-file" data-entry-id="${node.id}" style="padding-left:${indent}px;margin-top:2px;cursor:pointer;color:#94a3b8;font-size:0.82rem" onmouseover="this.style.color='#e2e8f0'" onmouseout="this.style.color='#94a3b8'">
			📄 ${node.name}
		</div>`
}

export function render() {
	const { repoId, tree, fileContent, selectedFile, loading, error } = state

	return `
    <div class="card">
      <div class="hdr">
        <span>File Tree Browser</span>
      </div>
      <div class="bd">
        <label>Repo ID</label>
        <div style="display:flex;gap:8px">
          <input id="tree-repo-id" value="${repoId}" placeholder="e.g. 1" style="flex:1;margin:0" />
          <button id="btn-tree-load" ${loading ? 'disabled' : ''}>Load</button>
        </div>
        ${error ? `<div class="err" style="margin-top:8px">${error}</div>` : ''}
        ${tree ? `
          <div style="margin-top:12px;max-height:300px;overflow:auto;background:rgba(0,0,0,0.2);border-radius:8px;padding:8px;font-size:0.82rem">
            ${Array.isArray(tree) ? tree.map(n => renderNode(n)).join('') : '<span style="color:#64748b">No tree data</span>'}
          </div>` : ''}
        ${fileContent ? `
          <div style="margin-top:12px">
            <label>${selectedFile}</label>
            <pre class="mono" style="max-height:300px;overflow:auto;font-size:0.78rem">${fileContent}</pre>
          </div>` : ''}
      </div>
    </div>`
}
