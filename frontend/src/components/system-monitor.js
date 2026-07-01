import { signal } from '../core/signals.js'
import { ReactiveComponent } from '../core/component.js'

let createChart = null
let LineSeries = null

async function loadCharts() {
	if (createChart) return
	const lc = await import('lightweight-charts')
	createChart = lc.createChart
	LineSeries = lc.LineSeries
}

export class SystemMonitor extends ReactiveComponent {
	constructor() {
		super()
		this._chart = null
		this._cpuSeries = null
		this._memSeries = null
		this._data = signal({ cpu: [], mem: [], timestamps: [] })
		this._interval = null
	}

	async _initChart() {
		await loadCharts()
		if (this._chart) return

		const container = this.shadowRoot.querySelector('#chart-container')
		if (!container) return

		this._chart = createChart(container, {
			width: container.clientWidth,
			height: 280,
			layout: {
				background: { color: 'transparent' },
				textColor: '#94a3b8',
				fontFamily: "ui-monospace, 'Fira Code', monospace",
				fontSize: 11,
			},
			grid: {
				vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
				horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
			},
			crosshair: {
				mode: 0,
				vertLine: { color: 'rgba(99, 102, 241, 0.3)', width: 1, style: 2 },
				horzLine: { color: 'rgba(99, 102, 241, 0.3)', width: 1, style: 2 },
			},
			rightPriceScale: {
				borderColor: 'rgba(255, 255, 255, 0.06)',
				scaleMargins: { top: 0.1, bottom: 0.1 },
			},
			timeScale: {
				borderColor: 'rgba(255, 255, 255, 0.06)',
				timeVisible: true,
				secondsVisible: false,
			},
		})

		this._cpuSeries = this._chart.addSeries(LineSeries, {
			color: '#818cf8',
			lineWidth: 2,
			title: 'CPU %',
			crosshairMarkerVisible: true,
			crosshairMarkerRadius: 4,
		})

		this._memSeries = this._chart.addSeries(LineSeries, {
			color: '#34d399',
			lineWidth: 2,
			title: 'MEM %',
			crosshairMarkerVisible: true,
			crosshairMarkerRadius: 4,
		})

		const ro = new ResizeObserver(() => {
			if (this._chart && container.clientWidth > 0) {
				this._chart.applyOptions({ width: container.clientWidth })
			}
		})
		ro.observe(container)

		this._startPolling()
	}

	_startPolling() {
		if (this._interval) return
		this._interval = setInterval(() => this._poll(), 3000)
		this._poll()
	}

	async _poll() {
		try {
			const [memRes, probeRes] = await Promise.all([
				window.rpc.memoryInfo(),
				window.rpc.systemProbe(),
			])

			const now = Math.floor(Date.now() / 1000)
			const cpuPct = probeRes.loadAvg ? (probeRes.loadAvg[0] / Math.max(probeRes.cpuCores, 1)) * 100 : 0
			const memPct = memRes.usedPercent || 0

			const d = this._data.value
			const cpuData = [...d.cpu, { time: now, value: Math.min(100, cpuPct) }].slice(-60)
			const memData = [...d.mem, { time: now, value: Math.min(100, memPct) }].slice(-60)

			this._data.value = { cpu: cpuData, mem: memData }

			if (this._cpuSeries && this._memSeries) {
				this._cpuSeries.setData(cpuData)
				this._memSeries.setData(memData)
				this._chart.timeScale().scrollToRealTime()
			}
		} catch {}
	}

	connectedCallback() {
		queueMicrotask(() => this._initChart())
	}

	disconnectedCallback() {
		if (this._interval) {
			clearInterval(this._interval)
			this._interval = null
		}
		if (this._chart) {
			this._chart.remove()
			this._chart = null
		}
	}
}

SystemMonitor.define({
	name: 'system-monitor',
	styles: `
		:host {
			display: block;
			background: rgba(30, 41, 59, 0.4);
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 16px;
			overflow: hidden;
		}
		.monitor-header {
			background: rgba(15, 23, 42, 0.6);
			color: #f1f5f9;
			padding: 14px 20px;
			font-size: 1rem;
			font-weight: 600;
			border-bottom: 1px solid rgba(255, 255, 255, 0.05);
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.monitor-legend {
			display: flex;
			gap: 16px;
			font-size: 0.75rem;
			font-weight: 400;
		}
		.legend-item {
			display: flex;
			align-items: center;
			gap: 6px;
			color: #94a3b8;
		}
		.legend-dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
		}
		#chart-container {
			padding: 12px 8px 8px;
		}
		.monitor-stats {
			display: flex;
			gap: 24px;
			padding: 12px 20px;
			border-top: 1px solid rgba(255, 255, 255, 0.05);
			font-size: 0.8rem;
		}
		.stat-item {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}
		.stat-label {
			color: #64748b;
			font-size: 0.7rem;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.stat-value {
			color: #e2e8f0;
			font-weight: 600;
			font-family: ui-monospace, 'Fira Code', monospace;
		}
	`,
	template: (ctx) => `
		<div class="monitor-header">
			<span>System Monitor</span>
			<div class="monitor-legend">
				<span class="legend-item"><span class="legend-dot" style="background:#818cf8"></span>CPU</span>
				<span class="legend-item"><span class="legend-dot" style="background:#34d399"></span>Memory</span>
			</div>
		</div>
		<div id="chart-container"></div>
		<div class="monitor-stats">
			<div class="stat-item">
				<span class="stat-label">CPU</span>
				<span class="stat-value" id="cpu-stat">—</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Memory</span>
				<span class="stat-value" id="mem-stat">—</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Samples</span>
				<span class="stat-value" id="sample-count">0</span>
			</div>
		</div>
	`,
})
