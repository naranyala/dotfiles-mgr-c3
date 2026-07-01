import { createSignal, createEffect, batch } from '../framework/signals.js';
import { SignalElement } from '../framework/component.js';
import { html } from '../framework/template.js';
import { For, Show } from '../framework/flow.js';
import { PluginManager, eventBus } from '../core/plugin-system.js';
import '../core/rpc.js';
import hljs from 'highlight.js';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';

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
const [renderer, setRenderer] = createSignal('highlightjs');

let shikiLoading = false;
async function ensureShiki() {
    if (window.__shiki?.ready()) return;
    if (shikiLoading) return new Promise(r => { const c = setInterval(() => { if (window.__shiki?.ready()) { clearInterval(c); r(); } }, 50); });
    shikiLoading = true;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = './shiki.js';
        s.onload = () => window.__shiki?.init?.then?.(() => resolve()).catch(reject) || resolve();
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

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

class RepoSidebar extends SignalElement {
    render() {
        return html`
            <style>
                :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
                .header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 8px 12px; border-bottom: 1px solid #2a2a35;
                    font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 0;
                }
                .header-right { display: flex; gap: 4px; align-items: center; }
                .btn-icon {
                    width: 20px; height: 20px; border: none; background: #333; color: #888;
                    border-radius: 4px; cursor: pointer; font-size: 13px;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
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
                <span>Repos (${() => repoList().length})</span>
                <div class="header-right">
                    <button class="btn-icon" @click=${() => fetchRepos()} title="Refresh">&#x21bb;</button>
                    <button class="btn-icon" @click=${() => setShowCloneModal(true)} title="Clone repo">+</button>
                </div>
            </div>
            <div class="repo-list">
                ${Show({
                    when: () => repoList().length === 0,
                    children: () => html`<div class="empty">No repos found</div>`
                })}
                ${For({
                    each: repoList,
                    key: r => r.path,
                    render: r => html`
                        <div class="repo-item ${() => r.path === selectedRepo()?.path ? 'active' : ''}"
                             @click=${() => selectRepo(r)}>
                            <span class="icon">&#x2022;</span>
                            <span class="name">${r.name}</span>
                        </div>
                    `
                })}
            </div>
            <clone-modal></clone-modal>
        `;
    }
}

class CloneModal extends SignalElement {
    render() {
        return html`
            ${Show({
                when: showCloneModal,
                children: () => html`
            <style>
                :host {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6); display: flex; align-items: center;
                    justify-content: center; z-index: 200;
                }
                .modal { background: #1e1e2e; border-radius: 12px; padding: 24px; width: 400px; max-width: 90vw; }
                .modal-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px; }
                .modal-desc { font-size: 12px; color: #888; margin-bottom: 16px; }
                .input {
                    width: 100%; padding: 10px 12px; background: #2a2a35; border: 1px solid #333;
                    border-radius: 6px; color: #e0e0e0; font-size: 14px; font-family: monospace;
                    outline: none; margin-bottom: 12px; box-sizing: border-box;
                }
                .input:focus { border-color: #4CAF50; }
                .input:disabled { opacity: 0.5; }
                .error-msg { font-size: 12px; color: #e74c3c; margin-bottom: 12px; padding: 8px; background: #2d1b1b; border-radius: 4px; }
                .actions { display: flex; gap: 8px; justify-content: flex-end; }
                .btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
                .btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-cancel { background: #333; color: #ccc; }
                .btn-cancel:hover:not(:disabled) { background: #444; }
                .btn-clone { background: #4CAF50; color: #fff; }
                .btn-clone:hover:not(:disabled) { background: #43A047; }
                .spinner {
                    display: inline-block; width: 12px; height: 12px; border: 2px solid #fff;
                    border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;
                    margin-right: 6px; vertical-align: middle;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
            <div class="modal">
                <div class="modal-title">Clone Repository</div>
                <div class="modal-desc">Enter a git repository URL to clone into the current workspace</div>
                ${Show({ when: error, children: () => html`<div class="error-msg">${error()}</div>` })}
                <input class="input" placeholder="https://github.com/user/repo.git"
                       id="clone-url" autofocus ?disabled=${cloning} />
                <div class="actions">
                    <button class="btn btn-cancel" ?disabled=${cloning}
                            @click=${() => setShowCloneModal(false)}>Cancel</button>
                    <button class="btn btn-clone" ?disabled=${cloning}
                            @click=${() => { const url = this.$('#clone-url')?.value?.trim(); if (url) cloneRepo(url); }}>
                        ${Show({ when: cloning, fallback: 'Clone', children: () => html`<span class="spinner"></span>Cloning...` })}
                    </button>
                </div>
            </div>
                `
            })}
        `;
    }

    setupEvents() {
        this.$('#clone-url')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const url = e.target.value?.trim();
                if (url) cloneRepo(url);
            }
            if (e.key === 'Escape') setShowCloneModal(false);
        });
    }
}

class FileTree extends SignalElement {
    #expandedDirs = createSignal(new Set());
    #dirChildren = createSignal({});
    #loadingDirs = createSignal(new Set());
    #indent = 0;
    #treeEffect = null;

    static get observedAttributes() { return ['indent', 'path']; }
    get indent() { return parseInt(this.getAttribute('indent') || '0'); }
    get basePath() { return this.getAttribute('path') || ''; }

    onMount() {
        if (this.#treeEffect) this.#treeEffect();
        let first = true;
        this.#treeEffect = createEffect(() => {
            fileTree();
            this.#expandedDirs[1](new Set());
            this.#dirChildren[1]({});
            this.#loadingDirs[1](new Set());
            if (first) { first = false; return; }
            this.requestUpdate();
        });
    }

    onUnmount() {
        if (this.#treeEffect) this.#treeEffect();
        this.#treeEffect = null;
    }

    async #toggleDir(name, fullPath) {
        const expanded = this.#expandedDirs();
        const next = new Set(expanded);
        const children = this.#dirChildren();
        const loading = this.#loadingDirs();
        const nextLoading = new Set(loading);

        if (next.has(fullPath)) {
            next.delete(fullPath);
            this.#expandedDirs[1](next);
            return;
        }

        next.add(fullPath);
        this.#expandedDirs[1](next);

        if (children[fullPath]) return;

        nextLoading.add(fullPath);
        this.#loadingDirs[1](nextLoading);
        this.requestUpdate();

        try {
            const repo = selectedRepo();
            const tree = await rpc.repo.tree(repo.path, fullPath);
            const nextChildren = { ...this.#dirChildren(), [fullPath]: tree || [] };
            this.#dirChildren[1](nextChildren);
        } catch (err) {
            console.error('Failed to load directory:', err);
            const nextChildren = { ...this.#dirChildren(), [fullPath]: [] };
            this.#dirChildren[1](nextChildren);
        } finally {
            const l = this.#loadingDirs();
            const nl = new Set(l);
            nl.delete(fullPath);
            this.#loadingDirs[1](nl);
        }
    }

    #renderItems(items, indentLevel, parentPath, expanded, loading, dirChildren) {
        if (!items || items.length === 0) return html`<div class="empty">No files</div>`;

        const dirs = items.filter(i => i.type === 'dir');
        const files = items.filter(i => i.type === 'file');

        return [...dirs, ...files].map(item => {
            const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            const isDir = item.type === 'dir';
            const isExpanded = expanded.has(fullPath);
            const isLoading = loading.has(fullPath);
            const children = dirChildren[fullPath];

            return html`
                <div class="item" style="padding-left:${8 + indentLevel * 16}px"
                     @click=${() => isDir ? this.#toggleDir(item.name, fullPath) : openFile(fullPath)}>
                    <span class="icon ${isDir ? 'dir' : ''}">${isDir ? (isExpanded ? '▼' : '▶') : '·'}</span>
                    <span class="name">${item.name}</span>
                    ${isDir && isLoading ? html`<span class="loading-indicator">...</span>` : ''}
                </div>
                ${isDir && isExpanded ? html`<div class="children">
                    ${isLoading ? html`<div class="loading" style="padding-left:${24 + indentLevel * 16}px">Loading...</div>` : ''}
                    ${children ? this.#renderItems(children, indentLevel + 1, fullPath, expanded, loading, dirChildren) : ''}
                </div>` : ''}
            `;
        });
    }

    render() {
        const items = fileTree();
        const expanded = this.#expandedDirs();
        const loading = this.#loadingDirs();
        const children = this.#dirChildren();
        return html`
            <style>
                :host { display: block; }
                .item {
                    display: flex; align-items: center; padding: 4px 12px; cursor: pointer; gap: 6px;
                    transition: background 0.1s;
                }
                .item:hover { background: #2a2a35; }
                .item.active { background: #1e3a1e; }
                .icon { width: 14px; text-align: center; font-size: 10px; color: #888; flex-shrink: 0; }
                .icon.dir { color: #5C6BC0; }
                .name { font-size: 12px; color: #e0e0e0; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .empty { color: #555; font-size: 11px; padding: 16px; text-align: center; }
                .loading { color: #666; font-size: 11px; padding: 4px 12px; }
                .loading-indicator { color: #666; font-size: 10px; margin-left: 4px; }
                .children { }
            </style>
            ${items.length === 0 ? html`<div class="empty">No files</div>` : this.#renderItems(items, 0, '', expanded, loading, children)}
        `;
    }
}

function getLang(ext) {
    const map = { js: 'javascript', ts: 'typescript', html: 'html', css: 'css', json: 'json', md: 'markdown', c3: 'c' };
    return map[ext] || 'plaintext';
}

class FileViewer extends SignalElement {
    #wordWrap = false;

    render() {
        return html`
            <style>
                :host { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; }
                .toolbar {
                    display: flex; align-items: center; gap: 12px;
                    padding: 8px 16px; background: rgba(22, 22, 30, 0.95);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05); flex-shrink: 0; min-height: 40px;
                    z-index: 5;
                }
                .fn { 
                    font-family: 'Fira Code', 'Cascadia Code', monospace; 
                    font-size: 14px; color: #e0e0e0; 
                    margin-right: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                    font-weight: 500;
                    display: flex; align-items: center; gap: 8px;
                }
                .fn::before { content: '\\1F4C4'; font-size: 16px; }
                .lang-badge { display: flex; align-items: center; gap: 8px; }
                .lang { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 11px; padding: 4px 8px; background: rgba(255, 255, 255, 0.08); 
                    border-radius: 6px; color: #a6accd; text-transform: uppercase; font-weight: 600;
                }
                .badge { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 600;
                }
                .badge.ro { background: rgba(240, 113, 120, 0.15); color: #f07178; border: 1px solid rgba(240, 113, 120, 0.25); }
                .renderer-select {
                    background: rgba(0, 0, 0, 0.3); color: #a6accd; border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; outline: none;
                    font-weight: 500;
                }
                .renderer-select:hover { border-color: rgba(255, 255, 255, 0.2); }
                .renderer-select option { background: #1e1e2e; color: #e0e0e0; }
                .btn-group {
                    display: flex; gap: 4px; align-items: center;
                    background: rgba(0, 0, 0, 0.2); padding: 4px;
                    border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.03);
                }
                .toolbar .btn {
                    background: transparent; border: none; color: #a6accd; border-radius: 6px;
                    padding: 6px 12px; font-size: 12px; cursor: pointer;
                    display: flex; align-items: center; gap: 6px;
                    font-weight: 500;
                }
                .toolbar .btn:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
                .toolbar .btn.active { 
                    background: rgba(195, 232, 141, 0.15); color: #c3e88d;
                    box-shadow: inset 0 0 0 1px rgba(195, 232, 141, 0.3);
                }
                .code-wrap { flex: 1; overflow: auto; background: #1e1e1e; position: relative; }
                .code-wrap pre {
                    margin: 0; padding: 16px;
                    font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
                    font-size: 13px; line-height: 1.5;
                    white-space: pre; tab-size: 4;
                    min-height: 100%; box-sizing: border-box;
                }
                .code-wrap pre.wrap { white-space: pre-wrap; word-break: break-word; }
                .code-wrap .shiki { padding: 16px; margin: 0; background: transparent !important; }
                .empty-state {
                    position: absolute; inset: 0; background: #121218;
                    display: flex; align-items: center; justify-content: center;
                    color: #555; font-size: 14px; z-index: 10;
                    flex-direction: column; gap: 12px; pointer-events: none;
                }
                .empty-icon { font-size: 48px; opacity: 0.5; }
            </style>
            ${() => {
                const file = selectedFile();
                if (!file) return html`
                    <div class="toolbar"><span class="fn" style="color:#555;margin-right:auto">No file selected</span></div>`;
                const ext = (fileContent()?.path || file).split('.').pop();
                const lang = getLang(ext);
                return html`
                    <div class="toolbar">
                        <span class="fn" title="${file}">${file}</span>
                        <div class="lang-badge">
                            <span class="lang">${lang}</span>
                            <span class="badge ro">Read-Only</span>
                        </div>
                        <select class="renderer-select" data-action="renderer">
                            <option value="highlightjs" ${() => renderer() === 'highlightjs' ? 'selected' : ''}>HLJS</option>
                            <option value="prismjs" ${() => renderer() === 'prismjs' ? 'selected' : ''}>Prism</option>
                            <option value="shiki" ${() => renderer() === 'shiki' ? 'selected' : ''}>Shiki</option>
                        </select>
                        <div class="btn-group">
                            <button class="btn ${() => this.#wordWrap ? 'active' : ''}" data-action="wrap" title="Toggle word wrap">
                                <span style="font-size: 14px;">\u21A9</span>
                            </button>
                            <button class="btn" data-action="copy" title="Copy content">
                                <span style="font-size: 14px;">\u2398</span>
                            </button>
                        </div>
                    </div>`;
            }}
            <div class="code-wrap" id="code-wrap">
                <div id="code-output"></div>
                <div class="empty-state" id="empty-state">
                    <div class="empty-icon">📁</div>
                    <div>Select a file from the sidebar to view</div>
                </div>
            </div>
        `;
    }

    async #renderCode(container, code, lang) {
        const r = renderer();
        if (r === 'highlightjs') {
            container.innerHTML = `<pre><code class="language-${lang}"></code></pre>`;
            const el = container.querySelector('code');
            el.textContent = code;
            if (lang !== 'plaintext') hljs.highlightElement(el);
        } else if (r === 'prismjs') {
            container.innerHTML = `<pre><code class="language-${lang}"></code></pre>`;
            const el = container.querySelector('code');
            el.textContent = code;
            if (lang !== 'plaintext') Prism.highlightElement(el);
        } else if (r === 'shiki') {
            container.textContent = 'Loading Shiki...';
            await ensureShiki();
            const instance = window.__shiki?.get();
            if (!instance) { container.textContent = 'Shiki failed to load'; return; }
            const html = instance.codeToHtml(code, { lang, theme: 'vitesse-dark' });
            container.innerHTML = html;
        }
    }

    #getCodeText() {
        const r = renderer();
        const output = this.root.querySelector('#code-output');
        if (!output) return '';
        if (r === 'shiki') return output.textContent;
        return output.querySelector('code')?.textContent || output.textContent || '';
    }

    #toggleWrap() {
        this.#wordWrap = !this.#wordWrap;
        const output = this.root.querySelector('#code-output');
        const pre = output?.querySelector('pre');
        if (pre) pre.classList.toggle('wrap', this.#wordWrap);
        const btn = this.root.querySelector('[data-action="wrap"]');
        if (btn) btn.classList.toggle('active', this.#wordWrap);
    }

    setupEvents() {
        const output = this.root.querySelector('#code-output');
        const emptyState = this.root.querySelector('#empty-state');
        const wrapBtn = this.root.querySelector('[data-action="wrap"]');

        createEffect(() => {
            const file = selectedFile();
            if (emptyState) emptyState.style.display = file ? 'none' : 'flex';
        });

        createEffect(() => {
            renderer();
            const content = fileContent();
            if (!output) return;
            if (content) {
                const ext = (content.path || selectedFile() || '').split('.').pop();
                this.#renderCode(output, content.content || '', getLang(ext));
                if (this.#wordWrap) this.#toggleWrap();
            } else {
                output.innerHTML = '';
            }
        });

        this.root.addEventListener('change', (e) => {
            const sel = e.target.closest('[data-action="renderer"]');
            if (sel) {
                setRenderer(sel.value);
                wrapBtn?.classList.remove('active');
            }
        });

        this.root.addEventListener('click', (e) => {
            const wrap = e.target.closest('[data-action="wrap"]');
            if (wrap) this.#toggleWrap();
            const copy = e.target.closest('[data-action="copy"]');
            if (copy) {
                const text = this.#getCodeText();
                if (!text) return;
                navigator.clipboard.writeText(text);
                const orig = copy.innerHTML;
                copy.innerHTML = '<span style="font-size:14px;">✓</span>';
                copy.style.color = '#c3e88d';
                setTimeout(() => { copy.innerHTML = orig; copy.style.color = ''; }, 2000);
            }
        });
    }
}

class HistoryView extends SignalElement {
    render() {
        return html`
            <style>
                :host { display: block; }
                .commit { padding: 10px 16px; border-bottom: 1px solid #2a2a35; }
                .msg { font-size: 13px; color: #e0e0e0; margin-bottom: 3px; }
                .meta { font-size: 11px; color: #666; display: flex; gap: 10px; }
                .id { font-family: monospace; color: #5C6BC0; }
                .empty { color: #555; font-size: 12px; padding: 20px; text-align: center; }
            </style>
            ${Show({
                when: () => history().length === 0,
                children: () => html`<div class="empty">No commits</div>`
            })}
            ${For({
                each: history,
                key: c => c.id,
                render: c => html`
                    <div class="commit">
                        <div class="msg">${c.message}</div>
                        <div class="meta"><span class="id">${c.id?.slice(0, 7)}</span><span>${c.author}</span></div>
                    </div>
                `
            })}
        `;
    }
}

class BranchList extends SignalElement {
    render() {
        return html`
            <style>
                :host { display: block; }
                .item { display: flex; align-items: center; padding: 8px 16px; margin: 2px 8px; border-radius: 4px; }
                .item.current { background: #1e3a1e; }
                .name { font-family: monospace; font-size: 12px; color: #e0e0e0; }
                .badge { margin-left: 8px; font-size: 9px; padding: 2px 6px; background: #4CAF50; color: #fff; border-radius: 3px; }
                .empty { color: #555; font-size: 12px; padding: 20px; text-align: center; }
            </style>
            ${Show({
                when: () => branches().length === 0,
                children: () => html`<div class="empty">No branches</div>`
            })}
            ${For({
                each: branches,
                key: b => b.name,
                render: b => html`
                    <div class="item ${b.current ? 'current' : ''}">
                        <span class="name">${b.name}</span>
                        ${b.current ? html`<span class="badge">HEAD</span>` : ''}
                    </div>
                `
            })}
        `;
    }
}

class RepoViewer extends SignalElement {
    render() {
        return html`
            ${Show({
                when: () => !selectedRepo(),
                children: () => html`
                    <style>:host{display:flex;align-items:center;justify-content:center;height:100%}.e{color:#555;text-align:center}.e h2{font-size:18px;color:#666;margin-bottom:8px}.e p{font-size:13px}</style>
                    <div class="e"><h2>Select a Repository</h2><p>Choose from the sidebar or clone a new one</p></div>
                `
            })}
            ${Show({
                when: selectedRepo,
                children: () => html`
                    <style>
                        :host { display: flex; flex-direction: column; width: 100%; height: 100%; }
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
                        <span class="title">${() => selectedRepo()?.name}</span>
                        <div class="tab ${() => viewMode() === 'files' ? 'active' : ''}" @click=${() => setViewMode('files')}>Files</div>
                        <div class="tab ${() => viewMode() === 'history' ? 'active' : ''}" @click=${() => setViewMode('history')}>History</div>
                        <div class="tab ${() => viewMode() === 'branches' ? 'active' : ''}" @click=${() => setViewMode('branches')}>Branches</div>
                    </div>
                    <div class="content">
                        ${Show({ when: loading, children: () => html`<div class="loading">Loading...</div>` })}
                        ${Show({ when: error, children: () => html`<div class="error">${error()}</div>` })}
                        ${Show({
                            when: () => !loading() && !error(),
                            children: () => html`
                                ${Show({
                                    when: () => viewMode() === 'files',
                                    children: () => html`
                                        <div style="width:200px;border-right:1px solid #2a2a35;overflow-y:auto;display:flex;flex-direction:column;"><repo-file-tree style="flex:1;display:block;"></repo-file-tree></div>
                                        <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;"><repo-file-viewer style="width:100%;height:100%;flex:1;display:flex;flex-direction:column;"></repo-file-viewer></div>
                                    `
                                })}
                                ${Show({ when: () => viewMode() === 'history', children: () => html`<repo-history style="flex:1;overflow-y:auto;display:block;"></repo-history>` })}
                                ${Show({ when: () => viewMode() === 'branches', children: () => html`<repo-branches style="flex:1;overflow-y:auto;display:block;"></repo-branches>` })}
                            `
                        })}
                    </div>
                `
            })}
        `;
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

fetchRepos();
eventBus.on('workspace.changed', () => { fetchRepos(); });
