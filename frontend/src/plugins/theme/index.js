import { reactive, ref } from '../../core/signals.js'
import { html } from '../../core/template.js'
import { token, defineDesignSystem, applyDesignSystem, initDefaultTokens } from '../../core/tokens.js'

initDefaultTokens()

export const state = reactive({
	accentColor: '',
	successColor: '',
})

const current = ref('dark')

defineDesignSystem('dark', {
	'card': 'rgba(30, 41, 59, 0.4)',
	'card-text': '#f1f5f9',
	'accent': '#818cf8',
	'success': '#34d399',
})

defineDesignSystem('light', {
	'card': 'rgba(255, 255, 255, 0.85)',
	'card-text': '#1e293b',
	'accent': '#6366f1',
	'success': '#059669',
})

applyDesignSystem('dark')

const accentToken = token('dark-accent')
const successToken = token('dark-success')

export async function init() {
	updateColors()
}

function updateColors() {
	state.accentColor = accentToken.value
	state.successColor = successToken.value
}

let unsub
export function onMount(component) {
	unsub = accentToken.subscribe(() => updateColors())
	component.delegate('click', '#btn-theme-toggle', () => {
		const next = current.value === 'dark' ? 'light' : 'dark'
		current.value = next
		applyDesignSystem(next)
		updateColors()
	})
}

export function render() {
	const isDark = current.value === 'dark'

	return html`
		<div class="card">
			<div class="hdr">
				<span>Theme Switcher</span>
			</div>
			<div class="bd">
				<button id="btn-theme-toggle" style="background:${state.accentColor};color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:600;font-size:1rem;width:100%">
					Switch to ${isDark ? 'Light' : 'Dark'} Theme
				</button>

				<div class="mono" style="margin-top:16px;font-size:0.8rem">
					<div style="margin-bottom:8px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;font-size:0.75rem">Current Theme: ${current.value}</div>
					<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
						<span style="color:#94a3b8">Accent:</span>
						<span style="width:20px;height:20px;border-radius:4px;background:${state.accentColor};display:inline-block;border:1px solid rgba(255,255,255,0.1)"></span>
						<span style="color:#cbd5e1">${state.accentColor}</span>
					</div>
					<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
						<span style="color:#94a3b8">Success:</span>
						<span style="width:20px;height:20px;border-radius:4px;background:${state.successColor};display:inline-block;border:1px solid rgba(255,255,255,0.1)"></span>
						<span style="color:#cbd5e1">${state.successColor}</span>
					</div>
				</div>
			</div>
		</div>
	`
}
