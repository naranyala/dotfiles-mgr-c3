import { ReactiveElement } from './framework/component.js';
import { html } from './framework/template.js';
import { PluginManager } from './core/plugin-system.js';
import { createSignal } from './framework/signals.js';
import { onError, getErrorLog, clearErrorLog } from './core/errors.js';

// Load plugins
import './plugins/workspace-switcher.js';
import './plugins/repo-browser.js';

const [activeView, setActiveView] = createSignal('repos');
const [showErrors, setShowErrors] = createSignal(false);
const [errorCount, setErrorCount] = createSignal(0);

onError(() => {
    setErrorCount(getErrorLog().length);
});

const appStyles = html`
    <style>
        :host {
            display: flex;
            flex-direction: column;
            width: 100vw;
            height: 100vh;
            background: #121218;
            color: #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .header {
            height: 36px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            background: #1a1a24;
            border-bottom: 1px solid #2a2a35;
        }
        .logo {
            font-size: 13px;
            font-weight: 600;
            color: #4CAF50;
        }
        .header-actions {
            margin-left: auto;
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .error-badge {
            background: #c0392b;
            color: #fff;
            padding: 1px 6px;
            border-radius: 8px;
            font-size: 10px;
            cursor: pointer;
        }
        .error-badge:hover { background: #a93226; }
        .main {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        .ws-sidebar {
            width: 160px;
            background: #16161e;
            border-right: 1px solid #2a2a35;
            display: flex;
            flex-direction: column;
        }
        .repo-sidebar {
            width: 200px;
            background: #14141c;
            border-right: 1px solid #2a2a35;
            overflow-y: auto;
        }
        .content {
            flex: 1;
            overflow: hidden;
        }
        .nav-item {
            padding: 8px 12px;
            font-size: 13px;
            cursor: pointer;
            color: #666;
            transition: all 0.15s;
        }
        .nav-item:hover { color: #aaa; background: #1e1e28; }
        .nav-item.active { color: #4CAF50; background: #1e1e28; }
        .error-panel {
            position: fixed;
            bottom: 0;
            right: 0;
            width: 400px;
            max-height: 300px;
            background: #1a1a24;
            border: 1px solid #333;
            border-radius: 8px 0 0 0;
            overflow: hidden;
            z-index: 100;
        }
        .error-panel-header {
            padding: 8px 12px;
            background: #222;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
        }
        .error-panel-body {
            padding: 8px;
            max-height: 240px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 11px;
        }
        .error-entry {
            padding: 6px;
            margin-bottom: 4px;
            background: #2d1b1b;
            border-radius: 4px;
            border-left: 3px solid #c0392b;
        }
        .error-entry .msg { color: #e74c3c; }
        .error-entry .src { color: #666; font-size: 10px; }
        .btn-clear {
            padding: 2px 8px;
            background: #333;
            border: none;
            border-radius: 3px;
            color: #ccc;
            cursor: pointer;
            font-size: 11px;
        }
        .btn-clear:hover { background: #444; }
    </style>
`;

class AppLayout extends ReactiveElement {
    render() {
        const view = activeView();

        return html`
            ${appStyles}
            <header class="header">
                <div class="logo">dotfiles-mgr</div>
                <div class="header-actions">
                    ${() => errorCount() > 0
                        ? html`<span class="error-badge">${errorCount}</span>`
                        : ''}
                </div>
            </header>
            <div class="main">
                <div class="ws-sidebar">
                    <workspace-switcher></workspace-switcher>
                    <div style="flex: 1;"></div>
                    <div class="nav-item ${view === 'repos' ? 'active' : ''}" data-view="repos">Repos</div>
                    <div class="nav-item ${view === 'settings' ? 'active' : ''}" data-view="settings">Settings</div>
                </div>
                <div class="repo-sidebar">
                    <repo-sidebar></repo-sidebar>
                </div>
                <div class="content">
                    ${view === 'repos' ? html`<repo-viewer></repo-viewer>` : ''}
                    ${view === 'settings' ? html`<workspace-editor></workspace-editor>` : ''}
                </div>
            </div>
            <workspace-create-modal></workspace-create-modal>
            ${() => showErrors() ? html`
                <div class="error-panel">
                    <div class="error-panel-header">
                        <span>Errors (${errorCount})</span>
                        <button class="btn-clear" id="clear-errors">Clear</button>
                    </div>
                    <div class="error-panel-body" id="error-list"></div>
                </div>
            ` : ''}
        `;
    }

    setupEvents() {
        this.root.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                setActiveView(item.dataset.view);
            });
        });

        const errorBadge = this.root.querySelector('.error-badge');
        if (errorBadge) {
            errorBadge.addEventListener('click', () => setShowErrors(v => !v));
        }

        // Two-way synchronization with Backend Events
        window.addEventListener('backend-event', (e) => {
            const data = e.detail;
            console.log('Backend sync event:', data);
            
            if (data.type === 'repo-cloned' || data.type === 'workspace-changed') {
                // Tell the application that repos have updated
                window.dispatchEvent(new Event('repos-changed'));
                // Assuming eventBus is imported or we use custom events for plugins to listen to
                window.dispatchEvent(new CustomEvent('app:refresh-repos'));
            }
        });

        onError(() => {
            setErrorCount(getErrorLog().length);
        });

        const clearBtn = this.root.querySelector('#clear-errors');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                clearErrorLog();
                setErrorCount(0);
                setShowErrors(false);
            });
        }

        const errorList = this.root.querySelector('#error-list');
        if (errorList) {
            const errors = getErrorLog().slice(-20).reverse();
            errorList.innerHTML = errors.map(e => `
                <div class="error-entry">
                    <div class="msg">${e.message}</div>
                    <div class="src">${e.source}</div>
                </div>
            `).join('') || '<div style="color: #555;">No errors</div>';
        }
    }
}

customElements.define('app-layout', AppLayout);
