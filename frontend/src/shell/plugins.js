import { registry } from './registry.js'
import * as system from '../plugins/system/index.js'
import * as git from '../plugins/git/index.js'
import * as files from '../plugins/files/index.js'
import * as tools from '../plugins/tools/index.js'
import * as health from '../plugins/health/index.js'
import * as processes from '../plugins/processes/index.js'
import * as commands from '../plugins/commands/index.js'
import * as network from '../plugins/network/index.js'
import * as probe from '../plugins/probe/index.js'
import * as filetools from '../plugins/filetools/index.js'
import * as theme from '../plugins/theme/index.js'
import * as search from '../plugins/search/index.js'
import * as metrics from '../plugins/metrics/index.js'
import * as fstree from '../plugins/fstree/index.js'
import * as sqlite from '../plugins/sqlite/index.js'
import * as envManager from '../plugins/env-manager/index.js'
import * as processMonitor from '../plugins/process-monitor/index.js'
import * as taskManager from '../plugins/task-manager/index.js'
import * as searchEverywhere from '../plugins/search-everywhere/index.js'
import * as backendState from '../plugins/backend-state/index.js'
import * as dotfilesGit from '../plugins/dotfiles-git/index.js'
import * as dotfilesShell from '../plugins/dotfiles-shell/index.js'
import * as dotfilesVim from '../plugins/dotfiles-vim/index.js'
import * as dotfilesTmux from '../plugins/dotfiles-tmux/index.js'
import * as dotfilesSsh from '../plugins/dotfiles-ssh/index.js'
import * as dotfilesEditor from '../plugins/dotfiles-editor/index.js'
import * as dotfilesSync from '../plugins/dotfiles-sync/index.js'
import * as gitSummary from '../plugins/git-summary/index.js'
import * as dotfilesBashrc from '../plugins/dotfiles-bashrc/index.js'
import * as manpageReader from '../plugins/manpage-reader/index.js'
import * as jobApplicantTracker from '../plugins/job-applicant-tracker/index.js'
import * as llamaServer from '../plugins/llama-server/index.js'
import * as ttsRunner from '../plugins/tts-runner/index.js'
import * as mdToPdf from '../plugins/md-to-pdf/index.js'
import * as pdfToSpeech from '../plugins/pdf-to-speech/index.js'
import * as thumbnailMaker from '../plugins/thumbnail-maker/index.js'
import * as formWizard from '../plugins/form-wizard/index.js'
import * as slidingDrawer from '../plugins/sliding-drawer/index.js'
import * as modalBackdrop from '../plugins/modal-backdrop/index.js'
import * as treeview from '../plugins/treeview/index.js'
import * as calculator from '../plugins/calculator/index.js'
import * as accordion from '../plugins/accordion/index.js'
import * as codeblock from '../plugins/codeblock/index.js'

export const plugins = [system, git, files, tools, health, processes, commands, network, probe, filetools, theme, search, metrics, fstree, sqlite, envManager, processMonitor, taskManager, searchEverywhere, backendState, dotfilesGit, dotfilesShell, dotfilesVim, dotfilesTmux, dotfilesSsh, dotfilesEditor, dotfilesSync, gitSummary, dotfilesBashrc, manpageReader, jobApplicantTracker, llamaServer, ttsRunner, mdToPdf, pdfToSpeech, thumbnailMaker, formWizard, slidingDrawer, modalBackdrop, treeview, calculator, accordion, codeblock]

const pluginNames = ['system', 'git', 'files', 'tools', 'health', 'processes', 'commands', 'network', 'probe', 'filetools', 'theme', 'search', 'metrics', 'fstree', 'sqlite', 'envManager', 'processMonitor', 'taskManager', 'searchEverywhere', 'backendState', 'dotfilesGit', 'dotfilesShell', 'dotfilesVim', 'dotfilesTmux', 'dotfilesSsh', 'dotfilesEditor', 'dotfilesSync', 'gitSummary', 'dotfilesBashrc', 'manpageReader', 'jobApplicantTracker', 'llamaServer', 'ttsRunner', 'mdToPdf', 'pdfToSpeech', 'thumbnailMaker', 'formWizard', 'slidingDrawer', 'modal-backdrop', 'treeview', 'calculator', 'accordion', 'codeblock']

for (let i = 0; i < plugins.length; i++) {
	registry.register({ name: pluginNames[i], ...plugins[i] })
}

export function getPluginName(p) {
	const idx = plugins.indexOf(p)
	if (idx >= 0) return pluginNames[idx] || `plugin-${idx}`
	return p.name || 'unknown'
}

export function mergeStates() {
	const merged = {}
	for (const p of plugins) {
		for (const [k, v] of Object.entries(p.state)) {
			merged[k] = v
		}
	}
	return merged
}

export function collectPluginStates() {
	const snapshot = {}
	for (let i = 0; i < plugins.length; i++) {
		const name = pluginNames[i] || `plugin-${i}`
		const raw = {}
		for (const key of Object.keys(plugins[i].state)) {
			try { raw[key] = JSON.parse(JSON.stringify(plugins[i].state[key])) } catch { raw[key] = String(plugins[i].state[key]) }
		}
		snapshot[name] = raw
	}
	return snapshot
}

export async function initAll() {
	await Promise.all(plugins.map(p => typeof p.init === 'function' ? p.init() : Promise.resolve()))
	setTimeout(() => window.dumpAllState(), 500)
}
