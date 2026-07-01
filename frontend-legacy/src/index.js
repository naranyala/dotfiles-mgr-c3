import { SignalElement } from './framework/component.js';
import { html, css } from './framework/template.js';
import './plugins/repo-browser.js';
import './plugins/workspace-switcher.js';
import 'highlight.js/styles/atom-one-dark.css';
import 'prismjs/themes/prism-tomorrow.css';

const appStyles = css`
    :host {
        display: flex; flex-direction: column; width: 100vw; height: 100vh;
        background: #121218; color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .header {
        height: 40px; display: flex; align-items: center; padding: 0 16px;
        background: #1a1a24; border-bottom: 1px solid #2a2a35;
    }
    .logo { font-size: 14px; font-weight: 600; color: #4CAF50; }
    .main { flex: 1; display: flex; overflow: hidden; }
    .sidebar {
        width: 220px; background: #16161e; border-right: 1px solid #2a2a35;
        overflow-y: auto; display: flex; flex-direction: column;
    }
    .ws-section { border-bottom: 1px solid #2a2a35; }
    .repo-section { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .content { flex: 1; overflow: hidden; }
`;

class AppLayout extends SignalElement {
    static styles = appStyles;

    render() {
        return html`
            <header class="header"><div class="logo">dotfiles-mgr</div></header>
            <div class="main">
                <div class="sidebar">
                    <div class="ws-section"><workspace-switcher style="display:block;"></workspace-switcher></div>
                    <div class="repo-section"><repo-sidebar style="width:100%;height:100%;display:flex;flex-direction:column;"></repo-sidebar></div>
                </div>
                <div class="content" style="display:flex; flex-direction:column;"><repo-viewer style="width:100%;height:100%;flex:1;display:flex;flex-direction:column;"></repo-viewer></div>
            </div>
            <workspace-create-modal></workspace-create-modal>
        `;
    }
}

customElements.define('app-layout', AppLayout);
