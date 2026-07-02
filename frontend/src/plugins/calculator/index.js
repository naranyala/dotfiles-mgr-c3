import { CalculatorComponent } from '../../components/calculator.js'

export const state = {}

export async function init() {
    if (!customElements.get('x-calculator')) {
        customElements.define('x-calculator', CalculatorComponent)
    }
}

export function render() {
    return `<x-calculator></x-calculator>`
}
