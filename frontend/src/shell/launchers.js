import * as systemFeature from '../features/system/index.js'
import * as gitFeature from '../features/git/index.js'
import * as filesFeature from '../features/files/index.js'
import * as toolsFeature from '../features/tools/index.js'
import * as workspaceFeature from '../features/workspace/index.js'
import * as themeFeature from '../features/theme/index.js'
import * as systemHub from '../features/system-hub/index.js'
import * as codeExplorer from '../features/code-explorer/index.js'
import * as commands from '../plugins/commands/index.js'
import * as sqlite from '../plugins/sqlite/index.js'
import * as envManager from '../plugins/env-manager/index.js'
import * as processMonitor from '../plugins/process-monitor/index.js'
import * as taskManager from '../plugins/task-manager/index.js'
import * as searchEverywhere from '../plugins/search-everywhere/index.js'
import * as backendState from '../plugins/backend-state/index.js'
import * as gitSummary from '../plugins/git-summary/index.js'
import * as dotfilesGit from '../plugins/dotfiles-git/index.js'
import * as dotfilesShell from '../plugins/dotfiles-shell/index.js'
import * as dotfilesVim from '../plugins/dotfiles-vim/index.js'
import * as dotfilesTmux from '../plugins/dotfiles-tmux/index.js'
import * as dotfilesSsh from '../plugins/dotfiles-ssh/index.js'
import * as dotfilesEditor from '../plugins/dotfiles-editor/index.js'
import * as dotfilesSync from '../plugins/dotfiles-sync/index.js'
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

