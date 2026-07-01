import { plugins, getPluginName } from './plugins.js'
import { launchers } from './launchers.js'
import * as health from '../plugins/health/index.js'

export function renderTabBar(tabs, active) {
	const hasCloseable = tabs.some(t => t.canClose)
	return `<div class="tab-bar">
		${tabs.map(t => `
			<div class="tab${t.id === active ? ' active' : ''}" data-tab="${t.id}">
				<span class="tab-icon">${t.icon}</span>
				<span>${t.title}</span>
				${t.canClose ? `<button class="tab-close" data-close-tab="${t.id}">✕</button>` : ''}
			</div>`).join('')}
		${hasCloseable ? '<button class="tab-close-all" data-close-all>✕ Close All</button>' : ''}
	</div>`
}

export function renderTabContent(tabs, active, q, visible) {
	return `<div class="tab-content">
		${tabs.map(t => `
			<div class="tab-pane${t.id === active ? ' active' : ''}">
				${t.id === 'home'
					? `
						<div class="search-row">
							<div class="search-wrap">
								<input id="card-search" placeholder="Search features…" value="${q}" />
								${q ? '<button class="search-clear" id="btn-search-clear">✕</button>' : ''}
							</div>
						</div>
						${visible.length > 0 ? '<div class="launcher-grid">' + visible.map(c =>
								'<div class="launcher-item" data-open-tab="' + c.id + '">' +
								'<div class="launcher-info">' +
								'<div class="launcher-title">' + c.title + '</div>' +
								'<div class="launcher-desc">' + c.desc + '</div>' +
								'</div></div>').join('') + '</div>'
							: '<div class="no-match">No features match &quot;' + q + '&quot;</div>'}
					`
					: t.content()}

			</div>`).join('')}
	</div>`
}

export function renderStatusBar(bottomOpen, bottomTab, sideOpen, sideTab) {
	return `<div class="status-bar">
		<div class="status-left">
			<button class="sb-btn${bottomOpen ? ' active' : ''}" id="btn-bottom-drawer">Drawer</button>
			<span class="sb-sep"></span>
			<button class="sb-btn${bottomTab === 'quick' && bottomOpen ? ' active' : ''}" data-bottom-tab="quick">Quick</button>
			<button class="sb-btn${bottomTab === 'logs' && bottomOpen ? ' active' : ''}" data-bottom-tab="logs">Logs</button>
			<button class="sb-btn${bottomTab === 'health' && bottomOpen ? ' active' : ''}" data-bottom-tab="health">Health</button>
		</div>
		<div class="status-right">
			<button class="sb-btn${sideTab === 'info' && sideOpen ? ' active' : ''}" data-side-tab="info">Info</button>
			<button class="sb-btn${sideTab === 'plugins' && sideOpen ? ' active' : ''}" data-side-tab="plugins">Plugins</button>
			<button class="sb-btn${sideTab === 'debug' && sideOpen ? ' active' : ''}" data-side-tab="debug">Debug</button>
			<span class="sb-sep"></span>
			<button class="sb-btn${sideOpen ? ' active' : ''}" id="btn-side-panel">Panel</button>
		</div>
	</div>`
}

export function renderOverlay(bottomOpen, sideOpen) {
	return `<div class="drawer-overlay${bottomOpen || sideOpen ? ' visible' : ''}"></div>`
}

