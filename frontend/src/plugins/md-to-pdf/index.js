import { MdToPdfComponent } from '../../components/md-to-pdf.js'

export const state = {}

export async function init() {
    if (!customElements.get('md-to-pdf')) {
        customElements.define('md-to-pdf', MdToPdfComponent)
    }
}

export function render() {
    return `<md-to-pdf></md-to-pdf>`
}
