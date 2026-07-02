import { PdfToSpeechComponent } from '../../components/pdf-to-speech.js'

export const state = {}

export async function init() {
    if (!customElements.get('pdf-to-speech')) {
        customElements.define('pdf-to-speech', PdfToSpeechComponent)
    }
}

export function render() {
    return `<pdf-to-speech></pdf-to-speech>`
}
