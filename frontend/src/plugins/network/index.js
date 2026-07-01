import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	interfaces: [],
	gateway: '',
	dns: '',
	publicIp: '',
	loading: false,
})

export async function init() {
	state.loading = true
	try {
		const res = await window.rpc.exec('ip -br addr')
		if (!res.error && res.output) {
			state.interfaces = res.output.trim().split('\n').map(line => {
				const parts = line.trim().split(/\s+/)
				const name = parts[0] || ''
				const isUp = parts[1] === 'UP'
				const ipv4 = parts.find(p => p.includes('.')) || ''
				const ipv6 = parts.find(p => p.includes(':')) || ''
				return { name, isUp, ipv4, ipv6 }
			}).filter(i => i.name && i.name !== 'lo')
		}
	} catch (e) { /* ignore */ }

	try {
		const res = await window.rpc.exec('ip route show default')
		if (!res.error && res.output) {
			const match = res.output.match(/via\s+(\S+)/)
			state.gateway = match ? match[1] : ''
		}
	} catch (e) { /* ignore */ }

	try {
		const res = await window.rpc.exec('cat /etc/resolv.conf | grep nameserver')
		if (!res.error && res.output) {
			state.dns = res.output.trim().split('\n').map(l => l.replace('nameserver', '').trim()).join(', ')
		}
	} catch (e) { /* ignore */ }

	try {
		const res = await window.rpc.exec('curl -s --max-time 3 ifconfig.me')
		if (!res.error && res.output) {
			state.publicIp = res.output.trim()
		}
	} catch (e) { /* ignore */ }

	state.loading = false
}

export function onMount(component) {
	component.delegate('click', '#btn-net-refresh', () => init())
}

export function render() {
	const ifaceRows = state.interfaces.map(i => {
		const dot = i.isUp ? '●' : '○'
		const dotColor = i.isUp ? '#34d399' : '#64748b'
		return `<div style="display:grid;grid-template-columns:80px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.82rem;align-items:center">
			<span style="color:${dotColor}">${dot} ${i.name}</span>
			<span style="font-family:ui-monospace,'Fira Code',monospace;color:#cbd5e1;font-size:0.78rem">${i.ipv4 || i.ipv6 || '—'}</span>
		</div>`
	}).join('')

	return html`
		<div class="card">
			<div class="hdr">
				<span>Network Info</span>
				<button id="btn-net-refresh" class="btn-icon" title="Refresh">↻</button>
			</div>
			<div class="bd">
				${state.loading ? '<div style="text-align:center;padding:20px;color:#64748b">Loading…</div>' : `
				<div style="margin-bottom:12px">
					<label>Interfaces</label>
					${ifaceRows || '<div style="color:#64748b;font-size:0.85rem">No interfaces found</div>'}
				</div>
				<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
					<div>
						<label>Gateway</label>
						<div class="mono" style="font-size:0.8rem">${state.gateway || '—'}</div>
					</div>
					<div>
						<label>DNS</label>
						<div class="mono" style="font-size:0.8rem">${state.dns || '—'}</div>
					</div>
				</div>
				${state.publicIp ? `
				<div style="margin-top:12px">
					<label>Public IP</label>
					<div class="mono" style="font-size:0.8rem">${state.publicIp}</div>
				</div>` : ''}
				`}
			</div>
		</div>
	`
}
