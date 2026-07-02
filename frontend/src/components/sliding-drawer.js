import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { html } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .drawer-demo { display: flex; flex-direction: column; gap: 1rem; }
    .trigger-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .drawer-portal {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: none; z-index: 1000; visibility: hidden;
    }
    .drawer-portal.open { visibility: visible; }
    .drawer-overlay {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); opacity: 0; pointer-events: none;
        transition: opacity 0.3s ease;
    }
    .drawer-overlay.open { opacity: 1; pointer-events: auto; }
    .drawer-panel {
        position: absolute;
        background: #1e293b; border: 1px solid rgba(255,255,255,0.08);
        display: flex; flex-direction: column;
    }
    .drawer-panel.bottom { bottom: 0; left: 0; right: 0; max-height: 70vh; border-radius: 16px 16px 0 0; transform: translateY(100%); }
    .drawer-panel.right { top: 0; right: 0; bottom: 0; width: 360px; border-radius: 16px 0 0 16px; transform: translateX(100%); }
    .drawer-panel.left { top: 0; left: 0; bottom: 0; width: 360px; border-radius: 0 16px 16px 0; transform: translateX(-100%); }
    .drawer-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .drawer-header h3 { margin: 0; font-size: 1rem; }
    .drawer-close {
        background: rgba(255,255,255,0.05); border: none; color: #94a3b8;
        width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
        font-size: 1rem; display: flex; align-items: center; justify-content: center;
    }
    .drawer-close:hover { background: rgba(255,255,255,0.1); color: #f8fafc; }
    .drawer-body { flex: 1; overflow-y: auto; padding: 1.25rem; }
    .drawer-handle {
        width: 36px; height: 4px; border-radius: 2px;
        background: rgba(255,255,255,0.2); margin: 8px auto 0;
    }
    .drawer-content p { margin: 0 0 0.75rem; font-size: 0.85rem; line-height: 1.6; color: #cbd5e1; }
    .demo-card {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; font-size: 0.85rem;
    }
`)

export class SlidingDrawerComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.open = signal(false)
        this.position = signal('bottom')
        this.drawerTitle = signal('Drawer')
    }

    show(pos = 'bottom') {
        this.position.value = pos
        this.drawerTitle.value = pos.charAt(0).toUpperCase() + pos.slice(1) + ' Drawer'
        this.open.value = true
        this.animatePanel()
    }

    animatePanel() {
        requestAnimationFrame(() => {
            const panel = this.shadowRoot.querySelector('.drawer-panel')
            if (!panel) return
            const pos = this.position.value
            const from = pos === 'bottom' ? 'translateY(100%)' : pos === 'right' ? 'translateX(100%)' : 'translateX(-100%)'
            panel.animate([
                { transform: from },
                { transform: 'translate(0,0)' }
            ], { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' })
            const overlay = this.shadowRoot.querySelector('.drawer-overlay')
            if (overlay) overlay.classList.add('open')
        })
    }

    close() {
        const panel = this.shadowRoot.querySelector('.drawer-panel')
        if (panel) {
            const pos = this.position.value
            const to = pos === 'bottom' ? 'translateY(100%)' : pos === 'right' ? 'translateX(100%)' : 'translateX(-100%)'
            const anim = panel.animate([
                { transform: 'translate(0,0)' },
                { transform: to }
            ], { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' })
            anim.onfinish = () => {
                this.open.value = false
                panel.style.transform = ''
            }
        } else {
            this.open.value = false
        }
        const overlay = this.shadowRoot.querySelector('.drawer-overlay')
        if (overlay) overlay.classList.remove('open')
    }

    render() {
        const o = this.open.value
        const p = this.position.value
        return html`
            <div class="drawer-demo">
                <div class="trigger-row">
                    <button class="btn btn-primary btn-sm" @click="${() => this.show('bottom')}">Bottom Drawer</button>
                    <button class="btn btn-primary btn-sm" @click="${() => this.show('right')}">Right Drawer</button>
                    <button class="btn btn-primary btn-sm" @click="${() => this.show('left')}">Left Drawer</button>
                </div>
            </div>
            <div class="drawer-portal ${o ? 'open' : ''}">
                <div class="drawer-overlay ${o ? 'open' : ''}" @click="${() => this.close()}"></div>
                <div class="drawer-panel ${p}">
                    ${p === 'bottom' ? html`<div class="drawer-handle"></div>` : ''}
                    <div class="drawer-header">
                        <h3>${this.drawerTitle.value}</h3>
                        <button class="drawer-close" @click="${() => this.close()}">✕</button>
                    </div>
                    <div class="drawer-body">
                        <div class="drawer-content">
                            <p>This is a sliding drawer component. It supports three positions: bottom, right, and left.</p>
                            <p>Click the overlay or the close button to dismiss.</p>
                            <div class="demo-card">Card 1: Slides in with CSS transitions</div>
                            <div class="demo-card">Card 2: No JavaScript animation libraries needed</div>
                            <div class="demo-card">Card 3: Uses the css transition</div>
                            <div class="demo-card">Card 4: Backdrop click closes the drawer</div>
                            <div class="demo-card">Card 5: Slides smoothly</div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}
