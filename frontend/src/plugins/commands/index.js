import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'
import { renderCommandButton, escapeHtml } from '../../shared/html-safe.js'

const PRESETS = [
	{ label: 'uname -a', cmd: 'uname -a', icon: '⊕' },
	{ label: 'lsblk', cmd: 'lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT', icon: '⊙' },
	{ label: 'lscpu', cmd: 'lscpu | head -20', icon: '◎' },
	{ label: 'df -h', cmd: 'df -h --total', icon: '⊞' },
	{ label: 'free -h', cmd: 'free -h', icon: '⊟' },
	{ label: 'ip addr', cmd: 'ip -br addr', icon: '⊗' },
	{ label: 'ss -tlnp', cmd: 'ss -tlnp', icon: '⊘' },
	{ label: 'docker ps', cmd: 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" 2>/dev/null || echo "Docker not running"', icon: '⊞' },
]

export const state = reactive({
	output: '',
	lastCmd: '',
	running: false,
	history: [],
})

export async function init() {}

export function onMount(component) {
	component.delegate('click', '[data-run-cmd]', (e) => {
		const el = e.target.closest('[data-run-cmd]')
		if (!el) return
		runCommand(el.dataset.runCmd)
	})
	component.delegate('click', '#btn-run-custom', () => {
		const input = component.shadowRoot && component.shadowRoot.querySelector('#custom-cmd')
		if (input && input.value.trim()) runCommand(input.value.trim())
	})
	component.delegate('keydown', '#custom-cmd', (e) => {
		if (e.key === 'Enter') {
			const val = e.target.value.trim()
			if (val) runCommand(val)
		}
	})
	component.delegate('click', '#btn-clear-output', () => {
		state.output = ''
		state.lastCmd = ''
	})
}

async function runCommand(cmd) {
	state.running = true
	state.lastCmd = cmd
	try {
		const res = await window.rpc.shell.exec(cmd)
		if (res.error) {
			state.output = `Error: ${res.error}`
		} else {
			state.output = res.output || '(no output)'
			state.history = [{ cmd, time: new Date().toLocaleTimeString() }, ...state.history.filter(h => h.cmd !== cmd).slice(0, 9)]
		}
	} catch (e) {
		state.output = `Error: ${e.message}`
	}
	state.running = false
}

export function render() {
	const presetBtns = PRESETS.map(p =>
		renderCommandButton(p.cmd, p.label, p.icon)
	).join('')

	const historyItems = state.history.length
		? state.history.map(h =>
			`<span data-run-cmd="${escapeHtml(h.cmd)}" style="cursor:pointer;font-size:0.72rem;color:#64748b;padding:2px 6px;background:rgba(255,255,255,0.03);border-radius:4px;white-space:nowrap" title="${escapeHtml(h.cmd)}">${escapeHtml(h.cmd.length > 20 ? h.cmd.substring(0, 20) + '…' : h.cmd)}</span>`
		).join(' ')
		: ''

	return html`
		<div class="card">
			<div class="hdr">
				<span>Quick Commands</span>
				${state.lastCmd ? `<span style="font-size:0.75rem;color:#94a3b8;font-family:ui-monospace,'Fira Code',monospace">${escapeHtml(state.lastCmd)}</span>` : ''}
			</div>
			<div class="bd">
				<div style="display:flex;gap:8px;margin-bottom:12px;align-items:stretch">
					<input id="custom-cmd" placeholder="Type a command…" style="margin:0;flex:1;padding:10px 12px;font-size:0.85rem;font-family:ui-monospace,'Fira Code',monospace" />
					<button id="btn-run-custom" style="margin:0;white-space:nowrap">Run</button>
				</div>
				<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
					${presetBtns}
				</div>
				${historyItems ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${historyItems}</div>` : ''}
				<div style="position:relative">
					<pre class="mono" style="margin:0;min-height:60px;max-height:300px;overflow:auto;font-size:0.8rem">${state.running ? '<span style="color:#fbbf24">Running…</span>' : state.output ? escapeHtml(state.output) : '<span style="color:#64748b">Output will appear here</span>'}</pre>
					${state.output ? `<button id="btn-clear-output" class="btn-icon" style="position:absolute;top:4px;right:4px;font-size:0.7rem;padding:2px 6px">✕</button>` : ''}
				</div>
			</div>
		</div>
	`
}
