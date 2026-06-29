import { createSignal } from '../framework/signals.js';
import { ReactiveElement } from '../framework/component.js';
import { html } from '../framework/template.js';
import { PluginManager, eventBus } from '../core/plugin-system.js';
import { rpc } from '../core/rpc.js';
import { activeWorkspace } from './workspace-switcher.js';

// --- State ---

const [selectedRepo, setSelectedRepo] = createSignal(null);
const [repoInfo, setRepoInfo] = createSignal(null);
const [fileTree, setFileTree] = createSignal([]);
const [selectedFile, setSelectedFile] = createSignal(null);
const [fileContent, setFileContent] = createSignal(null);
const [history, setHistory] = createSignal([]);
const [branches, setBranches] = createSignal([]);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal(null);
const [viewMode, setViewMode] = createSignal('files');
const [repoList, setRepoList] = createSignal([]);

// --- Helpers ---

function resolveRepoPath(repo) {
    // If repo has a full path, use it directly
    if (repo.path && (repo.path.startsWith('/') || repo.path.startsWith('~'))) {
        return repo.path;
    }
    // Otherwise, resolve relative to workspace repos dir
    return `/home/naranyala/.local/share/dotfiles-mgr/repos/${repo.name}`;
}

function getRepoName(repo) {
    if (repo.path) return repo.path;
    return repo.name;
}

// --- API ---

async function refreshRepoList() {
    try {
        const list = await rpc.call('repo.list');
        setRepoList(list || []);
    } catch (err) {
        console.error('Failed to refresh repo list:', err);
    }
}

async function syncWorkspace() {
    const ws = activeWorkspace();
    if (!ws) return;

    // Tell backend which directory to use for repos
    // Find the common parent directory of all repos
    const localRepos = (ws.groups || [])
        .flatMap(g => g.repos || [])
        .filter(r => r.type === 'local' && r.path);

    if (localRepos.length > 0) {
        // Get parent dir of first repo as base
        const firstPath = localRepos[0].path;
        let parentDir = firstPath.substring(0, firstPath.lastIndexOf('/'));

        // For workspace with repos in subdirectories, use the common ancestor
        // Example: /path/examples/repos/basic-commits -> /path/examples/repos
        if (localRepos.every(r => r.path.startsWith(parentDir))) {
            // All repos share this parent, use it
        } else {
            // Find common ancestor
            const parts = firstPath.split('/');
            for (let i = parts.length - 1; i > 0; i--) {
                const candidate = parts.slice(0, i).join('/');
                if (localRepos.every(r => r.path.startsWith(candidate + '/'))) {
                    parentDir = candidate;
                    break;
                }
            }
        }

        try {
            await rpc.call('repo.set_workspace', parentDir);
        } catch (err) {
            console.error('Failed to set workspace:', err);
        }
    }

    await refreshRepoList();
}

