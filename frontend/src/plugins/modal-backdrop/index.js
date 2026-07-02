import { ModalBackdropComponent } from '../../components/modal-backdrop.js'

export const state = {}

export async function init() {
    if (!customElements.get('modal-backdrop')) {
        customElements.define('modal-backdrop', ModalBackdropComponent)
    }
}

export function render() {
    return `<modal-backdrop></modal-backdrop>`
}
