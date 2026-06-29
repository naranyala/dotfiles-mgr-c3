import { createSignal } from '../framework/signals.js';
import { ReactiveElement } from '../framework/component.js';
import { html } from '../framework/template.js';
import { PluginManager, eventBus } from '../core/plugin-system.js';
import { rpc } from '../core/rpc.js';

// --- State ---

const [workspaces, setWorkspaces] = createSignal([]);
const [activeWorkspace, setActiveWorkspace] = createSignal(null);
const [showCreateModal, setShowCreateModal] = createSignal(false);
const [loading, setLoading] = createSignal(false);

// --- API ---

async function fetchWorkspaces() {
    setLoading(true);
    try {
        const list = await rpc.call('workspace.list');
        setWorkspaces(list || []);

        if (!activeWorkspace() && list?.length > 0) {
            await selectWorkspace(list[0].id);
        }
    } catch (err) {
        console.error('Failed to fetch workspaces:', err);
    } finally {
        setLoading(false);
    }
}

async function selectWorkspace(id) {
    try {
        const ws = await rpc.call('workspace.get', id);
        setActiveWorkspace(ws);
        eventBus.emit('workspace.changed', ws, 'workspace-switcher');
    } catch (err) {
        console.error('Failed to select workspace:', err);
    }
}

async function createWorkspace(name) {
    try {
        const ws = await rpc.call('workspace.create', name);
        await fetchWorkspaces();
        await selectWorkspace(ws.id);
        setShowCreateModal(false);
    } catch (err) {
        console.error('Failed to create workspace:', err);
        alert(`Failed to create workspace: ${err?.error || err?.message || JSON.stringify(err)}`);
    }
}

async function deleteWorkspace(id) {
    try {
        await rpc.call('workspace.delete', id);
        if (activeWorkspace()?.id === id) {
            setActiveWorkspace(null);
        }
        await fetchWorkspaces();
        eventBus.emit('workspace.changed', null, 'workspace-switcher');
    } catch (err) {
        console.error('Failed to delete workspace:', err);
    }
}

async function addGroup(wsId, groupName) {
    try {
        await rpc.call('workspace.add-group', wsId, groupName);
        await selectWorkspace(wsId);
    } catch (err) {
        console.error('Failed to add group:', err);
    }
}

async function removeGroup(wsId, groupId) {
    try {
        await rpc.call('workspace.remove-group', wsId, groupId);
        await selectWorkspace(wsId);
    } catch (err) {
        console.error('Failed to remove group:', err);
    }
}

async function addRepo(wsId, groupId, repoName, repoPath) {
    try {
        await rpc.call('workspace.add-repo', wsId, groupId, repoName, repoPath);
        await selectWorkspace(wsId);
    } catch (err) {
        console.error('Failed to add repo:', err);
    }
}

async function removeRepo(wsId, groupId, repoId) {
    try {
        await rpc.call('workspace.remove-repo', wsId, groupId, repoId);
        await selectWorkspace(wsId);
    } catch (err) {
        console.error('Failed to remove repo:', err);
    }
}

// --- Components ---

class WorkspaceSwitcher extends ReactiveElement {
    render() {
        const list = workspaces();
        const current = activeWorkspace();

        return html`
            <style>
                :host { display: block; }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid #2a2a35;
                }
                .title { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .btn-add {
                    width: 20px;
                    height: 20px;
                    border: none;
                    background: #333;
                    color: #888;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-add:hover { background: #444; color: #fff; }
                .ws-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 2px 0;
                    transition: background 0.15s;
                }
                .ws-item:hover { background: #2a2a35; }
                .ws-item.active { background: #1e3a1e; border-left: 2px solid #4CAF50; }
                .ws-name { font-size: 13px; color: #e0e0e0; }
                .ws-delete {
                    opacity: 0;
                    background: none;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    font-size: 12px;
                    padding: 2px 4px;
                }
                .ws-item:hover .ws-delete { opacity: 1; }
                .ws-delete:hover { color: #e74c3c; }
            </style>
            <div class="header">
                <span class="title">Workspaces</span>
                <button class="btn-add" id="btn-new">+</button>
            </div>
            ${list.map(ws => html`
                <div class="ws-item ${ws.id === current?.id ? 'active' : ''}" data-id="${ws.id}">
                    <span class="ws-name">${ws.name}</span>
                    <button class="ws-delete" data-id="${ws.id}">x</button>
                </div>
            `).join('')}
        `;
    }

    setupEvents() {
        this.root.querySelectorAll('.ws-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('ws-delete')) {
                    selectWorkspace(item.dataset.id);
                }
            });
        });

        this.root.querySelectorAll('.ws-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this workspace?')) {
                    deleteWorkspace(btn.dataset.id);
                }
            });
        });

        this.root.querySelector('#btn-new')?.addEventListener('click', () => {
            setShowCreateModal(true);
        });
    }
}

