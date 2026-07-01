import { collectPluginStates } from './plugins.js'

export function installStateDump() {
	window.dumpAllState = async function () {
		const frontendStates = collectPluginStates()
		const divider = '═'.repeat(60)

		if (window.rpc && window.rpc.shell.log) {
			window.rpc.shell.log(`\n${divider}\n  FRONTEND STATE DUMP\n${divider}`, 'info')
			for (const [plugin, st] of Object.entries(frontendStates)) {
				window.rpc.shell.log(`[plugin:${plugin}] ${JSON.stringify(st, null, 2)}`, 'info')
			}
		}

		if (window.rpc && window.rpc.shell.dumpBackendState) {
			try {
				const backendState = await window.rpc.shell.dumpBackendState()
				if (window.rpc.shell.log) {
					window.rpc.shell.log(`[BACKEND STATE JSON] ${JSON.stringify(backendState, null, 2)}`, 'info')
				}
			} catch (e) {
				console.error('Failed to dump backend state', e)
			}
		}

		if (window.rpc && window.rpc.shell.log) {
			window.rpc.shell.log(`${divider}\n  END STATE DUMP\n${divider}\n`, 'info')
		}
	}

	document.addEventListener('keydown', (e) => {
		if (e.ctrlKey && e.shiftKey && e.key === 'D') {
			e.preventDefault()
			window.dumpAllState()
		}
	})
}
