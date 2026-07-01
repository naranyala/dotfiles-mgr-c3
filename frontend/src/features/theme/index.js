export { state as themeState, init as themeInit, render as themeRender } from '../../plugins/theme/index.js'

import * as theme from '../../plugins/theme/index.js'

export const plugins = [theme]

export async function initAll() {
	await Promise.all(plugins.map(p => p.init()))
}

export function render() {
	return theme.render()
}
