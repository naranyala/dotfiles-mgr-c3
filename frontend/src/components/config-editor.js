import { signal } from '../core/signals.js'
import { ReactiveComponent } from '../core/component.js'

let EditorView = null
let EditorState = null
let basicSetup = null
let yaml = null
let json = null
let defaultHighlightStyle = null
let syntaxHighlighting = null

async function loadEditor() {
	if (EditorView) return
	const setup = await import('@codemirror/basic-setup')
	const view = await import('@codemirror/view')
	const state = await import('@codemirror/state')
	const yamlLang = await import('@codemirror/lang-yaml')
	const jsonLang = await import('@codemirror/lang-json')
	const lang = await import('@codemirror/language')

	EditorView = view.EditorView
	EditorState = state.EditorState
	basicSetup = setup.basicSetup
	yaml = yamlLang.yaml
	json = jsonLang.json
	defaultHighlightStyle = lang.defaultHighlightStyle
	syntaxHighlighting = lang.syntaxHighlighting
}

function detectLanguage(filename) {
	if (!filename) return []
	const ext = filename.split('.').pop().toLowerCase()
	switch (ext) {
		case 'yaml': case 'yml': return [yaml()]
		case 'json': return [json()]
		case 'toml': return []
		default: return []
	}
}

export class ConfigEditor extends ReactiveComponent {
	constructor() {
		super()
		this._view = null
		this._filePath = signal('')
		this._modified = signal(false)
		this._error = signal('')
	}

	async _initEditor() {
		await loadEditor()
		if (this._view) return

		const container = this.shadowRoot.querySelector('#editor-container')
		if (!container) return

		const state = EditorState.create({
			doc: '// Open a file to start editing\n',
			extensions: [
				basicSetup,
				EditorView.theme({
					'&': { height: '100%', backgroundColor: '#0f172a' },
					'.cm-content': { fontFamily: "ui-monospace, 'Fira Code', monospace", fontSize: '13px' },
					'.cm-gutters': { backgroundColor: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)' },
					'.cm-activeLineGutter': { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
					'.cm-activeLine': { backgroundColor: 'rgba(99, 102, 241, 0.05)' },
					'.cm-selectionBackground': { backgroundColor: 'rgba(99, 102, 241, 0.2) !important' },
					'.cm-cursor': { borderLeftColor: '#818cf8' },
				}),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						this._modified.value = true
					}
				}),
			],
		})

		this._view = new EditorView({
			state,
			parent: container,
		})
	}

	async openFile(path) {
		if (!this._view) await this._initEditor()

		try {
			const res = await window.rpc.readFile(path)
			if (res.error) {
				this._error.value = res.error
				return
			}

			this._filePath.value = path
			this._modified.value = false
			this._error.value = ''

			const lang = detectLanguage(path)
			this._view.dispatch({
				changes: {
					from: 0,
					to: this._view.state.doc.length,
					insert: res.content || '',
				},
				effects: EditorState.languageCompartment?.reconfigure(lang) || [],
			})
		} catch (e) {
			this._error.value = e.message
		}
	}

	async saveFile() {
		if (!this._view || !this._filePath.value) return

		try {
			const content = this._view.state.doc.toString()
			const res = await window.rpc.writeFile(this._filePath.value, content)
			if (res.error) {
				this._error.value = res.error
				return
			}
			this._modified.value = false
			this._error.value = ''
		} catch (e) {
			this._error.value = e.message
		}
	}

	connectedCallback() {
		queueMicrotask(() => this._initEditor())
		this._setupInput()
	}

	_setupInput() {
		setTimeout(() => {
			this.shadowRoot.addEventListener('click', (e) => {
				const btn = e.target.closest('[data-editor-action]')
				if (!btn) return
				const action = btn.dataset.editorAction
				if (action === 'open') this._promptOpen()
				else if (action === 'save') this.saveFile()
				else if (action === 'close') this._close()
			})
		}, 100)
	}

	_promptOpen() {
		const input = this.shadowRoot.querySelector('#file-path-input')
		if (input && input.value.trim()) {
			this.openFile(input.value.trim())
		}
	}

	_close() {
		if (this._view) {
			this._view.dispatch({
				changes: { from: 0, to: this._view.state.doc.length, insert: '' },
			})
		}
		this._filePath.value = ''
		this._modified.value = false
		this._error.value = ''
	}

	disconnectedCallback() {
		if (this._view) {
			this._view.destroy()
			this._view = null
		}
	}
}

ConfigEditor.define({
	name: 'config-editor',
	styles: `
		:host {
			display: block;
			background: rgba(30, 41, 59, 0.4);
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 16px;
			overflow: hidden;
		}
		.editor-header {
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
		.editor-toolbar {
			display: flex;
			gap: 8px;
			align-items: center;
			padding: 10px 16px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.05);
			background: rgba(15, 23, 42, 0.3);
		}
		.editor-toolbar input {
			flex: 1;
			margin: 0;
			padding: 6px 10px;
			font-size: 0.8rem;
			background: rgba(15, 23, 42, 0.5);
			border: 1px solid rgba(255, 255, 255, 0.1);
			color: #e2e8f0;
			font-family: ui-monospace, 'Fira Code', monospace;
			border-radius: 6px;
		}
		.editor-toolbar input:focus {
			outline: none;
			border-color: #6366f1;
		}
		.editor-btn {
			background: none;
			border: 1px solid rgba(255, 255, 255, 0.12);
			color: #94a3b8;
			padding: 6px 12px;
			font-size: 0.78rem;
			border-radius: 6px;
			cursor: pointer;
			margin: 0;
			box-shadow: none;
			white-space: nowrap;
		}
		.editor-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
		.editor-btn.primary { background: rgba(99,102,241,0.2); color: #818cf8; border-color: rgba(99,102,241,0.3); }
		.editor-btn.primary:hover { background: rgba(99,102,241,0.3); }
		.modified-badge {
			font-size: 0.7rem;
			color: #fbbf24;
			background: rgba(251, 191, 36, 0.15);
			padding: 2px 8px;
			border-radius: 4px;
			margin-left: 8px;
		}
		.error-msg {
			color: #f87171;
			font-size: 0.8rem;
			padding: 8px 16px;
			background: rgba(248, 113, 113, 0.1);
			border-bottom: 1px solid rgba(248, 113, 113, 0.2);
		}
		#editor-container {
			min-height: 400px;
			max-height: 60vh;
			overflow: auto;
		}
		.editor-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 8px 16px;
			border-top: 1px solid rgba(255, 255, 255, 0.05);
			font-size: 0.75rem;
			color: #64748b;
			background: rgba(15, 23, 42, 0.3);
		}
	`,
	template: (ctx) => {
		const fp = ctx._filePath || { value: '' }
		const mod = ctx._modified || { value: false }
		const err = ctx._error || { value: '' }
		return `
			<div class="editor-header">
				<span>Config Editor</span>
				${mod.value ? '<span class="modified-badge">Modified</span>' : ''}
			</div>
			<div class="editor-toolbar">
				<input id="file-path-input" placeholder="/path/to/config.yaml" value="${fp.value}" />
				<button class="editor-btn" data-editor-action="open">Open</button>
				<button class="editor-btn primary" data-editor-action="save">Save</button>
				<button class="editor-btn" data-editor-action="close">Close</button>
			</div>
			${err.value ? `<div class="error-msg">${err.value}</div>` : ''}
			<div id="editor-container"></div>
			<div class="editor-footer">
				<span>${fp.value || 'No file open'}</span>
				<span>${mod.value ? 'Unsaved changes' : 'Saved'}</span>
			</div>
		`
	},
})
