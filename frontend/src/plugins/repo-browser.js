import { createSignal } from '../framework/signals.js';
import { ReactiveElement } from '../framework/component.js';
import { html } from '../framework/template.js';
import { PluginManager } from '../core/plugin-system.js';
import '../core/rpc.js';

// --- All repos from ./examples/repos ---

const ALL_REPOS = [
    { name: 'basic-commits', path: './examples/repos/basic-commits', type: 'local' },
    { name: 'initial-commit-only', path: './examples/repos/initial-commit-only', type: 'local' },
    { name: 'empty-repo', path: './examples/repos/empty-repo', type: 'local' },
    { name: 'multiple-branches', path: './examples/repos/multiple-branches', type: 'local' },
    { name: 'merge-conflicts', path: './examples/repos/merge-conflicts', type: 'local' },
    { name: 'rebase-history', path: './examples/repos/rebase-history', type: 'local' },
    { name: 'complex-history', path: './examples/repos/complex-history', type: 'local' },
    { name: 'orphan-branches', path: './examples/repos/orphan-branches', type: 'local' },
    { name: 'tags-releases', path: './examples/repos/tags-releases', type: 'local' },
    { name: 'cherry-pick-history', path: './examples/repos/cherry-pick-history', type: 'local' },
    { name: 'detached-head', path: './examples/repos/detached-head', type: 'local' },
    { name: 'submodule-repo', path: './examples/repos/submodule-repo', type: 'local' },
    { name: 'bare-repo.git', path: './examples/repos/bare-repo.git', type: 'local' },
    { name: 'shallow-clone', path: './examples/repos/shallow-clone', type: 'local' },
    { name: 'gitignore-patterns', path: './examples/repos/gitignore-patterns', type: 'local' },
    { name: 'large-files', path: './examples/repos/large-files', type: 'local' },
    { name: 'nested-dirs', path: './examples/repos/nested-dirs', type: 'local' },
    { name: 'signed-commits', path: './examples/repos/signed-commits', type: 'local' },
    { name: 'worktree-demo', path: './examples/repos/worktree-demo', type: 'local' },
    { name: 'dotfiles-collection', path: './examples/repos/dotfiles-collection', type: 'local' },
];

// --- State ---

const [repoList, setRepoList] = createSignal(ALL_REPOS);
const [selectedRepo, setSelectedRepo] = createSignal(null);
const [repoInfo, setRepoInfo] = createSignal(null);
const [fileTree, setFileTree] = createSignal([]);
const [selectedFile, setSelectedFile] = createSignal(null);
const [fileContent, setFileContent] = createSignal(null);
const [history, setHistory] = createSignal([]);
const [branches, setBranches] = createSignal([]);
const [viewMode, setViewMode] = createSignal('files');
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal(null);

// --- API ---

