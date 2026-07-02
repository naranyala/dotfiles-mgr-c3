import { TreeviewComponent } from '../../components/treeview.js'

export const state = {}

export async function init() {
    if (!customElements.get('x-treeview')) {
        customElements.define('x-treeview', TreeviewComponent)
    }
}

export function render() {
    return `<x-treeview></x-treeview>`
}
