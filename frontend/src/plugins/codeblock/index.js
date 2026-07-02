import { CodeBlockComponent } from '../../components/codeblock.js'

export const state = {}

export async function init() {
    if (!customElements.get('x-codeblock')) {
        customElements.define('x-codeblock', CodeBlockComponent)
    }
}

export function render() {
    return `<x-codeblock></x-codeblock>`
}
