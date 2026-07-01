import { createEffect, createSignal } from './signals.js';
import { ComponentError, logError } from '../core/errors.js';

export class SignalElement extends HTMLElement {
    #cleanup = null;
    #mounted = false;
    #renderError = null;
    #propertiesSignals = new Map();
    #lastFragment = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        try {
            this.internals = this.attachInternals();
        } catch (e) {
            // Browser might not support attachInternals or it's already attached
        }
        this._setupProperties();
    }

    _setupProperties() {
        const props = this.constructor.properties || {};
        for (const [prop, config] of Object.entries(props)) {
            const isConfig = typeof config === 'object' && config !== null;
            const defaultValue = isConfig ? config.default : undefined;
            const attributeName = isConfig ? config.attribute || prop : config;

            const [get, set] = createSignal(defaultValue);
            this.#propertiesSignals.set(prop, { get, set });

            Object.defineProperty(this, prop, {
                get: () => get(),
                set: (val) => {
                    const current = get();
                    if (current !== val) {
                        set(val);
                        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                            this.setAttribute(attributeName, String(val));
                        }
                    }
                },
                configurable: true,
                enumerable: true
            });
        }
    }

    _setupStyles() {
        const styles = this.constructor.styles;
        if (styles && this.shadowRoot) {
            this.shadowRoot.adoptedStyleSheets = [styles];
        }
    }

    get root() {
        return this.shadowRoot;
    }

    get isMounted() {
        return this.#mounted;
    }

    static get observedAttributes() {
        const props = this.properties || {};
        return Object.entries(props).map(([prop, config]) => {
            if (typeof config === 'object' && config !== null) {
                return config.attribute || prop;
            }
            return config;
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.constructor.properties) {
            const props = this.constructor.properties;
            const propName = Object.keys(props).find(k => {
                const conf = props[k];
                if (typeof conf === 'object' && conf !== null) {
                    return (conf.attribute || k) === name;
                }
                return conf === name;
            });

            if (propName) {
                const signal = this.#propertiesSignals.get(propName);
                if (signal) {
                    signal.set(newValue);
                }
            }
        }
    }

    connectedCallback() {
        this.#mounted = true;
        this._setupStyles();
        try {
            const content = this.render();
            if (content) {
                if (this.#lastFragment && this.#lastFragment._cleanup) {
                    this.#lastFragment._cleanup();
                }
                this.root.replaceChildren();
                this.root.appendChild(content);
                this.#lastFragment = content;
                this.#cleanup = content._cleanup || null;
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
        this.onMount?.();
    }

    disconnectedCallback() {
        this.#mounted = false;
        if (this.#lastFragment && this.#lastFragment._cleanup) {
            this.#lastFragment._cleanup();
            this.#lastFragment = null;
        }
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
        if (this.#lastFragment && this.#lastFragment._cleanup) {
            this.#lastFragment._cleanup();
            this.#lastFragment = null;
        }
        const content = this.render();
            if (content) {
                this.root.replaceChildren();
                this.root.appendChild(content);
                this.#lastFragment = content;
                this.#cleanup = content._cleanup || null;
            }
            try {
                this.setupEvents();
            } catch (err) {
                logError(new ComponentError('setupEvents failed', {
                    context: { error: err, component: this.constructor.name }
                }));
            }
    }
}

export class ErrorBoundary extends SignalElement {
    #error = null;
    #fallback = null;

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
