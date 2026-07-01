import { launchers } from './launchers.js'

/**
 * Maps launcher items to their new categorized groups.
 * If an item doesn't belong to a new category, it's omitted from the grid.
 */
export function getCategorizedLaunchers() {
    // Mapping: Category Name -> { icon, items: [launcher_id, ...] }
    const CATEGORIES = {
        '🖥️ System': {
            icon: '🖥️',
            items: ['dashboard', 'system', 'health', 'task-manager', 'network', 'metrics']
        },
        '📂 Repository': {
            icon: '📂',
            items: ['git', 'files', 'fstree', 'search', 'git-summary']
        },
        '🛠️ Tools': {
            icon: '🛠️',
            items: ['commands', 'shell', 'sqlite', 'filetools', 'tools']
        },
        '💻 Dotfiles Mini Apps': {
            icon: '💻',
            items: ['theme', 'env-manager', 'dotfiles-git', 'dotfiles-shell', 'dotfiles-vim', 'dotfiles-tmux', 'dotfiles-ssh', 'dotfiles-editor', 'dotfiles-sync', 'dotfiles-bashrc']
        }
    }

    return Object.entries(CATEGORIES).map(([name, config]) => ({
        category: name,
        icon: config.icon,
        items: config.items
            .map(id => launchers.find(l => l.id === id))
            .filter(Boolean) // Filter out if launcher not found
    }))
}
