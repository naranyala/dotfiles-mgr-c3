import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	activeEditor: 'neovim-lua',
	vimrcContent: '',
	initVimContent: '',
	initLuaContent: '',
	loading: false,
	error: null,
	saved: false
})

export async function init() {}

export function onMount(component) {
	// Shell switch tabs
	component.delegate('click', '[data-editor]', (e) => {
		const editor = e.target.closest('[data-editor]').dataset.editor
		state.activeEditor = editor
	})

	component.delegate('click', '#btn-save-vimrc', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const filePath = home?.output?.trim() ? `${home.output.trim()}/.vimrc` : '~/.vimrc'
			await window.rpc.shell.writeFile(filePath, state.vimrcContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-save-initvim', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const filePath = home?.output?.trim() ? `${home.output.trim()}/.config/nvim/init.vim` : '~/.config/nvim/init.vim'
			await window.rpc.shell.writeFile(filePath, state.initVimContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('click', '#btn-save-initlua', async () => {
		state.loading = true
		try {
			const home = await window.rpc.shell.execRead('echo $HOME')
			const filePath = home?.output?.trim() ? `${home.output.trim()}/.config/nvim/init.lua` : '~/.config/nvim/init.lua'
			await window.rpc.shell.writeFile(filePath, state.initLuaContent)
			state.saved = true
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	component.delegate('input', '#vimrc-content', (e) => { state.vimrcContent = e.target.value })
	component.delegate('input', '#initvim-content', (e) => { state.initVimContent = e.target.value })
	component.delegate('input', '#initlua-content', (e) => { state.initLuaContent = e.target.value })
}

export function render() {
	const { activeEditor, vimrcContent, initVimContent, initLuaContent, loading, error, saved } = state

	return html`
		<div class="card">
			<div class="hdr">Vim & Neovim Configuration</div>
			<div class="bd">
				<p style="margin-bottom:12px">Edit and version control your vim and neovim configuration files.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				${saved ? `<div style="color:#22c55e;margin-bottom:12px">✓ Configuration saved!</div>` : ''}
				
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<button class="${activeEditor === 'vim' ? 'active' : ''}" data-editor="vim" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">Vim (.vimrc)</button>
					<button class="${activeEditor === 'neovim-vim' ? 'active' : ''}" data-editor="neovim-vim" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">Neovim (init.vim)</button>
					<button class="${activeEditor === 'neovim-lua' ? 'active' : ''}" data-editor="neovim-lua" style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer">Neovim (init.lua)</button>
				</div>
				
				${activeEditor === 'vim' ? `
					<div>
						<label style="display:block;margin-bottom:4px;font-weight:600">.vimrc</label>
						<textarea id="vimrc-content" style="width:100%;min-height:250px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder=""" Vim configuration">${vimrcContent}</textarea>
						<button id="btn-save-vimrc" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save .vimrc'}</button>
					</div>
				` : ''}
				
				${activeEditor === 'neovim-vim' ? `
					<div>
						<label style="display:block;margin-bottom:4px;font-weight:600">~/.config/nvim/init.vim</label>
						<textarea id="initvim-content" style="width:100%;min-height:250px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder=""" Neovim Vimscript config">${initVimContent}</textarea>
						<button id="btn-save-initvim" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save init.vim'}</button>
					</div>
				` : ''}
				
				${activeEditor === 'neovim-lua' ? `
					<div>
						<label style="display:block;margin-bottom:4px;font-weight:600">~/.config/nvim/init.lua</label>
						<textarea id="initlua-content" style="width:100%;min-height:250px;font-family:monospace;font-size:0.8rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px" placeholder="-- Neovim Lua config">${initLuaContent}</textarea>
						<button id="btn-save-initlua" ${loading ? 'disabled' : ''} style="margin-top:8px">${loading ? 'Saving...' : 'Save init.lua'}</button>
					</div>
				` : ''}
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Plugin Management</div>
			<div class="bd">
				<p style="color:#64748b">Coming soon: Install, update, and manage Vim/Neovim plugins.</p>
				<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px">
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">➕ Install Plugin</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">📦 Update All</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" onclick="alert('Feature coming soon!')">🗑️ Clean Old</button>
				</div>
			</div>
		</div>
	`
}
