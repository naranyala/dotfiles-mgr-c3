import { signal } from '../core/signals.js'
import { ReactiveComponent } from '../core/component.js'

let TerminalClass = null
let FitAddon = null

async function loadXterm() {
	if (TerminalClass) return
	const xterm = await import('@xterm/xterm')
	const fit = await import('@xterm/addon-fit')
	TerminalClass = xterm.Terminal
	FitAddon = fit.FitAddon
	await import('@xterm/xterm/css/xterm.css')
}

export class XTermTerminal extends ReactiveComponent {
	constructor() {
		super()
		this._term = null
		this._fitAddon = null
		this._commandHistory = signal([])
		this._historyIndex = -1
	}

	async _initTerminal() {
		await loadXterm()
		if (this._term) return

		const container = this.shadowRoot.querySelector('#terminal-container')
		if (!container) return

		this._term = new TerminalClass({
			theme: {
				background: '#0f172a',
				foreground: '#e2e8f0',
				cursor: '#818cf8',
				cursorAccent: '#0f172a',
				selectionBackground: 'rgba(99, 102, 241, 0.3)',
				black: '#1e293b',
				red: '#f87171',
				green: '#34d399',
				yellow: '#fbbf24',
				blue: '#818cf8',
				magenta: '#c084fc',
				cyan: '#22d3ee',
				white: '#e2e8f0',
				brightBlack: '#475569',
				brightRed: '#fca5a5',
				brightGreen: '#6ee7b7',
				brightYellow: '#fde68a',
				brightBlue: '#a5b4fc',
				brightMagenta: '#d8b4fe',
				brightCyan: '#67e8f9',
				brightWhite: '#f8fafc',
			},
			fontFamily: "ui-monospace, 'Fira Code', 'Cascadia Code', monospace",
			fontSize: 13,
			lineHeight: 1.2,
			cursorBlink: true,
			scrollback: 5000,
			allowProposedApi: true,
		})

		this._fitAddon = new FitAddon()
		this._term.loadAddon(this._fitAddon)

		this._term.open(container)
		this._fitAddon.fit()

		this._term.writeln('\x1b[1;36m╔══════════════════════════════════════════╗\x1b[0m')
		this._term.writeln('\x1b[1;36m║\x1b[0m  \x1b[1;37m dotfiles-mgr terminal\x1b[0m                  \x1b[1;36m║\x1b[0m')
		this._term.writeln('\x1b[1;36m║\x1b[0m  \x1b[90mType commands below. Press Enter to run.\x1b[0m  \x1b[1;36m║\x1b[0m')
		this._term.writeln('\x1b[1;36m╚══════════════════════════════════════════╝\x1b[0m')
		this._term.writeln('')

		this._term.onKey(({ key, domEvent }) => {
			const inputEl = this.shadowRoot.querySelector('#cmd-input')
			if (inputEl && document.activeElement !== inputEl) {
				inputEl.focus()
			}
		})

		const ro = new ResizeObserver(() => {
			if (this._fitAddon) {
				try { this._fitAddon.fit() } catch {}
			}
		})
		ro.observe(container)
	}

	writeLine(text, color) {
		if (!this._term) return
		if (color) {
			this._term.writeln(`\x1b[${color}m${text}\x1b[0m`)
		} else {
			this._term.writeln(text)
		}
	}

	write(text) {
		if (!this._term) return
		this._term.write(text)
	}

	clear() {
		if (this._term) this._term.clear()
	}

	async _runFromInput() {
		const input = this.shadowRoot.querySelector('#cmd-input')
		if (!input) return
		const cmd = input.value.trim()
		if (!cmd) return

		input.value = ''

		this._term.writeln(`\x1b[1;34m$\x1b[0m ${cmd}`)

		const hist = this._commandHistory.value
		if (hist.length === 0 || hist[0] !== cmd) {
			this._commandHistory.value = [cmd, ...hist].slice(0, 100)
		}
		this._historyIndex = -1

		if (cmd === 'clear') {
			this.clear()
			return
		}

		try {
			const res = await window.rpc.shell.exec(cmd)
			if (res.error) {
				this._term.writeln(`\x1b[31mError: ${res.error}\x1b[0m`)
			} else if (res.output) {
				const lines = res.output.split('\n')
				for (const line of lines) {
					this._term.writeln(line)
				}
			}
		} catch (e) {
			this._term.writeln(`\x1b[31mError: ${e.message}\x1b[0m`)
		}

		this._term.writeln('')
	}

	_historyNavigate(direction) {
		const input = this.shadowRoot.querySelector('#cmd-input')
		if (!input) return
		const hist = this._commandHistory.value
		if (hist.length === 0) return

		if (direction === -1) {
			this._historyIndex = Math.min(this._historyIndex + 1, hist.length - 1)
		} else {
			this._historyIndex = Math.max(this._historyIndex - 1, -1)
		}

		input.value = this._historyIndex >= 0 ? hist[this._historyIndex] : ''
	}

	_cancelRun() {
		this._term.writeln('\x1b[33m[Cancelled]\x1b[0m')
	}

	disconnectedCallback() {
		if (this._term) {
			this._term.dispose()
			this._term = null
		}
	}
}

XTermTerminal.define({
	name: 'xterm-terminal',
	styles: `
		:host {
			display: block;
			background: #0f172a;
			border: 1px solid rgba(255, 255, 255, 0.1);
			border-radius: 8px;
			overflow: hidden;
		}
		#terminal-container {
			padding: 8px;
			min-height: 300px;
		}
		.cmd-row {
			display: flex;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
			background: rgba(15, 23, 42, 0.8);
		}
		.cmd-prompt {
			display: flex;
			align-items: center;
			padding: 0 12px;
			color: #818cf8;
			font-family: ui-monospace, 'Fira Code', monospace;
			font-size: 0.85rem;
			font-weight: 600;
			user-select: none;
		}
		#cmd-input {
			flex: 1;
			background: transparent;
			border: none;
			color: #e2e8f0;
			font-family: ui-monospace, 'Fira Code', monospace;
			font-size: 0.85rem;
			padding: 10px 12px;
			outline: none;
			margin: 0;
		}
		.cmd-actions {
			display: flex;
			align-items: center;
			gap: 4px;
			padding-right: 8px;
		}
		.cmd-btn {
			background: none;
			border: 1px solid rgba(255,255,255,0.1);
			color: #94a3b8;
			padding: 4px 10px;
			font-size: 0.75rem;
			border-radius: 4px;
			cursor: pointer;
			margin: 0;
			box-shadow: none;
		}
		.cmd-btn:hover {
			background: rgba(255,255,255,0.06);
			color: #e2e8f0;
		}
		.cmd-btn.danger { color: #f87171; border-color: rgba(248,113,113,0.3); }
	`,
	template: (ctx) => `
		<div id="terminal-container"></div>
		<div class="cmd-row">
			<span class="cmd-prompt">$</span>
			<input id="cmd-input" type="text" placeholder="Enter command..." spellcheck="false" autocomplete="off" />
			<div class="cmd-actions">
				<button class="cmd-btn" data-xterm-action="run">Run</button>
				<button class="cmd-btn" data-xterm-action="clear">Clear</button>
				<button class="cmd-btn danger" data-xterm-action="cancel">Cancel</button>
			</div>
		</div>
	`,
})