export function renderBottomDrawer(bottomOpen, bottomTab) {
	const title = bottomTab === 'quick' ? 'Quick Actions' : bottomTab === 'logs' ? 'Terminal Logs' : 'System Health'
	return `<div class="bottom-drawer${bottomOpen ? ' open' : ''}">
		<div class="drawer-handle"></div>
		<div class="drawer-header">
			<span class="drawer-title">${title}</span>
			<button class="drawer-close" id="btn-close-bottom-drawer">✕</button>
		</div>
		<div class="drawer-tabs">
			<button class="drawer-tab${bottomTab === 'quick' ? ' active' : ''}" data-bottom-tab="quick">Quick</button>
			<button class="drawer-tab${bottomTab === 'logs' ? ' active' : ''}" data-bottom-tab="logs">Logs</button>
			<button class="drawer-tab${bottomTab === 'health' ? ' active' : ''}" data-bottom-tab="health">Health</button>
		</div>
		<div class="drawer-body">
			${bottomTab === 'quick' ? `
				<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
					${launchers.filter(c => c.id !== 'dashboard').map(c => `
						<div class="launcher-item" data-open-tab="${c.id}" style="padding:10px 14px">
							<div class="launcher-info">
								<div class="launcher-title" style="font-size:0.85rem">${c.title}</div>
								<div class="launcher-desc" style="font-size:0.72rem">${c.desc}</div>
							</div>
						</div>`).join('')}
				</div>`
			: bottomTab === 'logs' ? `
				<terminal-view style="height:100%;min-height:200px"></terminal-view>`
			: `
				${health.render()}`
			}
		</div>
	</div>`
}

export function renderSidePanel(sideOpen, sideTab, tabs, active, bottomOpen, q) {
	return `<div class="side-panel${sideOpen ? ' open' : ''}">
		<div class="side-header">
			<span class="side-title">${sideTab === 'info' ? 'About' : sideTab === 'plugins' ? 'Plugins' : 'Debug Inspector'}</span>
			<button class="side-close" id="btn-close-side-panel">✕</button>
		</div>
		<div class="side-tabs">
			<button class="side-tab${sideTab === 'info' ? ' active' : ''}" data-side-tab="info">ℹ Info</button>
			<button class="side-tab${sideTab === 'plugins' ? ' active' : ''}" data-side-tab="plugins">⚙ Plugins</button>
			<button class="side-tab${sideTab === 'debug' ? ' active' : ''}" data-side-tab="debug">⌘ Debug</button>
		</div>
		<div class="side-body">
			${sideTab === 'info' ? renderSideInfo()
			: sideTab === 'plugins' ? renderSidePlugins()
			: renderSideDebug(tabs, active, bottomOpen, q)}
		</div>
	</div>`
}

function renderSideInfo() {
	return `
		<div style="margin-bottom:16px">
			<label>dotfiles-mgr</label>
			<div class="mono" style="font-size:0.8rem">A desktop dotfiles & system manager built with V + webview.</div>
		</div>
		<div style="margin-bottom:16px">
			<label>Registered RPCs</label>
			<div class="mono" style="font-size:0.8rem">
				system · git · files · tools
			</div>
		</div>
		<div style="margin-bottom:16px">
			<label>Plugins</label>
			<div class="mono" style="font-size:0.8rem">
${plugins.map(p => `  • ${getPluginName(p)}`).join('\n')}
			</div>
		</div>`
}

function renderSidePlugins() {
	return `<div style="display:flex;flex-direction:column;gap:8px">
		${plugins.map(p => {
			const name = getPluginName(p)
			const keys = Object.keys(p.state)
			return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 14px">
				<div style="font-weight:600;font-size:0.85rem;color:#e2e8f0;margin-bottom:4px">${name}</div>
				<div style="font-size:0.72rem;color:#64748b">state keys: ${keys.join(', ')}</div>
			</div>`
		}).join('')}
	</div>`
}

function renderSideDebug(tabs, active, bottomOpen, q) {
	return `
		<div style="margin-bottom:16px">
			<label>Frontend State</label>
			<pre class="mono" style="font-size:0.72rem;max-height:200px;overflow:auto">${JSON.stringify({
				tabs: tabs.length,
				active,
				bottomOpen,
				searchQuery: q || '(empty)',
			}, null, 2)}</pre>
		</div>
		<div style="margin-bottom:16px">
			<label>Backend State</label>
			<button class="btn-icon" style="font-size:0.78rem;padding:4px 10px" onclick="window.rpc?.dumpBackendState?.()">Dump to Console</button>
			<div style="font-size:0.72rem;color:#64748b;margin-top:6px">Click to dump backend state to terminal logs.</div>
		</div>
		<div>
			<label>Keyboard Shortcuts</label>
			<div class="mono" style="font-size:0.78rem">
Ctrl+Shift+D — Dump all state
			</div>
		</div>`
}
