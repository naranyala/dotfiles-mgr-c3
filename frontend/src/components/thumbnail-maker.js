import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { html } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

const PRESETS = [
    { name: 'Indigo', bg: '#6366f1', bg2: '#8b5cf6', fg: '#ffffff' },
    { name: 'Ocean', bg: '#0ea5e9', bg2: '#06b6d4', fg: '#ffffff' },
    { name: 'Sunset', bg: '#f97316', bg2: '#ec4899', fg: '#ffffff' },
    { name: 'Forest', bg: '#10b981', bg2: '#059669', fg: '#ffffff' },
    { name: 'Midnight', bg: '#1e293b', bg2: '#334155', fg: '#f8fafc' },
    { name: 'Flame', bg: '#ef4444', bg2: '#f97316', fg: '#ffffff' },
    { name: 'Aurora', bg: '#8b5cf6', bg2: '#ec4899', fg: '#ffffff' },
    { name: 'Sky', bg: '#38bdf8', bg2: '#818cf8', fg: '#ffffff' },
]

const DIRECTIONS = [
    { label: '↘', value: '135deg' },
    { label: '→', value: 'to right' },
    { label: '↓', value: 'to bottom' },
    { label: '↙', value: '225deg' },
    { label: '←', value: 'to left' },
    { label: '↑', value: 'to top' },
    { label: '↗', value: '45deg' },
    { label: '↖', value: '315deg' },
]

const styles = componentStyles(`
    .tm-wrap { max-width: 500px; }
    .tm-controls { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
    .tm-row { display: flex; gap: 0.5rem; align-items: center; }
    .tm-input { flex: 1; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.8); color: #f8fafc; font-size: 0.85rem; }
    .tm-color { width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; padding: 0; }
    .tm-label { font-size: 0.75rem; opacity: 0.5; min-width: 60px; }
    .tm-gradient-row { display: flex; gap: 0.5rem; align-items: center; }
    .tm-preview {
        width: 100%; aspect-ratio: 16/9; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        text-align: center; font-weight: 700; overflow: hidden;
        border: 1px solid rgba(255,255,255,0.06);
    }
    .tm-preview-text { padding: 1rem; word-break: break-word; line-height: 1.3; }
    .tm-presets { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .tm-preset {
        width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
        border: 2px solid transparent; transition: all 0.15s;
    }
    .tm-preset:hover { transform: scale(1.1); }
    .tm-preset.active { border-color: #fff; box-shadow: 0 0 0 2px rgba(99,102,241,0.5); }
    .tm-dirs { display: flex; gap: 4px; }
    .tm-dir {
        width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        color: #94a3b8; font-size: 1rem; display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
    }
    .tm-dir:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
    .tm-dir.active { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #a5b4fc; }
`)

export class ThumbnailMakerComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.text = signal('Your Title Here')
        this.bg = signal('#6366f1')
        this.bg2 = signal('#8b5cf6')
        this.fg = signal('#ffffff')
        this.size = signal('2rem')
        this.useGradient = signal(true)
        this.activePreset = signal(0)
        this.direction = signal('135deg')
    }

    applyPreset(index) {
        const p = PRESETS[index]
        this.bg.value = p.bg
        this.bg2.value = p.bg2
        this.fg.value = p.fg
        this.useGradient.value = true
        this.activePreset.value = index
    }

    render() {
        const bgStyle = this.useGradient.value
            ? `linear-gradient(${this.direction.value}, ${this.bg.value}, ${this.bg2.value})`
            : this.bg.value
        return html`
            <div class="tm-wrap">
                <div class="tm-controls">
                    <div class="tm-row">
                        <span class="tm-label">Presets</span>
                        <div class="tm-presets">
                            ${PRESETS.map((p, i) => html`
                                <div class="tm-preset${this.activePreset.value === i ? ' active' : ''}"
                                    style="background:linear-gradient(135deg,${p.bg},${p.bg2})"
                                    title="${p.name}"
                                    @click="${() => this.applyPreset(i)}"></div>
                            `)}
                        </div>
                    </div>
                    <div class="tm-row">
                        <span class="tm-label">Direction</span>
                        <div class="tm-dirs">
                            ${DIRECTIONS.map(d => html`
                                <div class="tm-dir${this.direction.value === d.value ? ' active' : ''}"
                                    title="${d.value}"
                                    @click="${() => this.direction.value = d.value}">${d.label}</div>
                            `)}
                        </div>
                    </div>
                    <div class="tm-row">
                        <input class="tm-input" type="text" placeholder="Thumbnail text..."
                            :value="${this.text.value}"
                            @input="${e => this.text.value = e.target.value}" />
                    </div>
                    <div class="tm-row">
                        <span class="tm-label">Background</span>
                        <input class="tm-color" type="color" :value="${this.bg.value}"
                            @input="${e => { this.bg.value = e.target.value; this.activePreset.value = -1 }}" />
                        <input class="tm-input" type="text" style="width:80px;flex:none"
                            :value="${this.bg.value}"
                            @input="${e => { this.bg.value = e.target.value; this.activePreset.value = -1 }}" />
                        <span class="tm-label" style="min-width:auto">
                            <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                                <input type="checkbox" :checked="${this.useGradient.value}"
                                    @change="${e => this.useGradient.value = e.target.checked}" />
                                Gradient
                            </label>
                        </span>
                    </div>
                    ${this.useGradient.value ? html`
                    <div class="tm-row">
                        <span class="tm-label">Gradient end</span>
                        <input class="tm-color" type="color" :value="${this.bg2.value}"
                            @input="${e => { this.bg2.value = e.target.value; this.activePreset.value = -1 }}" />
                        <input class="tm-input" type="text" style="width:80px;flex:none"
                            :value="${this.bg2.value}"
                            @input="${e => { this.bg2.value = e.target.value; this.activePreset.value = -1 }}" />
                    </div>
                    ` : ''}
                    <div class="tm-row">
                        <span class="tm-label">Text</span>
                        <input class="tm-color" type="color" :value="${this.fg.value}"
                            @input="${e => { this.fg.value = e.target.value; this.activePreset.value = -1 }}" />
                    </div>
                </div>
                <div class="tm-preview" style="background:${bgStyle}">
                    <div class="tm-preview-text" style="color:${this.fg.value};font-size:${this.size.value}">
                        ${this.text.value || '\u00a0'}
                    </div>
                </div>
            </div>
        `
    }
}
