import { AccordionComponent } from '../../components/accordion.js'

export const state = {}

export async function init() {
    if (!customElements.get('x-accordion')) {
        customElements.define('x-accordion', AccordionComponent)
    }
}

export function render() {
    return `<x-accordion></x-accordion>`
}
