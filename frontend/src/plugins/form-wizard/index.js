import { FormWizardComponent } from '../../components/form-wizard.js'

export const state = {}

export async function init() {
    if (!customElements.get('form-wizard')) {
        customElements.define('form-wizard', FormWizardComponent)
    }
}

export function render() {
    return `<form-wizard></form-wizard>`
}
