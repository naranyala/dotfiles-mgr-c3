import { SlidingDrawerComponent } from '../../components/sliding-drawer.js'

export const state = {}

export async function init() {
    if (!customElements.get('sliding-drawer')) {
        customElements.define('sliding-drawer', SlidingDrawerComponent)
    }
}

export function render() {
    return `<sliding-drawer></sliding-drawer>`
}