class WorkspaceCreateModal extends ReactiveElement {
    render() {
        if (!showCreateModal()) return html``;

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
                    width: 320px;
                }
                .modal-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 16px; }
                .input {
                    width: 100%;
                    padding: 10px 12px;
                    background: #2a2a35;
                    border: 1px solid #333;
                    border-radius: 6px;
                    color: #e0e0e0;
                    font-size: 14px;
                    outline: none;
                    margin-bottom: 16px;
                    box-sizing: border-box;
                }
                .input:focus { border-color: #4CAF50; }
                .actions { display: flex; gap: 8px; justify-content: flex-end; }
                .btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
                .btn-cancel { background: #333; color: #ccc; }
                .btn-cancel:hover { background: #444; }
                .btn-create { background: #4CAF50; color: #fff; }
                .btn-create:hover { background: #43A047; }
            </style>
            <div class="modal">
                <div class="modal-title">New Workspace</div>
                <input class="input" placeholder="Workspace name" id="ws-name" autofocus />
                <div class="actions">
                    <button class="btn btn-cancel" id="btn-cancel">Cancel</button>
                    <button class="btn btn-create" id="btn-create">Create</button>
                </div>
            </div>
        `;
    }

    setupEvents() {
        this.root.querySelector('#btn-cancel')?.addEventListener('click', () => {
            setShowCreateModal(false);
        });

        this.root.querySelector('#btn-create')?.addEventListener('click', () => {
            const name = this.root.querySelector('#ws-name')?.value?.trim();
            if (name) createWorkspace(name);
        });

        this.root.querySelector('#ws-name')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const name = e.target.value?.trim();
                if (name) createWorkspace(name);
            }
        });
    }
}

class WorkspaceEditor extends ReactiveElement {
    #addingTo = createSignal(null);

    render() {
        const ws = activeWorkspace();
        if (!ws) return html``;

        const groups = ws.groups || [];
        const addingTo = this.#addingTo[0]();

        return html`
            <style>
                :host { display: block; padding: 16px; }
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                .section-title { font-size: 14px; color: #e0e0e0; font-weight: 600; }
                .btn-small {
                    padding: 4px 8px;
                    background: #333;
                    border: none;
                    border-radius: 4px;
                    color: #888;
                    cursor: pointer;
                    font-size: 11px;
                }
                .btn-small:hover { background: #444; color: #fff; }
                .group {
                    padding: 12px;
                    background: #1e1e2e;
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                .group-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .group-name { font-size: 13px; color: #e0e0e0; font-weight: 500; }
                .group-actions { display: flex; gap: 4px; }
                .repo-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 8px;
                    font-size: 12px;
                    color: #888;
                    border-radius: 4px;
                }
                .repo-item:hover { background: #2a2a35; }
                .repo-name { font-family: monospace; }
                .repo-type {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 3px;
                    background: #2a2a35;
                }
                .repo-type.local { color: #4CAF50; }
                .repo-type.remote { color: #5C6BC0; }
                .input-row { display: flex; gap: 4px; margin-top: 8px; }
                .input {
                    flex: 1;
                    padding: 6px 8px;
                    background: #2a2a35;
                    border: 1px solid #333;
                    border-radius: 4px;
                    color: #e0e0e0;
                    font-size: 12px;
                    outline: none;
                }
                .input:focus { border-color: #4CAF50; }
                .btn-add-repo {
                    padding: 6px 12px;
                    background: #4CAF50;
                    border: none;
                    border-radius: 4px;
                    color: #fff;
                    cursor: pointer;
                    font-size: 12px;
                }
                .btn-add-repo:hover { background: #43A047; }
            </style>
            <div class="section-header">
                <span class="section-title">Repo Groups</span>
                <button class="btn-small" id="btn-add-group">+ Group</button>
            </div>
            ${groups.map(group => html`
                <div class="group">
                    <div class="group-header">
                        <span class="group-name">${group.name}</span>
                        <div class="group-actions">
                            <button class="btn-small btn-add-to" data-group="${group.id}">+ Repo</button>
                            <button class="btn-small btn-remove-group" data-group="${group.id}">x</button>
                        </div>
                    </div>
                    ${(group.repos || []).map(repo => html`
                        <div class="repo-item">
                            <span class="repo-name">${repo.name}</span>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <span class="repo-type ${repo.type}">${repo.type}</span>
                                <button class="btn-small btn-remove-repo" data-group="${group.id}" data-repo="${repo.id}">x</button>
                            </div>
                        </div>
                    `).join('')}
                    ${addingTo() === group.id ? html`
                        <div class="input-row">
                            <input class="input" placeholder="name" id="repo-name-${group.id}" />
                            <input class="input" placeholder="/path/to/repo or URL" id="repo-path-${group.id}" />
                            <button class="btn-add-repo btn-do-add" data-group="${group.id}">Add</button>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        `;
    }

    setupEvents() {
        const ws = activeWorkspace();
        if (!ws) return;

        this.root.querySelector('#btn-add-group')?.addEventListener('click', () => {
            const name = prompt('Group name:');
            if (name) addGroup(ws.id, name);
        });

        this.root.querySelectorAll('.btn-add-to').forEach(btn => {
            btn.addEventListener('click', () => {
                this.#addingTo[1](btn.dataset.group);
            });
        });

        this.root.querySelectorAll('.btn-do-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const groupId = btn.dataset.group;
                const name = this.root.querySelector(`#repo-name-${groupId}`)?.value?.trim();
                const path = this.root.querySelector(`#repo-path-${groupId}`)?.value?.trim();
                if (name && path) {
                    addRepo(ws.id, groupId, name, path);
                    this.#addingTo[1](null);
                }
            });
        });

        this.root.querySelectorAll('.btn-remove-group').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Remove this group?')) {
                    removeGroup(ws.id, btn.dataset.group);
                }
            });
        });

        this.root.querySelectorAll('.btn-remove-repo').forEach(btn => {
            btn.addEventListener('click', () => {
                removeRepo(ws.id, btn.dataset.group, btn.dataset.repo);
            });
        });
    }
}

// Register elements
customElements.define('workspace-switcher', WorkspaceSwitcher);
customElements.define('workspace-create-modal', WorkspaceCreateModal);
customElements.define('workspace-editor', WorkspaceEditor);

// Exports
export { workspaces, activeWorkspace, selectWorkspace, fetchWorkspaces };

// Init
fetchWorkspaces();
