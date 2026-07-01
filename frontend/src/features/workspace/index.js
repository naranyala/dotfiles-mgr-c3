import * as git from '../../plugins/git/index.js'

export const state = git.state

export async function init() {
	await git.init()
}

export function render() {
	return git.render()
}

export { loadRepos } from '../../plugins/git/index.js'