async function selectRepo(repo) {
    setSelectedRepo(repo);
    setSelectedFile(null);
    setFileContent(null);
    setViewMode('files');
    setLoading(true);
    setError(null);
    try {
        const [info, tree, hist, br] = await Promise.all([
            rpc.call('repo.info', repo.path).catch(() => null),
            rpc.call('repo.tree', repo.path).catch(() => []),
            rpc.call('repo.history', repo.path).catch(() => []),
            rpc.call('repo.branches', repo.path).catch(() => []),
        ]);
        setRepoInfo(info || { name: repo.name, path: repo.path });
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
        const result = await rpc.call('repo.file', repo.path, path);
        setSelectedFile(path);
        setFileContent(result);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
}

// --- Components ---

class RepoSidebar extends ReactiveElement {
    render() {
        const current = selectedRepo();
        const repos = repoList();

        return html`
            <style>
                :host { display: block; overflow-y: auto; height: 100%; }
                .header { padding: 8px 12px; border-bottom: 1px solid #2a2a35; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .repo-item {
                    display: flex; align-items: center; padding: 5px 12px; cursor: pointer;
                    transition: background 0.15s; gap: 8px;
                }
                .repo-item:hover { background: #2a2a35; }
                .repo-item.active { background: #1e3a1e; border-left: 2px solid #4CAF50; }
                .icon { width: 14px; text-align: center; font-size: 11px; color: #4CAF50; flex-shrink: 0; }
                .name { font-size: 12px; color: #e0e0e0; font-family: monospace; }
            </style>
            <div class="header">Repos (${repos.length})</div>
            ${repos.map(r => html`
                <div class="repo-item ${r.path === current?.path ? 'active' : ''}" data-path="${r.path}">
                    <span class="icon">.</span>
                    <span class="name">${r.name}</span>
                </div>
            `).join('')}
        `;
    }

    setupEvents() {
        this.root.querySelectorAll('.repo-item').forEach(el => {
            el.addEventListener('click', () => {
                const repos = repoList();
                const repo = repos.find(r => r.path === el.dataset.path);
                if (repo) selectRepo(repo);
            });
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
                .item { display: flex; align-items: center; padding: 4px 12px; cursor: pointer; gap: 6px; }
                .item:hover { background: #2a2a35; }
                .item.active { background: #1e3a1e; }
                .icon { width: 14px; text-align: center; font-size: 10px; color: #888; }
                .icon.dir { color: #5C6BC0; }
                .name { font-size: 12px; color: #e0e0e0; font-family: monospace; }
                .empty { color: #555; font-size: 11px; padding: 16px; text-align: center; }
            </style>
            ${tree.length === 0 ? html`<div class="empty">No files</div>` : ''}
            ${tree.map(f => html`
                <div class="item ${f.name === current ? 'active' : ''}" data-name="${f.name}" data-type="${f.type}">
                    <span class="icon ${f.type}">${f.type === 'dir' ? '/' : '.'}</span>
                    <span class="name">${f.name}</span>
                </div>
            `).join('')}
        `;
    }
    setupEvents() {
        this.root.querySelectorAll('.item').forEach(el => {
            el.addEventListener('click', () => { if (el.dataset.type === 'file') openFile(el.dataset.name); });
        });
    }
}

class FileViewer extends ReactiveElement {
    render() {
        const content = fileContent();
        const file = selectedFile();
        if (!file) return html`<style>:host{display:flex;align-items:center;justify-content:center;height:100%}.e{color:#555;font-size:13px}</style><div class="e">Select a file to view</div>`;
        const lines = (content?.content || '').split('\n');
        return html`
            <style>
                :host { display: flex; flex-direction: column; height: 100%; }
                .hdr { display: flex; justify-content: space-between; padding: 6px 12px; background: #1a1a24; border-bottom: 1px solid #2a2a35; }
                .fn { font-family: monospace; font-size: 12px; color: #e0e0e0; }
                .meta { font-size: 11px; color: #666; }
                .code { padding: 12px; overflow: auto; flex: 1; background: #121218; }
                .line { display: flex; font-family: monospace; font-size: 12px; line-height: 1.6; }
                .ln { color: #444; width: 40px; text-align: right; padding-right: 12px; user-select: none; flex-shrink: 0; }
                .lc { color: #e0e0e0; white-space: pre; }
            </style>
            <div class="hdr"><span class="fn">${file}</span><span class="meta">${content?.size || 0} bytes</span></div>
            <div class="code">${lines.map((l, i) => html`<div class="line"><span class="ln">${i + 1}</span><span class="lc">${l}</span></div>`).join('')}</div>
        `;
    }
}

class HistoryView extends ReactiveElement {
    render() {
        const commits = history();
        return html`
            <style>
                :host { display: block; }
                .commit { padding: 10px 16px; border-bottom: 1px solid #2a2a35; }
                .msg { font-size: 13px; color: #e0e0e0; margin-bottom: 3px; }
                .meta { font-size: 11px; color: #666; display: flex; gap: 10px; }
                .id { font-family: monospace; color: #5C6BC0; }
                .empty { color: #555; font-size: 12px; padding: 20px; text-align: center; }
            </style>
            ${commits.length === 0 ? html`<div class="empty">No commits</div>` : ''}
            ${commits.map(c => html`
                <div class="commit">
                    <div class="msg">${c.message}</div>
                    <div class="meta"><span class="id">${c.id?.slice(0, 7)}</span><span>${c.author}</span></div>
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
                .item { display: flex; align-items: center; padding: 8px 16px; margin: 2px 8px; border-radius: 4px; }
                .item.current { background: #1e3a1e; }
                .name { font-family: monospace; font-size: 12px; color: #e0e0e0; }
                .badge { margin-left: 8px; font-size: 9px; padding: 2px 6px; background: #4CAF50; color: #fff; border-radius: 3px; }
                .empty { color: #555; font-size: 12px; padding: 20px; text-align: center; }
            </style>
            ${list.length === 0 ? html`<div class="empty">No branches</div>` : ''}
            ${list.map(b => html`
                <div class="item ${b.current ? 'current' : ''}">
                    <span class="name">${b.name}</span>
                    ${b.current ? html`<span class="badge">HEAD</span>` : ''}
                </div>
            `).join('')}
        `;
    }
}

class RepoViewer extends ReactiveElement {
    render() {
        const repo = selectedRepo();
        const mode = viewMode();
        const isLoading = loading();
        const err = error();
        if (!repo) return html`
            <style>:host{display:flex;align-items:center;justify-content:center;height:100%}.e{color:#555;text-align:center}.e h2{font-size:18px;color:#666;margin-bottom:8px}.e p{font-size:13px}</style>
            <div class="e"><h2>Select a Repository</h2><p>Choose from the sidebar</p></div>
        `;
        return html`
            <style>
                :host { display: flex; flex-direction: column; height: 100%; }
                .toolbar { display: flex; align-items: center; padding: 6px 12px; background: #1a1a24; border-bottom: 1px solid #2a2a35; gap: 8px; }
                .title { font-size: 13px; font-weight: 600; color: #e0e0e0; margin-right: auto; }
                .tab { padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; color: #888; }
                .tab:hover { color: #ccc; background: #2a2a35; }
                .tab.active { color: #4CAF50; background: #1e3a1e; }
                .content { flex: 1; overflow: hidden; display: flex; }
                .loading { padding: 20px; color: #666; text-align: center; width: 100%; }
                .error { padding: 16px; color: #e74c3c; background: #2d1b1b; margin: 16px; border-radius: 8px; width: 100%; }
            </style>
            <div class="toolbar">
                <span class="title">${repo.name}</span>
                <div class="tab ${mode === 'files' ? 'active' : ''}" data-mode="files">Files</div>
                <div class="tab ${mode === 'history' ? 'active' : ''}" data-mode="history">History</div>
                <div class="tab ${mode === 'branches' ? 'active' : ''}" data-mode="branches">Branches</div>
            </div>
            <div class="content">
                ${isLoading ? html`<div class="loading">Loading...</div>` : ''}
                ${err ? html`<div class="error">${err}</div>` : ''}
                ${!isLoading && !err ? html`
                    ${mode === 'files' ? html`
                        <div style="width:200px;border-right:1px solid #2a2a35;overflow-y:auto"><repo-file-tree></repo-file-tree></div>
                        <div style="flex:1;overflow:hidden"><repo-file-viewer></repo-file-viewer></div>
                    ` : ''}
                    ${mode === 'history' ? html`<repo-history style="flex:1;overflow-y:auto"></repo-history>` : ''}
                    ${mode === 'branches' ? html`<repo-branches style="flex:1;overflow-y:auto"></repo-branches>` : ''}
                ` : ''}
            </div>
        `;
    }
    setupEvents() {
        this.root.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setViewMode(t.dataset.mode)));
    }
}

customElements.define('repo-sidebar', RepoSidebar);
customElements.define('repo-file-tree', FileTree);
customElements.define('repo-file-viewer', FileViewer);
customElements.define('repo-history', HistoryView);
customElements.define('repo-branches', BranchList);
customElements.define('repo-viewer', RepoViewer);

PluginManager.register('Repos', { name: 'Repos', render: () => html`<repo-viewer style="height:100%;display:flex"></repo-viewer>` });
