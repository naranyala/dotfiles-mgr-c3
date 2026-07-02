import { LlamaServerComponent } from '../../components/llama-server.js'

export const state = {}

export async function init() {
    if (!customElements.get('llama-server')) {
        customElements.define('llama-server', LlamaServerComponent)
    }
}

export function render() {
    return `<llama-server></llama-server>`
}
