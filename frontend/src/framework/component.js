import { createEffect } from './signals.js';
import { ComponentError, logError, ErrorLevels } from '../core/errors.js';

export class ReactiveElement extends HTMLElement {
    #cleanup = null;
    #mounted = false;
    #renderError = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    get root() {
        return this.shadowRoot;
    }

    get isMounted() {
        return this.#mounted;
    }

    connectedCallback() {
        this.#mounted = true;
        try {
            this.#cleanup = createEffect(() => {
                try {
                    const content = this.render();
                    if (content) {
                        this.root.replaceChildren();
                        this.root.appendChild(content);
                    }
                    this.#renderError = null;
                } catch (err) {
                    this.#renderError = err;
                    this.#renderErrorBoundary(err);
                    return;
                }
                try {
                    this.setupEvents();
                } catch (err) {
                    logError(new ComponentError('setupEvents failed', {
                        context: { error: err, component: this.constructor.name }
                    }));
                }
            });
            this.onMount?.();
        } catch (err) {
            logError(new ComponentError('connectedCallback failed', {
                context: { error: err, component: this.constructor.name }
            }));
        }
    }

    disconnectedCallback() {
        this.#mounted = false;
        this.#cleanup?.();
        this.#cleanup = null;
        this.onUnmount?.();
    }

    #renderErrorBoundary(err) {
        const errorHtml = document.createElement('div');
        errorHtml.setAttribute('style', `
            padding: 16px;
            margin: 8px;
            background: #2d1b1b;
            border: 1px solid #c0392b;
            border-radius: 8px;
            color: #e74c3c;
            font-family: monospace;
            font-size: 13px;
        `);
        errorHtml.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">Component Error</div>
            <div style="color: #aaa; margin-bottom: 4px;">${this.constructor.name}</div>
            <div style="color: #e74c3c;">${err.message}</div>
            <div style="color: #666; font-size: 11px; margin-top: 8px;">${err.stack?.split('\n').slice(1, 3).join('<br>') || ''}</div>
        `;
        this.root.replaceChildren();
        this.root.appendChild(errorHtml);
    }

    render() {
        return null;
    }

    setupEvents() {}

    onMount() {}
    onUnmount() {}

    $(selector) {
        return this.root.querySelector(selector);
    }

    $$(selector) {
        return this.root.querySelectorAll(selector);
    }

    requestUpdate() {
        if (this.#cleanup) {
            this.#cleanup();
        }
        this.#cleanup = createEffect(() => {
            const content = this.render();
            if (content) {
                this.root.replaceChildren();
                this.root.appendChild(content);
            }
            try {
                this.setupEvents();
            } catch (err) {
                logError(new ComponentError('setupEvents failed', {
                    context: { error: err, component: this.constructor.name }
                }));
            }
        });
    }
}

export class ErrorBoundary extends ReactiveElement {
    #error = null;
    #fallback = null;
    #cleanup = null;

    constructor() {
        super();
        this.#fallback = this.getAttribute('fallback') || 'Something went wrong';
    }

    render() {
        if (this.#error) {
            return this.#renderError();
        }
        return this.#renderContent();
    }

    #renderContent() {
        const slot = document.createElement('slot');
        return slot;
    }

    #renderError() {
        const div = document.createElement('div');
        div.setAttribute('style', `
            padding: 24px;
            background: #1e1e2e;
            border: 1px solid #c0392b;
            border-radius: 12px;
            color: #e74c3c;
        `);
        div.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">Error</div>
            <div style="color: #aaa; margin-bottom: 12px;">${this.#fallback}</div>
            <div style="font-family: monospace; font-size: 12px; color: #666;">
                ${this.#error?.message || 'Unknown error'}
            </div>
            <button id="retry" style="
                margin-top: 12px;
                padding: 8px 16px;
                background: #333;
                border: none;
                border-radius: 6px;
                color: #ccc;
                cursor: pointer;
            ">Retry</button>
        `;
        setTimeout(() => {
            div.querySelector('#retry')?.addEventListener('click', () => {
                this.#error = null;
                this.requestUpdate();
            });
        }, 0);
        return div;
    }

}
