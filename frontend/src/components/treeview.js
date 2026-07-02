import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { html } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .treeview { font-size: 0.85rem; }
    .tree-node { padding-left: 20px; }
    .tree-row {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 8px; border-radius: 6px; cursor: pointer;
        transition: background 0.1s;
    }
    .tree-row:hover { background: rgba(255,255,255,0.04); }
    .tree-row.active { background: rgba(99,102,241,0.12); color: #a5b4fc; }
    .tree-toggle {
        width: 16px; height: 16px; display: flex; align-items: center;
        justify-content: center; font-size: 0.7rem; color: #64748b;
        transition: transform 0.15s;
    }
    .tree-toggle.open { transform: rotate(90deg); }
    .tree-icon { font-size: 1rem; }
    .tree-label { flex: 1; }
    .tree-badge {
        font-size: 0.65rem; background: rgba(99,102,241,0.15);
        color: #818cf8; padding: 1px 6px; border-radius: 999px;
    }
`)

const TREE_DATA = [
    { id: 'src', label: 'src', icon: '📁', children: [
        { id: 'core', label: 'core', icon: '📁', children: [
            { id: 'signals', label: 'signals.js', icon: '📄', size: '4.2 KB' },
            { id: 'component', label: 'component.js', icon: '📄', size: '6.8 KB' },
            { id: 'template', label: 'template.js', icon: '📄', size: '8.1 KB' },
        ]},
        { id: 'components', label: 'components', icon: '📁', children: [
            { id: 'form-wizard', label: 'form-wizard.js', icon: '📄', size: '5.4 KB' },
            { id: 'modal', label: 'modal-backdrop.js', icon: '📄', size: '6.2 KB' },
            { id: 'drawer', label: 'sliding-drawer.js', icon: '📄', size: '3.8 KB' },
        ]},
        { id: 'plugins', label: 'plugins', icon: '📁', children: [
            { id: 'git', label: 'git', icon: '📁', children: [
                { id: 'git-index', label: 'index.js', icon: '📄', size: '3.1 KB' },
            ]},
            { id: 'shell', label: 'shell', icon: '📁', children: [
                { id: 'shell-index', label: 'index.js', icon: '📄', size: '4.5 KB' },
            ]},
        ]},
    ]},
    { id: 'build', label: 'build.sh', icon: '⚙️', size: '3.5 KB' },
    { id: 'readme', label: 'README.md', icon: '📖', size: '2.1 KB' },
]

export class TreeviewComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.expanded = signal(new Set(['src']))
        this.selected = signal(null)
    }

    toggle(nodeId) {
        const next = new Set(this.expanded.value)
        if (next.has(nodeId)) next.delete(nodeId)
        else next.add(nodeId)
        this.expanded.value = next
    }

    select(nodeId) {
        this.selected.value = nodeId
    }

    renderNode(node, depth = 0) {
        const hasChildren = node.children && node.children.length > 0
        const isOpen = this.expanded.value.has(node.id)
        const isSelected = this.selected.value === node.id

        return html`
            <div class="tree-node">
                <div class="tree-row ${isSelected ? 'active' : ''}"
                     style="padding-left:${depth * 20}px"
                     @click="${() => hasChildren ? this.toggle(node.id) : this.select(node.id)}">
                    ${hasChildren
                        ? html`<span class="tree-toggle ${isOpen ? 'open' : ''}">▶</span>`
                        : html`<span class="tree-toggle"></span>`
                    }
                    <span class="tree-icon">${node.icon}</span>
                    <span class="tree-label">${node.label}</span>
                    ${node.size ? html`<span class="tree-badge">${node.size}</span>` : ''}
                </div>
                ${hasChildren && isOpen
                    ? html`${node.children.map(c => this.renderNode(c, depth + 1))}`
                    : ''
                }
            </div>
        `
    }

    render() {
        return html`
            <div class="treeview">
                ${TREE_DATA.map(node => this.renderNode(node))}
            </div>
        `
    }
}
