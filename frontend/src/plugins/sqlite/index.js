import { SqliteManagerComponent } from '../../components/sqlite-manager.js'

export const state = {
    // We don't really have much state at the plugin level for this demo
}

export async function init() {
    if (!customElements.get('sqlite-manager')) {
        customElements.define('sqlite-manager', SqliteManagerComponent)
    }
}

export function render() {
    return `<sqlite-manager></sqlite-manager>`
}
