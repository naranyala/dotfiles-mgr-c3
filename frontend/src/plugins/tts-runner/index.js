import { TtsRunnerComponent } from '../../components/tts-runner.js'

export const state = {}

export async function init() {
    if (!customElements.get('tts-runner')) {
        customElements.define('tts-runner', TtsRunnerComponent)
    }
}

export function render() {
    return `<tts-runner></tts-runner>`
}
