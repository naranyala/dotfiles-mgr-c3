import { ThumbnailMakerComponent } from '../../components/thumbnail-maker.js'

export const state = {}

export async function init() {
    if (!customElements.get('thumbnail-maker')) {
        customElements.define('thumbnail-maker', ThumbnailMakerComponent)
    }
}

export function render() {
    return `<thumbnail-maker></thumbnail-maker>`
}
