import { RpcError, logError, ErrorLevels } from './errors.js';

const RPC_TIMEOUT = 10000;
const pendingCalls = new Map();
let callId = 0;

// Core call function
async function rpcCall(method, ...args) {
    if (!window.backendRPC) {
        throw new RpcError('Backend RPC not available', {
            level: ErrorLevels.WARN,
            context: { method }
        });
    }

    const id = ++callId;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pendingCalls.delete(id);
            reject(new RpcError('RPC call timed out', {
                context: { method, timeout: RPC_TIMEOUT }
            }));
        }, RPC_TIMEOUT);

        pendingCalls.set(id, { resolve, reject, timer, method });

        try {
            window.backendRPC(method, ...args)
                .then(result => {
                    const pending = pendingCalls.get(id);
                    if (!pending) return;
                    clearTimeout(pending.timer);
                    pendingCalls.delete(id);

                    if (result && result.error) {
                        reject(new RpcError(result.message || 'RPC error', {
                            context: { method, code: result.code }
                        }));
                    } else {
                        resolve(result);
                    }
                })
                .catch(err => {
                    const pending = pendingCalls.get(id);
                    if (!pending) return;
                    clearTimeout(pending.timer);
                    pendingCalls.delete(id);
                    reject(new RpcError(`RPC call failed: ${err?.error || err?.message || JSON.stringify(err)}`, {
                        context: { method, error: err }
                    }));
                });
        } catch (err) {
            const pending = pendingCalls.get(id);
            if (pending) {
                clearTimeout(pending.timer);
                pendingCalls.delete(id);
            }
            reject(new RpcError('RPC call threw', {
                context: { method, error: err }
            }));
        }
    });
}

// --- Workspace API ---
const workspace = {
    list: () => rpcCall('workspace.list'),
    get: (id) => rpcCall('workspace.get', id),
    create: (name) => rpcCall('workspace.create', name),
    delete: (id) => rpcCall('workspace.delete', id),
    rename: (id, name) => rpcCall('workspace.rename', id, name),
    addGroup: (wsId, groupName) => rpcCall('workspace.add-group', wsId, groupName),
    removeGroup: (wsId, groupId) => rpcCall('workspace.remove-group', wsId, groupId),
    addRepo: (wsId, groupId, repoName, repoPath) => rpcCall('workspace.add-repo', wsId, groupId, repoName, repoPath),
    removeRepo: (wsId, groupId, repoId) => rpcCall('workspace.remove-repo', wsId, groupId, repoId),
    restoreRepo: (wsId, repoId) => rpcCall('workspace.restore-repo', wsId, repoId),
};

// --- Repo API ---
const repo = {
    list: () => rpcCall('repo.list'),
    info: (name) => rpcCall('repo.info', name),
    tree: (name, path) => rpcCall('repo.tree', name, path || ''),
    file: (name, path) => rpcCall('repo.file', name, path),
    history: (name) => rpcCall('repo.history', name),
    branches: (name) => rpcCall('repo.branches', name),
    search: (name, query) => rpcCall('repo.search', name, query),
    clone: (url) => rpcCall('repo.clone', url),
    setWorkspace: (path) => rpcCall('repo.set_workspace', path),
    getWorkspace: () => rpcCall('repo.get_workspace'),
};

// --- System API ---
const system = {
    ping: () => rpcCall('ping'),
    getSystemInfo: () => rpcCall('getSystemInfo'),
};

// --- Logs API ---
const logs = {
    get: () => rpcCall('logs.get'),
};

// --- State API ---
const state = {
    get: () => rpcCall('state.get'),
};

// --- Create global rpc object ---
export const rpc = {
    call: rpcCall,
    workspace,
    repo,
    system,
    logs,
    state,
    getPendingCount: () => pendingCalls.size,
    cancelAll: () => {
        for (const [id, pending] of pendingCalls) {
            clearTimeout(pending.timer);
            pending.reject(new RpcError('RPC cancelled', { context: { method: pending.method } }));
        }
        pendingCalls.clear();
    }
};

// Expose globally
if (typeof window !== 'undefined') {
    window.rpc = rpc;
}