async function selectRepo(repo) {
    setSelectedRepo(repo);
    setSelectedFile(null);
    setFileContent(null);
    setViewMode('files');
    setLoading(true);
    setError(null);

    const repoName = getRepoName(repo);

    try {
        const [info, tree, hist, br] = await Promise.all([
            rpc.call('repo.info', repoName).catch(() => null),
            rpc.call('repo.tree', repoName).catch(() => []),
            rpc.call('repo.history', repoName).catch(() => []),
            rpc.call('repo.branches', repoName).catch(() => [])
        ]);

        setRepoInfo(info || { name: repo.name, path: repo.path, type: repo.type });
        setFileTree(tree || []);
        setHistory(hist || []);
        setBranches(br || []);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
}

async function openFile(path) {
    const repo = selectedRepo();
    if (!repo) return;

    setLoading(true);
    setError(null);
    try {
        const repoName = getRepoName(repo);
        const result = await rpc.call('repo.file', repoName, path);
        setSelectedFile(path);
        setFileContent(result);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
}

async function cloneRepo(url) {
    setLoading(true);
    setError(null);
    try {
        await rpc.call('repo.clone', url);
        await refreshRepoList();
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
}

// --- Listen for workspace changes ---

eventBus.on('workspace.changed', async () => {
    setSelectedRepo(null);
    setFileTree([]);
    setHistory([]);
    setBranches([]);
    setSelectedFile(null);
    setFileContent(null);
    await syncWorkspace();
});

window.addEventListener('repos-changed', async () => {
    await refreshRepoList();
});

// --- Components ---

class RepoSidebar extends ReactiveElement {
    #expandedGroups = new Set();

    render() {
        const current = selectedRepo();
        const ws = activeWorkspace();
        const groups = ws?.groups || [];
        const backendRepos = repoList() || [];

        // Build flat list from workspace config groups
        const items = [];
        for (const group of groups) {
            const isExpanded = this.#expandedGroups.has(group.id);
            items.push({ type: 'group', id: group.id, name: group.name, expanded: isExpanded, count: (group.repos || []).length });
            if (isExpanded) {
                for (const repo of (group.repos || [])) {
                    // Try to find matching backend repo for branch info
                    const backendRepo = backendRepos.find(r => r.path === repo.path || r.name === repo.name);
                    items.push({ type: 'repo', ...repo, branch: backendRepo?.branch });
                }
            }
        }

        return html`
            <style>
                :host { display: block; overflow-y: auto; height: 100%; }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid #2a2a35;
                }
                .title { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .btn-refresh {
                    padding: 3px 8px;
                    background: #333;
                    border: none;
                    border-radius: 4px;
                    color: #888;
                    cursor: pointer;
                    font-size: 11px;
                }
                .btn-refresh:hover { background: #444; color: #fff; }
                .tree-item {
                    display: flex;
                    align-items: center;
                    padding: 5px 12px;
                    cursor: pointer;
                    transition: background 0.15s;
                    gap: 6px;
                }
                .tree-item:hover { background: #2a2a35; }
                .tree-item.active { background: #1e3a1e; border-left: 2px solid #4CAF50; }
                .tree-icon {
                    width: 14px;
                    text-align: center;
                    font-size: 10px;
                    color: #888;
                    flex-shrink: 0;
                }
                .tree-icon.folder { color: #666; }
                .tree-icon.local { color: #4CAF50; }
                .tree-icon.remote { color: #5C6BC0; }
                .tree-label {
                    font-size: 12px;
                    color: #e0e0e0;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .tree-label.folder { color: #aaa; font-weight: 500; font-size: 11px; letter-spacing: 0.5px; }
                .tree-count { font-size: 10px; color: #555; }
                .tree-branch { font-size: 9px; color: #5C6BC0; margin-left: auto; }
                .empty { color: #555; font-size: 11px; padding: 20px; text-align: center; }
            </style>
            <div class="header">
                <span class="title">Repos</span>
                <button class="btn-refresh" id="btn-refresh">Refresh</button>
            </div>
            ${items.length === 0 ? html`<div class="empty">No repos in workspace</div>` : ''}
            ${items.map(item => {
                if (item.type === 'group') {
                    return html`
                        <div class="tree-item" data-group="${item.id}">
                            <span class="tree-icon folder">${item.expanded ? '-' : '+'}</span>
                            <span class="tree-label folder">${item.name}</span>
                            <span class="tree-count">${item.count}</span>
                        </div>
                    `;
                } else {
                    return html`
                        <div class="tree-item ${item.path === current?.path ? 'active' : ''}"
                             data-path="${item.path}" style="padding-left: 24px;">
                            <span class="tree-icon ${item.type}">${item.type === 'local' ? '.' : '>'}</span>
                            <span class="tree-label">${item.name}</span>
                            ${item.branch ? html`<span class="tree-branch">${item.branch}</span>` : ''}
                        </div>
                    `;
                }
            }).join('')}
        `;
    }

    setupEvents() {
        // Group toggle
        this.root.querySelectorAll('[data-group]').forEach(el => {
            el.addEventListener('click', () => {
                const groupId = el.dataset.group;
                if (this.#expandedGroups.has(groupId)) {
                    this.#expandedGroups.delete(groupId);
                } else {
                    this.#expandedGroups.add(groupId);
                }
                this.requestUpdate();
            });
        });

        // Repo click - find from workspace config
        this.root.querySelectorAll('[data-path]').forEach(el => {
            el.addEventListener('click', () => {
                const ws = activeWorkspace();
                const allRepos = (ws?.groups || []).flatMap(g => g.repos || []);
                const repo = allRepos.find(r => r.path === el.dataset.path);
                if (repo) selectRepo(repo);
            });
        });

        // Refresh
        this.root.querySelector('#btn-refresh')?.addEventListener('click', () => {
            refreshRepoList();
        });
    }
}

class FileTree extends ReactiveElement {
    render() {
        const tree = fileTree();
        const current = selectedFile();

        return html`
            <style>
                :host { display: block; }
                .file-item {
                    display: flex;
                    align-items: center;
                    padding: 6px 12px;
                    cursor: pointer;
                    transition: background 0.15s;
                    gap: 8px;
                }
                .file-item:hover { background: #2a2a35; }
                .file-item.active { background: #1e3a1e; }
                .file-icon { width: 16px; text-align: center; font-size: 11px; color: #888; }
                .file-icon.dir { color: #5C6BC0; }
                .file-name { font-size: 13px; color: #e0e0e0; font-family: monospace; }
                .empty { color: #555; font-size: 12px; padding: 16px; text-align: center; }
            </style>
            ${tree.length === 0 ? html`<div class="empty">No files</div>` : ''}
            ${tree.map(f => html`
                <div class="file-item ${f.name === current ? 'active' : ''}" data-name="${f.name}" data-type="${f.type}">
                    <span class="file-icon ${f.type}">${f.type === 'dir' ? '/' : '.'}</span>
                    <span class="file-name">${f.name}</span>
                </div>
            `).join('')}
        `;
    }

    setupEvents() {
        this.root.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.type === 'file') {
                    openFile(item.dataset.name);
                }
            });
        });
    }
}

