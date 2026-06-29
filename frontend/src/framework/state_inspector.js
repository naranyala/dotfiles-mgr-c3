import { html } from './template.js';
import { createEffect, createSignal } from './signals.js';
import { rpc } from '../core/rpc.js';

export function StateInspector() {
    const [state, setState] = createSignal({});

    createEffect(() => {
        // Initial load
        rpc.state.get().then(setState);

        // Poll for state changes every 5 seconds
        const interval = setInterval(async () => {
            try {
                const newState = await rpc.state.get();
                setState(newState);
            } catch (e) {
                console.error("Failed to fetch state", e);
            }
        }, 5000);

        return () => clearInterval(interval);
    });

    return () => html`
        <details style="padding: 10px; border: 1px solid #333; margin: 10px;">
            <summary style="cursor: pointer;">Application State</summary>
            <pre style="background: #252526; color: #d4d4d4; padding: 10px; overflow-x: auto;">${JSON.stringify(state(), null, 2)}</pre>
        </details>
    `;
}
