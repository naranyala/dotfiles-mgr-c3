export { state as filesState, init as filesInit, render as filesRender } from '../../plugins/files/index.js'
export { state as filetoolsState, init as filetoolsInit, render as filetoolsRender } from '../../plugins/filetools/index.js'

import * as files from '../../plugins/files/index.js'
import * as filetools from '../../plugins/filetools/index.js'

export const plugins = [files, filetools]

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
}

export function render() {
	return `
		${files.render()}
		${filetools.render()}
	`
}