export const launchers = [
	{
		id: 'dashboard', icon: '⊞', title: 'Dashboard', group: 'Preparation and Interviews',
		desc: 'System overview, workspace management & tools',
		content: () => `
			${gitFeature.render()}
			<div class="grid2">
				${systemFeature.render()}
				${toolsFeature.render()}
				${filesFeature.render()}
			</div>
			<div class="full-width">
				<label>Terminal Logs</label>
				<terminal-view></terminal-view>
			</div>`
	},
	{
		id: 'workspace', icon: '📂', title: 'Workspace Navigator', group: 'Preparation and Interviews',
		desc: 'Explore workspaces, groups & repositories',
		content: () => `${workspaceFeature.render()}`
	},
	{
		id: 'system-hub', icon: '🛠', title: 'System Hub', group: 'System Tools',
		desc: 'Consolidated health, probe & network telemetry',
		content: () => `${systemHub.render()}`
	},
	{
		id: 'git', icon: '⑂', title: 'Git Gallery', group: 'System Tools',
		desc: 'Clone, manage & restore git repositories',
		content: () => `${gitFeature.render()}`
	},
	{
		id: 'terminal', icon: '〉', title: 'Terminal', group: 'System Tools',
		desc: 'Interactive terminal with command history',
		content: () => `
			<div class="full-width">
				<xterm-terminal></xterm-terminal>
			</div>`
	},
	{
		id: 'commands', icon: '⌨', title: 'Commands', group: 'System Tools',
		desc: 'Run shell commands with preset shortcuts',
		content: () => `${commands.render()}`
	},
	{
		id: 'sqlite', icon: '🗄', title: 'SQLite Demo', group: 'System Tools',
		desc: 'CRUD operations demo with SQLite',
		content: () => `${sqlite.render()}`
	},
	{
		id: 'theme', icon: '◐', title: 'Theme Switcher', group: '_dotfiles',
		desc: 'Toggle dark/light design tokens',
		content: () => `${themeFeature.render()}`
	},
	{
		id: 'env-manager', icon: '🌍', title: 'Environment Manager', group: '_dotfiles',
		desc: 'View and manage environment variables',
		content: () => `${envManager.render()}`
	},
	{
		id: 'dotfiles-git', icon: '🐙', title: 'Git Config Manager', group: '_dotfiles',
		desc: 'Manage git configuration across repositories',
		content: () => `${dotfilesGit.render()}`
	},
	{
		id: 'dotfiles-shell', icon: '🪟', title: 'Shell Config Manager', group: '_dotfiles',
		desc: 'Configure shell rc files (bashrc, zshrc, fish)',
		content: () => `${dotfilesShell.render()}`
	},
	{
		id: 'dotfiles-vim', icon: '🟢', title: 'Vim/Neovim Config', group: '_dotfiles',
		desc: 'Manage vimrc and neovim configurations',
		content: () => `${dotfilesVim.render()}`
	},
	{
		id: 'dotfiles-tmux', icon: '🟥', title: 'TMUX Config', group: '_dotfiles',
		desc: 'Manage tmux configuration and sessions',
		content: () => `${dotfilesTmux.render()}`
	},
	{
		id: 'dotfiles-ssh', icon: '🔑', title: 'SSH Config Manager', group: '_dotfiles',
		desc: 'Manage SSH configuration and keys',
		content: () => `${dotfilesSsh.render()}`
	},
	{
		id: 'dotfiles-editor', icon: '✏️', title: 'Editor Config', group: '_dotfiles',
		desc: 'Manage editor configurations (VS Code, Sublime, etc.)',
		content: () => `${dotfilesEditor.render()}`
	},
	{
		id: 'dotfiles-sync', icon: '🔄', title: 'Dotfiles Sync', group: '_dotfiles',
		desc: 'Synchronize dotfiles across machines with Git',
		content: () => `${dotfilesSync.render()}`
	},
	{
		id: 'dotfiles-bashrc', icon: '🐚', title: 'Bashrc Manager', group: '_dotfiles',
		desc: 'Read, edit, backup, and restore your .bashrc file',
		content: () => `${dotfilesBashrc.render()}`
	},
	{
		id: 'dotfiles-manager', icon: '💻', title: 'Dotfiles Manager', group: 'System Tools',
		desc: 'Consolidated dashboard for managing dotfiles',
		content: () => {
			const dotfiles = launchers.filter(l => l.group === '_dotfiles');
			return `
				<div style="margin-bottom:16px">
					<label>Manage Dotfiles</label>
					<div style="font-size:0.8rem;color:#64748b;margin-top:4px">Configure, edit, and sync your dotfiles across all tools.</div>
				</div>
				<div class="launcher-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
					${dotfiles.map(c => `
						<div class="launcher-item" data-open-tab="${c.id}">
							<div class="launcher-info">
								<div class="launcher-title">${c.icon} ${c.title}</div>
								<div class="launcher-desc">${c.desc}</div>
							</div>
						</div>`).join('')}
				</div>`
		}
	},
	{
		id: 'task-manager', icon: '📊', title: 'Task Manager', group: 'System Tools',
		desc: 'Consolidated system monitoring dashboard',
		content: () => `${taskManager.render()}`
	},

	{
		id: 'search-everywhere', icon: '🔎', title: 'Search Everywhere', group: 'Preparation and Interviews',
		desc: 'Unified search across files, repos, and content',
		content: () => `${searchEverywhere.render()}`
	},
	{
		id: 'backend-state', icon: '⚙', title: 'Backend State', group: 'System Tools',
		desc: 'View RPC method count and error state',
		content: () => `${backendState.render()}`
	},

	{
		id: 'job-applicant-tracker', icon: '🧑‍💼', title: 'Tracks Job Applicant', group: 'Preparation and Interviews',
		desc: 'Track and manage job applicants with CRUD operations',
		content: () => `${jobApplicantTracker.render()}`
	},
	{
		id: 'git-summary', icon: '📊', title: 'Git Summary', group: 'System Tools',
		desc: 'Quick view of repository status',
		content: () => `${gitSummary.render()}`
	},
	{
		id: 'manpage-reader', icon: '📖', title: 'Manpage Reader', group: 'System Tools',
		desc: 'Browse system manpages with persistent bookmarks',
		content: () => `${manpageReader.render()}`
	},
	{
		id: 'llama-server', icon: '🦙', title: 'Llama Server', group: 'LLM-Driven Content Creation',
		desc: 'Local LLM inference server with llama.cpp',
		content: () => `${llamaServer.render()}`
	},
	{
		id: 'tts-runner', icon: '🗣️', title: 'TTS Runner', group: 'LLM-Driven Content Creation',
		desc: 'Text-to-speech engine with edge-tts',
		content: () => `${ttsRunner.render()}`
	},
	{
		id: 'md-to-pdf', icon: '📄', title: 'Markdown to PDF', group: 'LLM-Driven Content Creation',
		desc: 'Convert markdown documents to PDF',
		content: () => `${mdToPdf.render()}`
	},
	{
		id: 'pdf-to-speech', icon: '🔊', title: 'PDF to Speech', group: 'LLM-Driven Content Creation',
		desc: 'Extract text from PDF and convert to speech',
		content: () => `${pdfToSpeech.render()}`
	},
	{
		id: 'thumbnail-maker', icon: '🖼️', title: 'Thumbnail Maker', group: 'LLM-Driven Content Creation',
		desc: 'Quick thumbnail preview with custom text and colors',
		content: () => `${thumbnailMaker.render()}`
	},
	{
		id: 'form-wizard', icon: '📋', title: 'Form Wizard', group: 'Component Challenge',
		desc: 'Multi-step form with progress indicators',
		content: () => `${formWizard.render()}`
	},
	{
		id: 'sliding-drawer', icon: '📦', title: 'Sliding Drawer', group: 'Component Challenge',
		desc: 'Bottom/side sliding panel with overlay',
		content: () => `${slidingDrawer.render()}`
	},
	{
		id: 'modal-backdrop', icon: '🪟', title: 'Modal Dialog', group: 'Component Challenge',
		desc: 'Modal with backdrop blur and multiple variants',
		content: () => `${modalBackdrop.render()}`
	},
	{
		id: 'treeview', icon: '🌲', title: 'Treeview', group: 'Component Challenge',
		desc: 'Expandable/collapsible file tree with selection',
		content: () => `${treeview.render()}`
	},
	{
		id: 'calculator', icon: '🧮', title: 'Calculator', group: 'Component Challenge',
		desc: 'Functional calculator with operator support',
		content: () => `${calculator.render()}`
	},
	{
		id: 'accordion', icon: '📂', title: 'Accordion', group: 'Component Challenge',
		desc: 'Expandable/collapsible content sections',
		content: () => `${accordion.render()}`
	},
	{
		id: 'codeblock', icon: '📝', title: 'Code Block', group: 'Component Challenge',
		desc: 'Code blocks with syntax highlighting and copy-to-clipboard',
		content: () => `${codeblock.render()}`
	},
]

export function fuzzyMatch(text, query) {
	if (!query) return true
	text = text.toLowerCase()
	query = query.toLowerCase()
	let qi = 0
	for (let ti = 0; ti < text.length && qi < query.length; ti++) {
		if (text[ti] === query[qi]) qi++
	}
	return qi === query.length
}
