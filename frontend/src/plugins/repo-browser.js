import { createSignal } from '../framework/signals.js';
import { ReactiveElement } from '../framework/component.js';
import { html } from '../framework/template.js';
import { PluginManager } from '../core/plugin-system.js';
import '../core/rpc.js';
import * as monaco from 'monaco-editor';

self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        return './editor.worker.js';
    }
};
// --- State ---

const [repoList, setRepoList] = createSignal([]);
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
const [showCloneModal, setShowCloneModal] = createSignal(false);
const [cloning, setCloning] = createSignal(false);

// --- API ---

async function fetchRepos() {
    try {
        const repos = await rpc.repo.list();
        setRepoList(repos || []);
    } catch (err) {
        console.error('Failed to fetch repos:', err);
    }
}

async function cloneRepo(url) {
    setCloning(true);
    setError(null);
    try {
        await rpc.repo.clone(url);
        await fetchRepos();
        setShowCloneModal(false);
    } catch (err) {
        setError(err?.error || err?.message || 'Clone failed');
    } finally {
        setCloning(false);
    }
}

async function selectRepo(repo) {
    setSelectedRepo(repo);
    setSelectedFile(null);
    setFileContent(null);
    setViewMode('files');
    setLoading(true);
    setError(null);
    try {
        const [info, tree, hist, br] = await Promise.all([
            rpc.repo.info(repo.path).catch(() => null),
            rpc.repo.tree(repo.path).catch(() => []),
            rpc.repo.history(repo.path).catch(() => []),
            rpc.repo.branches(repo.path).catch(() => []),
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
        const result = await rpc.repo.file(repo.path, path);
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
        const isCloning = cloning();

        return html`
            <style>
                :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid #2a2a35;
                    font-size: 11px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    flex-shrink: 0;
                }
                .header-right { display: flex; gap: 4px; align-items: center; }
                .btn-icon {
                    width: 20px;
                    height: 20px;
                    border: none;
                    background: #333;
                    color: #888;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .btn-icon:hover { background: #444; color: #fff; }
                .repo-list { flex: 1; overflow-y: auto; }
                .repo-item {
                    display: flex; align-items: center; padding: 5px 12px; cursor: pointer;
                    transition: background 0.15s; gap: 8px;
                }
                .repo-item:hover { background: #2a2a35; }
                .repo-item.active { background: #1e3a1e; border-left: 2px solid #4CAF50; }
                .icon { width: 14px; text-align: center; font-size: 11px; color: #4CAF50; flex-shrink: 0; }
                .name { font-size: 12px; color: #e0e0e0; font-family: monospace; }
                .empty { color: #555; font-size: 11px; padding: 20px; text-align: center; }
            </style>
            <div class="header">
                <span>Repos (${repos.length})</span>
                <div class="header-right">
                    <button class="btn-icon" id="btn-refresh" title="Refresh">&#x21bb;</button>
                    <button class="btn-icon" id="btn-clone" title="Clone repo">+</button>
                </div>
            </div>
            <div class="repo-list">
                ${repos.length === 0 ? html`<div class="empty">No repos found</div>` : ''}
                ${repos.map(r => html`
                    <div class="repo-item ${r.path === current?.path ? 'active' : ''}" data-path="${r.path}">
                        <span class="icon">&#x2022;</span>
                        <span class="name">${r.name}</span>
                    </div>
                `)}
            </div>
            <clone-modal></clone-modal>
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

        this.root.querySelector('#btn-clone')?.addEventListener('click', () => {
            setShowCloneModal(true);
        });

        this.root.querySelector('#btn-refresh')?.addEventListener('click', () => {
            fetchRepos();
        });
    }
}

class CloneModal extends ReactiveElement {
    render() {
        if (!showCloneModal()) return html``;
        const isCloning = cloning();
        const err = error();

        return html`
            <style>
                :host {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 200;
                }
                .modal {
                    background: #1e1e2e;
                    border-radius: 12px;
                    padding: 24px;
                    width: 400px;
                    max-width: 90vw;
                }
                .modal-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #fff;
                    margin-bottom: 8px;
                }
                .modal-desc {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 16px;
                }
                .input {
                    width: 100%;
                    padding: 10px 12px;
                    background: #2a2a35;
                    border: 1px solid #333;
                    border-radius: 6px;
                    color: #e0e0e0;
                    font-size: 14px;
                    font-family: monospace;
                    outline: none;
                    margin-bottom: 12px;
                    box-sizing: border-box;
                }
                .input:focus { border-color: #4CAF50; }
                .input:disabled { opacity: 0.5; }
                .error-msg {
                    font-size: 12px;
                    color: #e74c3c;
                    margin-bottom: 12px;
                    padding: 8px;
                    background: #2d1b1b;
                    border-radius: 4px;
                }
                .actions { display: flex; gap: 8px; justify-content: flex-end; }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                }
                .btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-cancel { background: #333; color: #ccc; }
                .btn-cancel:hover:not(:disabled) { background: #444; }
                .btn-clone { background: #4CAF50; color: #fff; }
                .btn-clone:hover:not(:disabled) { background: #43A047; }
                .spinner {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border: 2px solid #fff;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    margin-right: 6px;
                    vertical-align: middle;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
            <div class="modal">
                <div class="modal-title">Clone Repository</div>
                <div class="modal-desc">Enter a git repository URL to clone into the current workspace</div>
                ${err ? html`<div class="error-msg">${err}</div>` : ''}
                <input
                    class="input"
                    placeholder="https://github.com/user/repo.git"
                    id="clone-url"
                    autofocus
                    ${isCloning ? 'disabled' : ''}
                />
                <div class="actions">
                    <button class="btn btn-cancel" id="btn-cancel" ${isCloning ? 'disabled' : ''}>Cancel</button>
                    <button class="btn btn-clone" id="btn-do-clone" ${isCloning ? 'disabled' : ''}>
                        ${isCloning ? html`<span class="spinner"></span>Cloning...` : 'Clone'}
                    </button>
                </div>
            </div>
        `;
    }

    setupEvents() {
        this.root.querySelector('#btn-cancel')?.addEventListener('click', () => {
            setShowCloneModal(false);
        });

        this.root.querySelector('#btn-do-clone')?.addEventListener('click', () => {
            const url = this.root.querySelector('#clone-url')?.value?.trim();
            if (url) cloneRepo(url);
        });

        this.root.querySelector('#clone-url')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const url = e.target.value?.trim();
                if (url) cloneRepo(url);
            }
            if (e.key === 'Escape') {
                setShowCloneModal(false);
            }
        });
    }
}

class FileTree extends ReactiveElement {
    render() {
        const tree = fileTree();
        const current = selectedFile();
        console.log('FileTree render, tree:', tree);
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
            `)}
        `;
    }
    setupEvents() {
        this.root.querySelectorAll('.item').forEach(el => {
            el.addEventListener('click', () => { if (el.dataset.type === 'file') openFile(el.dataset.name); });
        });
    }
}

class FileViewer extends ReactiveElement {
    #editor = null;

    render() {
        return html`
            <style>
                :host { display: flex; flex-direction: column; height: 100%; position: relative; }
                .hdr { display: flex; justify-content: space-between; padding: 6px 12px; background: #1a1a24; border-bottom: 1px solid #2a2a35; }
                .fn { font-family: monospace; font-size: 12px; color: #e0e0e0; }
                .meta { font-size: 11px; color: #666; }
                .code { flex: 1; overflow: hidden; background: #121218; }
                .e { position: absolute; inset: 0; background: #121218; display: flex; align-items: center; justify-content: center; color: #555; font-size: 13px; z-index: 10; }
            </style>
            ${() => {
                const file = selectedFile();
                const content = fileContent();
                if (!file) return html`<div class="e">Select a file to view</div>`;
                return html`<div class="hdr"><span class="fn">${file}</span><span class="meta">${content?.size || 0} bytes</span></div>`;
            }}
            <div class="code" id="editor-container"></div>
        `;
    }

    setupEvents() {
        const container = this.root.querySelector('#editor-container');
        if (!this.#editor && container) {
            this.#editor = monaco.editor.create(container, {
                value: '',
                theme: 'vs-dark',
                readOnly: true,
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fixedOverflowWidgets: true
            });
            
            // Effect to update editor content when fileContent changes
            createEffect(() => {
                const content = fileContent();
                if (this.#editor && content) {
                    this.#editor.setValue(content.content || '');
                    // Basic language detection based on extension
                    const ext = (content.path || '').split('.').pop();
                    const langMap = { js: 'javascript', ts: 'typescript', html: 'html', css: 'css', json: 'json', md: 'markdown', c3: 'c' };
                    monaco.editor.setModelLanguage(this.#editor.getModel(), langMap[ext] || 'plaintext');
                } else if (this.#editor) {
                    this.#editor.setValue('');
                }
            });
        }
    }

    onUnmount() {
        if (this.#editor) {
            this.#editor.dispose();
            this.#editor = null;
        }
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
            `)}
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
            `)}
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
            <div class="e"><h2>Select a Repository</h2><p>Choose from the sidebar or clone a new one</p></div>
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
customElements.define('clone-modal', CloneModal);
customElements.define('repo-file-tree', FileTree);
customElements.define('repo-file-viewer', FileViewer);
customElements.define('repo-history', HistoryView);
customElements.define('repo-branches', BranchList);
customElements.define('repo-viewer', RepoViewer);

PluginManager.register('Repos', { name: 'Repos', render: () => html`<repo-viewer style="height:100%;display:flex"></repo-viewer>` });

// Init: fetch repos on load
fetchRepos();
