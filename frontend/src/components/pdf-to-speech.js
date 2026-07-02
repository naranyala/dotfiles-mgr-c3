import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .form-grid { grid-template-columns: 1fr 1fr; margin-bottom: 0.75rem; }
    .text-area { width: 100%; min-height: 180px; padding: 0.75rem; border-radius: 8px; font-family: inherit; font-size: 0.85rem; resize: vertical; box-sizing: border-box; line-height: 1.5; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .btn-primary { background: #f59e0b; }
    .btn-primary:hover:not(:disabled) { background: #d97706; }
`)

export class PdfToSpeechComponent extends ReactiveComponent {
    static styles = styles
    constructor() {
        super()
        this.text = signal('')
        this.voice = signal('en-US-AriaNeural')
        this.rate = signal('+0%')
        this.loading = signal(false)
        this.error = signal('')
        this.result = signal(null)
        this.audioPlayer = null
    }

    async speak() {
        if (!this.text.value.trim()) return
        this.loading.value = true
        this.error.value = ''
        this.result.value = null
        try {
            const data = await window.rpc['pdf-to-speech'].speak(this.text.value, {
                voice: this.voice.value,
                rate: this.rate.value,
            })
            if (data.ok) {
                this.result.value = data
                if (data.files && data.files.length > 0) {
                    this.playAudio(data.files[0])
                }
            } else {
                this.error.value = data.error || 'TTS failed'
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async convertAndSpeak() {
        if (!this.text.value.trim()) return
        this.loading.value = true
        this.error.value = ''
        this.result.value = null
        try {
            const data = await window.rpc['pdf-to-speech'].convertAndSpeak(this.text.value, {
                voice: this.voice.value,
                rate: this.rate.value,
            })
            if (data.ok) {
                this.result.value = { files: [data.file], chunks: 1, total_chars: data.chars }
                this.playAudio(data.file)
            } else {
                this.error.value = data.error || 'Failed'
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    playAudio(filename) {
        if (this.audioPlayer) { this.audioPlayer.pause(); this.audioPlayer = null }
        this.audioPlayer = new Audio(`http://127.0.0.1:8084/audio/${filename}`)
        this.audioPlayer.play().catch(() => {})
    }

    stopAudio() {
        if (this.audioPlayer) { this.audioPlayer.pause(); this.audioPlayer = null }
        this.result.value = null
    }

    loadSample() {
        this.text.value = `# Introduction to Python

Python is a high-level, interpreted programming language. Its design philosophy emphasizes code readability with the use of significant indentation.

## Key Features

- Easy to learn and use
- Extensive standard library
- Dynamic typing and memory management
- Support for multiple programming paradigms

## Applications

Python is widely used in web development, data science, artificial intelligence, automation, and scientific computing.

*This is a sample document for text-to-speech conversion.*`
    }

    render() {
        const { text, voice, rate, loading, error, result } = this

        return `
        <div class="pdf2s-wrap">
            <div class="section-label">Voice Settings</div>
            <div class="form-grid">
                <div class="field-group">
                    <label>Voice</label>
                    <select .value="${voice.value}" @change="${e => voice.value = e.target.value}">
                        <option value="en-US-AriaNeural">Aria (US, Female)</option>
                        <option value="en-US-GuyNeural">Guy (US, Male)</option>
                        <option value="en-GB-SoniaNeural">Sonia (UK, Female)</option>
                        <option value="en-AU-NatashaNeural">Natasha (AU, Female)</option>
                    </select>
                </div>
                <div class="field-group">
                    <label>Rate</label>
                    <select .value="${rate.value}" @change="${e => rate.value = e.target.value}">
                        <option value="-50%">Slow (-50%)</option>
                        <option value="-25%">Slower (-25%)</option>
                        <option value="+0%">Normal</option>
                        <option value="+25%">Faster (+25%)</option>
                        <option value="+50%">Fast (+50%)</option>
                    </select>
                </div>
            </div>
            <div class="section-label">Text (from PDF or Markdown)</div>
            <textarea class="text-area" .value="${text.value}" @input="${e => text.value = e.target.value}" placeholder="Paste extracted PDF text or markdown here..."></textarea>
            <div class="actions">
                <button class="btn btn-primary" @click="${this.speak}" ${loading || !text.value.trim() ? 'disabled' : ''}>
                    ${loading ? 'Speaking...' : 'Speak'}
                </button>
                <button class="btn btn-secondary" @click="${this.convertAndSpeak}" ${loading || !text.value.trim() ? 'disabled' : ''}>Clean & Speak</button>
                ${result.value ? `<button class="btn btn-danger btn-sm" @click="${this.stopAudio}">Stop</button>` : ''}
                <button class="btn btn-secondary btn-sm" @click="${this.loadSample}">Sample</button>
            </div>
            ${error ? `<div class="error-box">${error}</div>` : ''}
            ${result.value ? `
                <div class="success-box">
                    Generated ${result.value.chunks} audio chunk${result.value.chunks !== 1 ? 's' : ''} (${result.value.total_chars} chars)
                </div>
            ` : ''}
        </div>`
    }
}
