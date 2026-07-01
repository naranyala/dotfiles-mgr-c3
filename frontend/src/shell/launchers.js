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
import * as pathToolkit from '../plugins/path-toolkit/index.js'
import * as clipboardTools from '../plugins/clipboard-tools/index.js'
import * as fileInspector from '../plugins/file-inspector/index.js'
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

export const launchers = [
	{
		id: 'dashboard', icon: '⊞', title: 'Dashboard', group: 'Workspace & Navigation',
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
		id: 'workspace', icon: '📂', title: 'Workspace Navigator', group: 'Workspace & Navigation',
		desc: 'Explore workspaces, groups & repositories',
		content: () => `${workspaceFeature.render()}`
	},
	{
		id: 'system-hub', icon: '🛠', title: 'System Hub', group: 'System & Ops',
		desc: 'Consolidated health, probe & network telemetry',
		content: () => `${systemHub.render()}`
	},
	{
		id: 'code-explorer', icon: '🔍', title: 'Code Explorer', group: 'Workspace & Navigation',
		desc: 'Unified file tree, search & editor tools',
		content: () => `${codeExplorer.render()}`
	},
	{
		id: 'git', icon: '⑂', title: 'Git Gallery', group: 'Development Tools',
		desc: 'Clone, manage & restore git repositories',
		content: () => `${gitFeature.render()}`
	},
	{
		id: 'terminal', icon: '〉', title: 'Terminal', group: 'System & Ops',
		desc: 'Interactive terminal with command history',
		content: () => `
			<div class="full-width">
				<xterm-terminal></xterm-terminal>
			</div>`
	},
	{
		id: 'commands', icon: '⌨', title: 'Commands', group: 'Development Tools',
		desc: 'Run shell commands with preset shortcuts',
		content: () => `${commands.render()}`
	},
	{
		id: 'sqlite', icon: '🗄', title: 'SQLite Demo', group: 'Development Tools',
		desc: 'CRUD operations demo with SQLite',
		content: () => `${sqlite.render()}`
	},
	{
		id: 'theme', icon: '◐', title: 'Theme Switcher', group: 'Dotfiles Mini Apps',
		desc: 'Toggle dark/light design tokens',
		content: () => `${themeFeature.render()}`
	},
	{
		id: 'env-manager', icon: '🌍', title: 'Environment Manager', group: 'Dotfiles Mini Apps',
		desc: 'View and manage environment variables',
		content: () => `${envManager.render()}`
	},
	{
		id: 'dotfiles-git', icon: '🐙', title: 'Git Config Manager', group: 'Dotfiles Mini Apps',
		desc: 'Manage git configuration across repositories',
		content: () => `${dotfilesGit.render()}`
	},
	{
		id: 'dotfiles-shell', icon: '🪟', title: 'Shell Config Manager', group: 'Dotfiles Mini Apps',
		desc: 'Configure shell rc files (bashrc, zshrc, fish)',
		content: () => `${dotfilesShell.render()}`
	},
	{
		id: 'dotfiles-vim', icon: '🟢', title: 'Vim/Neovim Config', group: 'Dotfiles Mini Apps',
		desc: 'Manage vimrc and neovim configurations',
		content: () => `${dotfilesVim.render()}`
	},
	{
		id: 'dotfiles-tmux', icon: '🟥', title: 'TMUX Config', group: 'Dotfiles Mini Apps',
		desc: 'Manage tmux configuration and sessions',
		content: () => `${dotfilesTmux.render()}`
	},
	{
		id: 'dotfiles-ssh', icon: '🔑', title: 'SSH Config Manager', group: 'Dotfiles Mini Apps',
		desc: 'Manage SSH configuration and keys',
		content: () => `${dotfilesSsh.render()}`
	},
	{
		id: 'dotfiles-editor', icon: '✏️', title: 'Editor Config', group: 'Dotfiles Mini Apps',
		desc: 'Manage editor configurations (VS Code, Sublime, etc.)',
		content: () => `${dotfilesEditor.render()}`
	},
	{
		id: 'dotfiles-sync', icon: '🔄', title: 'Dotfiles Sync', group: 'Dotfiles Mini Apps',
		desc: 'Synchronize dotfiles across machines with Git',
		content: () => `${dotfilesSync.render()}`
	},
	{
		id: 'dotfiles-bashrc', icon: '🐚', title: 'Bashrc Manager', group: 'Dotfiles Mini Apps',
		desc: 'Read, edit, backup, and restore your .bashrc file',
		content: () => `${dotfilesBashrc.render()}`
	},
	{
		id: 'task-manager', icon: '📊', title: 'Task Manager', group: 'System & Ops',
		desc: 'Consolidated system monitoring dashboard',
		content: () => `${taskManager.render()}`
	},
	{
		id: 'path-toolkit', icon: '🔗', title: 'Path Toolkit', group: 'Development Tools',
		desc: 'Join paths, get dirname/basename, expand env vars',
		content: () => `${pathToolkit.render()}`
	},
	{
		id: 'clipboard-tools', icon: '📋', title: 'Clipboard Tools', group: 'System & Ops',
		desc: 'System clipboard read and write operations',
		content: () => `${clipboardTools.render()}`
	},
	{
		id: 'file-inspector', icon: '🔬', title: 'File Inspector', group: 'Workspace & Navigation',
		desc: 'Check file stats, existence, and directory status',
		content: () => `${fileInspector.render()}`
	},
	{
		id: 'search-everywhere', icon: '🔎', title: 'Search Everywhere', group: 'Workspace & Navigation',
		desc: 'Unified search across files, repos, and content',
		content: () => `${searchEverywhere.render()}`
	},
	{
		id: 'backend-state', icon: '⚙', title: 'Backend State', group: 'System & Ops',
		desc: 'View RPC method count and error state',
		content: () => `${backendState.render()}`
	},
	{
		id: 'workspace-cli', icon: '💻', title: 'Workspace CLI', group: 'Workspace & Navigation',
		desc: 'Execute shell commands in workspace context',
		content: () => `${workspaceCli.render()}`
	},
	{
		id: 'git-summary', icon: '📊', title: 'Git Summary', group: 'Repository',
		desc: 'Quick view of repository status',
		content: () => `${gitSummary.render()}`
	},
	{
		id: 'manpage-reader', icon: '📖', title: 'Manpage Reader', group: 'Development Tools',
		desc: 'Browse system manpages with persistent bookmarks',
		content: () => `${manpageReader.render()}`
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
