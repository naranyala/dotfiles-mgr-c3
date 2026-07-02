import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { html } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .accordion { max-width: 600px; }
    .acc-item { border-bottom: 1px solid rgba(255,255,255,0.06); }
    .acc-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; cursor: pointer; transition: background 0.12s;
        border-radius: 8px; margin: 2px 0;
    }
    .acc-header:hover { background: rgba(255,255,255,0.03); }
    .acc-header.open { background: rgba(99,102,241,0.08); }
    .acc-title { font-weight: 500; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
    .acc-icon { font-size: 1.1rem; }
    .acc-chevron {
        font-size: 0.75rem; color: #64748b; transition: transform 0.2s;
    }
    .acc-chevron.open { transform: rotate(180deg); color: #a5b4fc; }
    .acc-body {
        overflow: hidden; max-height: 0; transition: max-height 0.25s ease, padding 0.25s ease;
        padding: 0 16px;
    }
    .acc-body.open {
        max-height: 500px; padding: 0 16px 14px;
    }
    .acc-content {
        font-size: 0.85rem; line-height: 1.6; color: #94a3b8;
    }
    .acc-content p { margin: 0 0 0.5rem; }
    .acc-content code {
        background: rgba(255,255,255,0.06); padding: 2px 6px;
        border-radius: 4px; font-size: 0.8rem; color: #a5b4fc;
    }
    .acc-content ul { margin: 0.5rem 0; padding-left: 1.25rem; }
    .acc-content li { margin-bottom: 0.25rem; }
`)

const SECTIONS = [
    {
        id: 'signals', icon: '⚡', title: 'Reactive Signals',
        content: `<p>Signals are the foundation of reactivity. They track dependencies automatically and notify subscribers when values change.</p>
        <p>Use <code>signal(initial)</code> to create, <code>.value</code> to get/set, and <code>effect(fn)</code> to run side effects.</p>`
    },
    {
        id: 'templates', icon: '📝', title: 'html Tagged Templates',
        content: `<p>The <code>html</code> tagged template parses HTML with event bindings (<code>@click</code>) and two-way binding (<code>:value</code>).</p>
        <p>Supports nested templates, conditionals (<code>when()</code>), and keyed lists (<code>For</code>).</p>`
    },
    {
        id: 'components', icon: '🧩', title: 'ReactiveComponent',
        content: `<p>Base class for all custom elements. Provides shadow DOM, lifecycle hooks (<code>onMount</code>, <code>firstUpdated</code>, <code>updated</code>), and automatic re-rendering on signal changes.</p>
        <ul>
            <li><code>static styles</code> — CSS via adoptedStyleSheets</li>
            <li><code>delegate()</code> — event delegation on shadow root</li>
            <li><code>emit()</code> — custom event dispatch</li>
        </ul>`
    },
    {
        id: 'context', icon: '🔗', title: 'Context & Provider',
        content: `<p>Cross-component data sharing without prop drilling. Create a context with <code>createContext(default)</code>, provide values via <code>Provider</code>, and consume with <code>Consumer</code> or <code>consume()</code> decorator.</p>`
    },
    {
        id: 'tasks', icon: '⏳', title: 'Async Tasks',
        content: `<p>The <code>Task</code> class manages async data loading with pending/error/complete states. Use <code>task.render()</code> to switch between loading spinner, error message, and data display.</p>`
    },
]

export class AccordionComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.openItems = signal(new Set(['signals']))
    }

    toggle(id) {
        const next = new Set(this.openItems.value)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        this.openItems.value = next
    }

    render() {
        return html`
            <div class="accordion">
                ${SECTIONS.map(s => {
                    const isOpen = this.openItems.value.has(s.id)
                    return html`
                        <div class="acc-item">
                            <div class="acc-header ${isOpen ? 'open' : ''}"
                                 @click="${() => this.toggle(s.id)}">
                                <span class="acc-title">
                                    <span class="acc-icon">${s.icon}</span>
                                    ${s.title}
                                </span>
                                <span class="acc-chevron ${isOpen ? 'open' : ''}">▼</span>
                            </div>
                            <div class="acc-body ${isOpen ? 'open' : ''}">
                                <div class="acc-content">${s.content}</div>
                            </div>
                        </div>
                    `
                })}
            </div>
        `
    }
}
