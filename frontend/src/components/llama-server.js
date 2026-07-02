import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .llm-bar { display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem 0; flex-wrap: wrap; }
    .model-select { display: flex; gap: 0.5rem; align-items: center; margin: 0.5rem 0; }
    .model-select select { flex: 1; }
    .prompt-area { width: 100%; min-height: 100px; padding: 0.75rem; border-radius: 8px; font-family: inherit; font-size: 0.85rem; resize: vertical; box-sizing: border-box; }
    .output-box { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 1rem; min-height: 80px; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.6; margin-top: 0.75rem; }
    .section { margin-bottom: 1rem; }
`)

export class LlamaServerComponent extends ReactiveComponent {
    static styles = styles
    constructor() {
        super()
        this.connected = signal(false)
        this.modelLoaded = signal(false)
        this.modelName = signal('')
        this.models = signal([])
        this.prompt = signal('')
        this.output = signal('')
        this.loading = signal(false)
        this.error = signal('')
        this.selectedModel = signal('')
    }

    async checkHealth() {
        this.loading.value = true
        this.error.value = ''
        try {
            const data = await window.rpc.llama.health()
            this.connected.value = data.status === 'ok'
            this.modelLoaded.value = data.model_loaded
            if (data.model) this.modelName.value = data.model
        } catch (e) {
            this.connected.value = false
            this.modelLoaded.value = false
            this.error.value = 'Service unavailable: ' + e.message
        } finally {
            this.loading.value = false
        }
    }

    async loadModels() {
        try {
            const data = await window.rpc.llama.models()
            this.models.value = data.models || []
            if (data.models.length > 0 && !this.selectedModel.value) {
                this.selectedModel.value = data.models[0].path
            }
        } catch (e) {
            this.error.value = e.message
        }
    }

    async loadModel() {
        this.loading.value = true
        this.error.value = ''
        try {
            const data = await window.rpc.llama.load(this.selectedModel.value || '')
            if (data.ok) {
                this.modelLoaded.value = true
                this.modelName.value = data.model
            } else {
                this.error.value = data.error || 'Failed to load model'
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async unloadModel() {
        this.loading.value = true
        try {
            await window.rpc.llama.unload()
            this.modelLoaded.value = false
            this.modelName.value = ''
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async generate() {
        if (!this.prompt.value.trim()) return
        this.loading.value = true
        this.error.value = ''
        this.output.value = ''
        try {
            const data = await window.rpc.llama.generate(this.prompt.value, { max_tokens: 512 })
            if (data.text) {
                this.output.value = data.text
            } else {
                this.error.value = data.error || 'Generation failed'
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    render() {
        const { connected, modelLoaded, modelName, models, prompt, output, loading, error, selectedModel } = this

        return `
        <div class="llm-wrap">
            <div class="llm-bar">
                <span class="status-dot ${connected ? 'on' : 'off'}"></span>
                <button class="btn btn-secondary btn-sm" @click="${this.checkHealth}" ${loading ? 'disabled' : ''}>Check Health</button>
                ${connected ? `<button class="btn btn-danger btn-sm" @click="${() => { connected.value = false; modelLoaded.value = false }}">Disconnect</button>` : ''}
            </div>
            ${error ? `<div class="error-box">${error}</div>` : ''}
            ${connected ? `
                <div class="section">
                    <div class="section-label">Model</div>
                    <div class="model-select">
                        <select @change="${e => selectedModel.value = e.target.value}">
                            ${models.value.length === 0 ? '<option>No models found</option>' : models.value.map(m => `<option value="${m.path}" ${selectedModel.value === m.path ? 'selected' : ''}>${m.name} (${m.size_mb}MB)</option>`).join('')}
                        </select>
                        <button class="btn btn-secondary btn-sm" @click="${this.loadModels}" ${loading ? 'disabled' : ''}>Refresh</button>
                        ${modelLoaded.value
                            ? `<button class="btn btn-danger btn-sm" @click="${this.unloadModel}">Unload</button>`
                            : `<button class="btn btn-primary btn-sm" @click="${this.loadModel}" ${loading || !selectedModel.value ? 'disabled' : ''}>Load</button>`
                        }
                    </div>
                    ${modelLoaded.value ? `<div style="font-size:0.8rem;opacity:0.6;">Loaded: ${modelName.value}</div>` : ''}
                </div>
                <div class="section">
                    <div class="section-label">Prompt</div>
                    <textarea class="prompt-area" .value="${prompt.value}" @input="${e => prompt.value = e.target.value}" placeholder="Enter your prompt..."></textarea>
                    <div style="margin-top:0.5rem;">
                        <button class="btn btn-primary" @click="${this.generate}" ${loading || !modelLoaded.value ? 'disabled' : ''}>Generate</button>
                    </div>
                </div>
                ${output.value ? `
                    <div class="section">
                        <div class="section-label">Output</div>
                        <div class="output-box">${output.value}</div>
                    </div>
                ` : ''}
            ` : `
                <div style="text-align:center;padding:2rem;opacity:0.4;font-style:italic;">
                    Click "Check Health" to connect to the llama-server.
                </div>
            `}
        </div>`
    }
}
