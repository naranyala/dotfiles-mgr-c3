import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .tts-bar { display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem 0; flex-wrap: wrap; }
    .form-grid { grid-template-columns: 1fr 1fr; }
    .text-area { width: 100%; min-height: 100px; padding: 0.75rem; border-radius: 8px; font-family: inherit; font-size: 0.85rem; resize: vertical; box-sizing: border-box; }
    .samples { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .sample-chip { background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.2); color: #67e8f9; padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.7rem; cursor: pointer; }
    .sample-chip:hover { background: rgba(6,182,212,0.2); }
`)

export class TtsRunnerComponent extends ReactiveComponent {
    static styles = styles
    constructor() {
        super()
        this.connected = signal(false)
        this.text = signal('')
        this.voice = signal('en-US-AriaNeural')
        this.rate = signal('+0%')
        this.voices = signal([])
        this.loading = signal(false)
        this.error = signal('')
        this.lastAudio = signal('')
        this.audioPlayer = null
    }

    async checkHealth() {
        this.loading.value = true
        this.error.value = ''
        try {
            const data = await window.rpc.tts.health()
            this.connected.value = data.status === 'ok'
        } catch (e) {
            this.connected.value = false
            this.error.value = 'Service unavailable: ' + e.message
        } finally {
            this.loading.value = false
        }
    }

    async loadVoices() {
        try {
            const data = await window.rpc.tts.voices()
            this.voices.value = (data.voices || []).filter(v => v.Locale?.startsWith('en'))
        } catch (e) {
            this.error.value = e.message
        }
    }

    async speak() {
        if (!this.text.value.trim()) return
        this.loading.value = true
        this.error.value = ''
        try {
            const data = await window.rpc.tts.speak(this.text.value, { voice: this.voice.value, rate: this.rate.value })
            if (data.ok) {
                this.lastAudio.value = data.file
                this.playAudio(data.file)
            } else {
                this.error.value = data.error || 'TTS failed'
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    playAudio(filename) {
        if (this.audioPlayer) { this.audioPlayer.pause(); this.audioPlayer = null }
        this.audioPlayer = new Audio(`http://127.0.0.1:8082/audio/${filename}`)
        this.audioPlayer.play().catch(() => {})
    }

    stopAudio() {
        if (this.audioPlayer) { this.audioPlayer.pause(); this.audioPlayer = null }
        this.lastAudio.value = ''
    }

    render() {
        const { connected, text, voice, rate, voices, loading, error, lastAudio } = this
        const sampleTexts = [
            'Hello! Welcome to the text-to-speech demo.',
            'This is a local TTS engine running on your machine.',
            'You can customize the voice and speaking rate.',
        ]

        return `
        <div class="tts-wrap">
            <div class="tts-bar">
                <span class="status-dot ${connected ? 'on' : 'off'}"></span>
                <button class="btn btn-secondary btn-sm" @click="${this.checkHealth}" ${loading ? 'disabled' : ''}>Check Health</button>
                ${connected ? `<button class="btn btn-danger btn-sm" @click="${() => connected.value = false}">Disconnect</button>` : ''}
            </div>
            ${error ? `<div class="error-box">${error}</div>` : ''}
            ${connected ? `
                <div class="form-grid">
                    <div class="field-group">
                        <label>Voice</label>
                        <select .value="${voice.value}" @change="${e => voice.value = e.target.value}">
                            ${voices.value.length === 0 ? '<option>en-US-AriaNeural</option>' : voices.value.map(v => `<option value="${v.ShortName}" ${voice.value === v.ShortName ? 'selected' : ''}>${v.DisplayName} (${v.Gender})</option>`).join('')}
                        </select>
                    </div>
                    <div class="field-group">
                        <label>Rate</label>
                        <select .value="${rate.value}" @change="${e => rate.value = e.target.value}">
                            <option value="-50%" ${rate.value === '-50%' ? 'selected' : ''}>Slow (-50%)</option>
                            <option value="-25%" ${rate.value === '-25%' ? 'selected' : ''}>Slower (-25%)</option>
                            <option value="+0%" ${rate.value === '+0%' ? 'selected' : ''}>Normal</option>
                            <option value="+25%" ${rate.value === '+25%' ? 'selected' : ''}>Faster (+25%)</option>
                            <option value="+50%" ${rate.value === '+50%' ? 'selected' : ''}>Fast (+50%)</option>
                        </select>
                    </div>
                </div>
                <div class="section-label">Text</div>
                <textarea class="text-area" .value="${text.value}" @input="${e => text.value = e.target.value}" placeholder="Enter text to speak..."></textarea>
                <div class="samples">
                    ${sampleTexts.map(s => `<span class="sample-chip" @click="${() => text.value = s}">${s.slice(0, 30)}...</span>`).join('')}
                </div>
                <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
                    <button class="btn btn-primary" @click="${this.speak}" ${loading || !text.value.trim() ? 'disabled' : ''}>Speak</button>
                    ${lastAudio.value ? `<button class="btn btn-secondary" @click="${this.stopAudio}">Stop</button>` : ''}
                    <button class="btn btn-secondary" @click="${this.loadVoices}">Load Voices</button>
                </div>
            ` : `
                <div style="text-align:center;padding:2rem;opacity:0.4;font-style:italic;">
                    Click "Check Health" to connect to the TTS server.
                </div>
            `}
        </div>`
    }
}