class FileViewer extends ReactiveElement {
    render() {
        const content = fileContent();
        const file = selectedFile();

        if (!file) {
            return html`
                <style>
                    :host { display: flex; align-items: center; justify-content: center; height: 100%; }
                    .empty { color: #555; font-size: 13px; }
                </style>
                <div class="empty">Select a file to view</div>
            `;
        }

        const lines = (content?.content || '').split('\n');

        return html`
            <style>
                :host { display: flex; flex-direction: column; height: 100%; }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 16px;
                    background: #1a1a24;
                    border-bottom: 1px solid #2a2a35;
                }
                .filename { font-family: monospace; font-size: 13px; color: #e0e0e0; }
                .meta { font-size: 12px; color: #666; }
                .code { padding: 16px; overflow: auto; flex: 1; background: #121218; }
                .line { display: flex; font-family: monospace; font-size: 13px; line-height: 1.6; }
                .line-num { color: #444; width: 48px; text-align: right; padding-right: 16px; user-select: none; flex-shrink: 0; }
                .line-content { color: #e0e0e0; white-space: pre; }
            </style>
            <div class="header">
                <span class="filename">${file}</span>
                <span class="meta">${content?.size || 0} bytes</span>
            </div>
            <div class="code">
                ${lines.map((line, i) => html`
                    <div class="line">
                        <span class="line-num">${i + 1}</span>
                        <span class="line-content">${line}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

class HistoryView extends ReactiveElement {
    render() {
        const commits = history();
        return html`
            <style>
                :host { display: block; }
                .commit { padding: 12px 16px; border-bottom: 1px solid #2a2a35; }
                .commit:last-child { border-bottom: none; }
                .commit-msg { font-size: 14px; color: #e0e0e0; margin-bottom: 4px; }
                .commit-meta { font-size: 12px; color: #666; display: flex; gap: 12px; }
                .commit-id { font-family: monospace; color: #5C6BC0; }
                .empty { color: #555; font-size: 13px; padding: 20px; text-align: center; }
            </style>
            ${commits.length === 0 ? html`<div class="empty">No commits</div>` : ''}
            ${commits.map(c => html`
                <div class="commit">
                    <div class="commit-msg">${c.message}</div>
                    <div class="commit-meta">
                        <span class="commit-id">${c.id?.slice(0, 7)}</span>
                        <span>${c.author}</span>
                    </div>
                </div>
            `).join('')}
        `;
    }
}

class BranchList extends ReactiveElement {
    render() {
        const list = branches();
        return html`
            <style>
                :host { display: block; }
                .branch-item {
                    display: flex;
                    align-items: center;
                    padding: 10px 16px;
                    border-radius: 4px;
                    margin: 2px 8px;
                }
                .branch-item.current { background: #1e3a1e; }
                .branch-name { font-family: monospace; font-size: 13px; color: #e0e0e0; }
                .branch-badge { margin-left: 8px; font-size: 10px; padding: 2px 6px; background: #4CAF50; color: #fff; border-radius: 3px; }
                .empty { color: #555; font-size: 13px; padding: 20px; text-align: center; }
            </style>
            ${list.length === 0 ? html`<div class="empty">No branches</div>` : ''}
            ${list.map(b => html`
                <div class="branch-item ${b.current ? 'current' : ''}">
                    <span class="branch-name">${b.name}</span>
                    ${b.current ? html`<span class="branch-badge">HEAD</span>` : ''}
                </div>
            `).join('')}
        `;
    }
}

class RepoBrowser extends ReactiveElement {
    render() {
        const repo = selectedRepo();
        const mode = viewMode();
        const isLoading = loading();
        const err = error();

        if (!repo) {
            return html`
                <style>
                    :host { display: flex; align-items: center; justify-content: center; height: 100%; }
                    .empty { color: #555; text-align: center; }
                    .empty h2 { font-size: 18px; color: #666; margin-bottom: 8px; }
                    .empty p { font-size: 13px; }
                </style>
                <div class="empty">
                    <h2>Select a Repository</h2>
                    <p>Choose a repo from the sidebar to view its contents</p>
                </div>
            `;
        }

        return html`
            <style>
                :host { display: flex; flex-direction: column; height: 100%; }
                .toolbar {
                    display: flex;
                    align-items: center;
                    padding: 6px 12px;
                    background: #1a1a24;
                    border-bottom: 1px solid #2a2a35;
                    gap: 8px;
                }
                .toolbar-title { font-size: 13px; font-weight: 600; color: #e0e0e0; margin-right: auto; }
                .tab {
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    color: #888;
                    transition: all 0.15s;
                }
                .tab:hover { color: #ccc; background: #2a2a35; }
                .tab.active { color: #4CAF50; background: #1e3a1e; }
                .content { flex: 1; overflow: hidden; display: flex; }
                .loading { padding: 20px; color: #666; text-align: center; width: 100%; }
                .error { padding: 16px; color: #e74c3c; background: #2d1b1b; margin: 16px; border-radius: 8px; width: 100%; }
            </style>
            <div class="toolbar">
                <span class="toolbar-title">${repo.name}</span>
                <span style="font-size: 11px; color: #666;">${repo.type}</span>
                <div class="tab ${mode === 'files' ? 'active' : ''}" data-mode="files">Files</div>
                <div class="tab ${mode === 'history' ? 'active' : ''}" data-mode="history">History</div>
                <div class="tab ${mode === 'branches' ? 'active' : ''}" data-mode="branches">Branches</div>
            </div>
            <div class="content">
                ${isLoading ? html`<div class="loading">Loading...</div>` : ''}
                ${err ? html`<div class="error">${err}</div>` : ''}
                ${!isLoading && !err ? html`
                    ${mode === 'files' ? html`
                        <div style="width: 220px; border-right: 1px solid #2a2a35; overflow-y: auto;">
                            <repo-file-tree></repo-file-tree>
                        </div>
                        <div style="flex: 1; overflow: hidden;">
                            <repo-file-viewer></repo-file-viewer>
                        </div>
                    ` : ''}
                    ${mode === 'history' ? html`<repo-history style="flex: 1; overflow-y: auto;"></repo-history>` : ''}
                    ${mode === 'branches' ? html`<repo-branches style="flex: 1; overflow-y: auto;"></repo-branches>` : ''}
                ` : ''}
            </div>
        `;
    }

    setupEvents() {
        this.root.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => setViewMode(tab.dataset.mode));
        });
    }
}

// Register elements
customElements.define('repo-sidebar', RepoSidebar);
customElements.define('repo-file-tree', FileTree);
customElements.define('repo-file-viewer', FileViewer);
customElements.define('repo-history', HistoryView);
customElements.define('repo-branches', BranchList);
customElements.define('repo-viewer', RepoBrowser);

// Init: sync with backend on load
syncWorkspace();
