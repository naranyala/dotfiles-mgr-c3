import { html } from './template.js';
import { createEffect, createSignal } from './signals.js';
import { rpc } from '../core/rpc.js';

export function Terminal() {
    const [logs, setLogs] = createSignal([]);

    createEffect(() => {
        // Initial load
        rpc.logs.get().then(setLogs);

        // Listen for new logs
        const handler = (event) => {
            const newLog = event.detail;
            setLogs(prev => [...prev, newLog]);
        };
        window.addEventListener('terminal.log', handler);
        return () => window.removeEventListener('terminal.log', handler);
    });

    return () => html`
        <div style="
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Courier New', monospace;
            padding: 10px;
            height: 200px;
            overflow-y: auto;
            border-top: 1px solid #333;
            font-size: 12px;
        ">
            ${logs().map(log => html`
                <div style="margin-bottom: 2px;">
                    <span style="color: #569cd6;">[${log.level || 'INFO'}]</span>
                    <span style="color: #ce9178;">${log.source || 'system'}</span>:
                    <span>${log.message}</span>
                </div>
            `)}
        </div>
    `;
}
