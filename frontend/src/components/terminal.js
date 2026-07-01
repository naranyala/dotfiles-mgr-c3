import { signal } from '../core/signals.js'
import { ReactiveComponent } from '../core/component.js'

export class Terminal extends ReactiveComponent {
	constructor() {
		super()
		this.logs = signal([])
	}

	addLog(msg, level) {
		this.logs.update(prev => [...prev, { msg, level, time: new Date().toLocaleTimeString() }])
		if (this.logs.value.length > 100) {
			this.logs.update(prev => prev.slice(1))
		}
	}

	clear() {
		this.logs.value = []
	}

	static define() {
		return ReactiveComponent.define({
			name: 'terminal-view',
			styles: `
				:host {
					display: block;
					background: #0f172a;
					color: #34d399;
					font-family: ui-monospace, 'Fira Code', monospace;
					font-size: 0.8rem;
					padding: 12px;
					border-radius: 8px;
					height: 300px;
					overflow-y: auto;
					border: 1px solid rgba(255, 255, 255, 0.1);
				}
				.log-entry {
					margin-bottom: 4px;
					white-space: pre-wrap;
					word-break: break-all;
					border-left: 2px solid transparent;
					padding-left: 8px;
				}
				.log-entry.info { border-left-color: #34d399; color: #34d399; }
				.log-entry.warn { border-left-color: #fbbf24; color: #fbbf24; }
				.log-entry.error { border-left-color: #f87171; color: #f87171; }
				.log-time { color: #64748b; margin-right: 8px; font-size: 0.7rem; }
			`,
			template: (ctx) => {
				const logs = ctx.logs || { value: [] }
				return `
					<div class="logs">
						${logs.value.map(log => `
							<div class="log-entry ${log.level}">
								<span class="log-time">[${log.time}]</span>
								<span>${log.msg}</span>
							</div>
						`).join('')}
					</div>
				`
			}
		})
	}
}
