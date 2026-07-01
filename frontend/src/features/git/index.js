export { state as gitState, init as gitInit, render as gitRender, loadRepos } from '../../plugins/git/index.js'
export { state as fstreeState, init as fstreeInit, render as fstreeRender } from '../../plugins/fstree/index.js'

import * as git from '../../plugins/git/index.js'
import * as fstree from '../../plugins/fstree/index.js'

export const plugins = [git, fstree]

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
}

export function render() {
	return `
		${git.render()}
		${fstree.render()}
	`
}
