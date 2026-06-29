import { ReactiveElement } from './framework/component.js';
import { html } from './framework/template.js';
import './plugins/repo-browser.js';

class AppLayout extends ReactiveElement {
    render() {
        return html`
            <style>
                :host { display: flex; flex-direction: column; width: 100vw; height: 100vh; background: #121218; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                .header { height: 40px; display: flex; align-items: center; padding: 0 16px; background: #1a1a24; border-bottom: 1px solid #2a2a35; }
                .logo { font-size: 14px; font-weight: 600; color: #4CAF50; }
                .main { flex: 1; display: flex; overflow: hidden; }
                .sidebar { width: 220px; background: #16161e; border-right: 1px solid #2a2a35; overflow-y: auto; }
                .content { flex: 1; overflow: hidden; }
            </style>
            <header class="header"><div class="logo">dotfiles-mgr</div></header>
            <div class="main">
                <div class="sidebar"><repo-sidebar></repo-sidebar></div>
                <div class="content"><repo-viewer></repo-viewer></div>
            </div>
        `;
    }
}

customElements.define('app-layout', AppLayout);
