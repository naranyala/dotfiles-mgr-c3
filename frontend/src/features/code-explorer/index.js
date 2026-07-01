import * as files from '../../plugins/files/index.js'
import * as filetools from '../../plugins/filetools/index.js'
import * as fstree from '../../plugins/fstree/index.js'
import * as search from '../../plugins/search/index.js'

export const plugins = [files, filetools, fstree, search]

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
}

export function render() {
	return `
		<div class="grid2">
			<div class="card">${fstree.render()}</div>
			<div class="card">${search.render()}</div>
			<div class="card">${files.render()}</div>
			<div class="card">${filetools.render()}</div>
		</div>
	`
}
