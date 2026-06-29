import { RpcError, logError, ErrorLevels } from './errors.js';

const RPC_TIMEOUT = 10000;
const pendingCalls = new Map();
let callId = 0;

export const rpc = {
    async call(method, ...args) {
        if (!window.backendRPC) {
            const err = new RpcError('Backend RPC not available', {
                level: ErrorLevels.WARN,
                context: { method }
            });
            logError(err);
            throw err;
        }

        const id = ++callId;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingCalls.delete(id);
                const err = new RpcError('RPC call timed out', {
                    context: { method, timeout: RPC_TIMEOUT }
                });
                logError(err);
                reject(err);
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
                            const err = new RpcError(result.message || 'RPC error', {
                                context: { method, code: result.code }
                            });
                            logError(err);
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    })
                    .catch(err => {
                        const pending = pendingCalls.get(id);
                        if (!pending) return;
                        clearTimeout(pending.timer);
                        pendingCalls.delete(id);

                        const rpcErr = new RpcError(`RPC call failed: ${err?.error || err?.message || JSON.stringify(err)}`, {
                            context: { method, error: err }
                        });
                        logError(rpcErr);
                        reject(rpcErr);
                    });
            } catch (err) {
                const pending = pendingCalls.get(id);
                if (pending) {
                    clearTimeout(pending.timer);
                    pendingCalls.delete(id);
                }
                const rpcErr = new RpcError('RPC call threw', {
                    context: { method, error: err }
                });
                logError(rpcErr);
                reject(rpcErr);
            }
        });
    },

    getPendingCount() {
        return pendingCalls.size;
    },

    cancelAll() {
        for (const [id, pending] of pendingCalls) {
            clearTimeout(pending.timer);
            pending.reject(new RpcError('RPC cancelled', { context: { method: pending.method } }));
        }
        pendingCalls.clear();
    }
};
