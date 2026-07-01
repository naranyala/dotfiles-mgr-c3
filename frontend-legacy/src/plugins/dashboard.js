import { createSignal, createComputed, batch } from '../framework/signals.js';
import { SignalElement } from '../framework/component.js';
import { html, css } from '../framework/template.js';
import { PluginManager } from '../core/plugin-manager.js';
import { rpc } from '../core/rpc.js';

const [count, setCount] = createSignal(0);
const doubled = createComputed(() => count() * 2);
const [rpcStatus, setRpcStatus] = createSignal('idle');
const [rpcResult, setRpcResult] = createSignal(null);

const counterStyles = css`
    :host {
        display: block; padding: 24px; background: #1e1e2e; border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; margin: 0 0 12px; }
    .value { font-size: 48px; font-weight: 700; color: #fff; margin: 0 0 6px; font-variant-numeric: tabular-nums; }
    .sub { font-size: 13px; color: #555; margin: 0 0 20px; }
    .row { display: flex; gap: 8px; }
    button {
        flex: 1; padding: 10px; border: none; border-radius: 8px; font-size: 14px;
        font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .dec { background: #333; color: #ccc; }
    .dec:hover { background: #444; }
    .inc { background: #4CAF50; color: #fff; }
    .inc:hover { background: #43A047; }
    .rst { background: #c0392b; color: #fff; }
    .rst:hover { background: #a93226; }
`;

class CounterCard extends SignalElement {
    static styles = counterStyles;

    render() {
        return html`
            <div class="label">Counter</div>
            <div class="value">${count}</div>
            <div class="sub">&times; 2 = ${doubled}</div>
            <div class="row">
                <button class="dec" @click=${() => setCount(c => c - 1)}>&minus;1</button>
                <button class="inc" @click=${() => setCount(c => c + 1)}>+1</button>
                <button class="rst" @click=${() => setCount(0)}>Reset</button>
            </div>
        `;
    }
}

const batchStyles = css`
    :host { display: block; }
    .card { padding: 24px; background: #1e1e2e; border-radius: 12px; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; margin: 0 0 12px; }
    .value { font-size: 32px; font-weight: 700; color: #fff; margin: 0 0 16px; }
    button {
        padding: 10px 20px; border: none; border-radius: 8px; background: #5C6BC0;
        color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    button:hover { background: #3F51B5; }
`;

class BatchDemo extends SignalElement {
    static styles = batchStyles;
    #val = createSignal(0);

    render() {
        return html`
            <div class="card">
                <div class="label">Batch</div>
                <div class="value">${this.#val[0]}</div>
                <button @click=${() => { batch(() => { for (let i = 0; i < 10; i++) this.#val[1](v => v + 1); }); }}>+10 batched</button>
            </div>
        `;
    }
}

const rpcTestStyles = css`
    :host { display: block; }
    .card { padding: 24px; background: #1e1e2e; border-radius: 12px; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; margin: 0 0 12px; }
    .status { font-size: 13px; margin-bottom: 12px; }
    .status.idle { color: #666; }
    .status.loading { color: #f39c12; }
    .status.ok { color: #4CAF50; }
    .status.error { color: #e74c3c; }
    .result {
        padding: 12px; background: #16161e; border-radius: 8px; font-family: monospace;
        font-size: 12px; color: #aaa; margin-bottom: 12px; min-height: 40px;
        white-space: pre-wrap; word-break: break-all;
    }
    .row { display: flex; gap: 8px; }
    button {
        flex: 1; padding: 10px; border: none; border-radius: 8px; font-size: 14px;
        font-weight: 600; cursor: pointer; background: #333; color: #ccc;
    }
    button:hover { background: #444; }
`;

class RpcTestCard extends SignalElement {
    static styles = rpcTestStyles;

    render() {
        return html`
            <div class="card">
                <div class="label">RPC Test</div>
                <div class="status ${rpcStatus}">${rpcStatus}</div>
                <div class="result">${() => rpcResult() || 'No result'}</div>
                <div class="row">
                    <button @click=${() => this.#ping()}>Ping</button>
                    <button @click=${() => this.#sysInfo()}>System</button>
                </div>
            </div>
        `;
    }

    async #ping() {
        setRpcStatus('loading');
        setRpcResult(null);
        try {
            const res = await rpc.call('ping');
            setRpcStatus('ok');
            setRpcResult(JSON.stringify(res, null, 2));
        } catch (err) {
            setRpcStatus('error');
            setRpcResult(err.message || 'RPC failed');
        }
    }

    async #sysInfo() {
        setRpcStatus('loading');
        setRpcResult(null);
        try {
            const res = await rpc.call('getSystemInfo');
            setRpcStatus('ok');
            setRpcResult(JSON.stringify(res, null, 2));
        } catch (err) {
            setRpcStatus('error');
            setRpcResult(err.message || 'RPC failed');
        }
    }
}

customElements.define('counter-card', CounterCard);
customElements.define('batch-demo', BatchDemo);
customElements.define('rpc-test-card', RpcTestCard);

PluginManager.register('Dashboard', {
    name: 'Dashboard',
    icon: '📊',
    toolbar: () => html`
        <button style="padding: 6px 12px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
            Sync All
        </button>
    `,
    render: () => html`
        <div class="grid">
            <counter-card></counter-card>
            <batch-demo></batch-demo>
            <rpc-test-card></rpc-test-card>
        </div>
    `
});
