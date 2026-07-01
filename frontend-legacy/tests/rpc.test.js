import test from 'node:test';
import assert from 'node:assert';
import { rpc } from '../src/core/rpc.js';

test('rpc module exists', (t) => {
    assert.ok(rpc);
    assert.strictEqual(typeof rpc.call, 'function');
});

test('rpc call formats correct payload', async (t) => {
    let capturedReq = null;
    let callId = null;
    
    // Mock webview injected function
    global.window = {
        backendRPC: (method, ...args) => {
            return new Promise((resolve) => {
                capturedReq = [method, ...args];
                resolve({ status: "ok" });
            });
        }
    };
    
    const result = await rpc.call('repo.list', 'arg1', 123);
    
    assert.deepStrictEqual(capturedReq, ['repo.list', 'arg1', 123]);
    assert.deepStrictEqual(result, { status: "ok" });
    
    // Cleanup
    delete global.window;
});

test('rpc error is properly caught', async (t) => {
    global.window = {
        backendRPC: (method) => {
            return Promise.reject(new Error("Simulated webview failure"));
        }
    };
    
    try {
        await rpc.call('repo.fail');
        assert.fail('Should have thrown an RpcError');
    } catch (err) {
        assert.match(err.message, /RPC call failed.*Simulated webview failure/);
    }
    
    delete global.window;
});
