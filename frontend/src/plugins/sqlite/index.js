import { SqliteDemoComponent } from '../../components/sqlite-demo.js'

export const state = {
    // We don't really have much state at the plugin level for this demo
}

export async function init() {
    if (!customElements.get('sqlite-demo')) {
        customElements.define('sqlite-demo', SqliteDemoComponent)
    }
}

export function render() {
    return `<sqlite-demo></sqlite-demo>`
}
