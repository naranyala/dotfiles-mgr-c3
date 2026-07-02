import { plugins, getPluginName } from './plugins.js'
import { launchers } from './launchers.js'
import * as health from '../plugins/health/index.js'
import { renderHomepageGrid } from '../components/HomepageGrid.js'
import { getCategorizedLaunchers } from './categories.js'

export const BOTTOM_ITEMS = [
	{ id: 'quick', label: 'Quick', title: 'Quick Actions' },
	{ id: 'logs', label: 'Logs', title: 'Terminal Logs' },
	{ id: 'health', label: 'Health', title: 'System Health' },
]
export const SIDE_ITEMS = [
	{ id: 'info', label: 'Info' },
	{ id: 'plugins', label: 'Plugins' },
	{ id: 'debug', label: 'Debug' },
]

export function renderTabBar(tabs, active) {
	const hasCloseable = tabs.some(t => t.canClose)
	const homeTab = tabs[0]
	const otherTabs = tabs.slice(1)
	return `<div class="tab-bar">
		${homeTab ? `<div class="tab tab-home${homeTab.id === active ? ' active' : ''}" data-tab="${homeTab.id}">
			<span class="tab-label">${homeTab.title}</span>
		</div>` : ''}
		<div class="tab-bar-scroll">
			${otherTabs.map(t => `
				<div class="tab${t.id === active ? ' active' : ''}" data-tab="${t.id}">
					${t.canClose ? `<button class="tab-close" data-close-tab="${t.id}">✕</button>` : ''}
					<span class="tab-label">${t.title}</span>
				</div>`).join('')}
		</div>
		${hasCloseable ? '<button class="tab-close-all" data-close-all>✕ Close All</button>' : ''}
	</div>`
}

export function renderBreadcrumbsBar(tabs, active) {
	const activeTab = tabs.find(t => t.id === active)
	if (!activeTab) return ''

	const launcher = launchers.find(l => l.id === activeTab.id)
	const group = launcher ? launcher.group : ''

	const parts = ['Home']
	if (group && activeTab.id !== 'home') parts.push(group)
	if (activeTab.id !== 'home') parts.push(activeTab.title)
	const path = parts.join(' > ')

	return `<div class="breadcrumbs-bar">
		<span class="breadcrumbs-path">${parts.map((p, i) => {
			const isLast = i === parts.length - 1
			return `<span class="breadcrumb${isLast ? ' active' : ''}">${p}</span>${!isLast ? '<span class="breadcrumb-sep">›</span>' : ''}`
		}).join('')}</span>
		<button class="btn-copy-breadcrumb" data-copy-text="${path}" title="Copy breadcrumb path">📋</button>
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
						${visible.length > 0 ? (() => {
								const HIDDEN_IDS = new Set(['dashboard', 'search-everywhere', 'path-toolkit'])
								const groups = visible.reduce((acc, c) => {
									if (c.group.startsWith('_')) return acc;
									if (HIDDEN_IDS.has(c.id)) return acc;
									acc[c.group] = acc[c.group] || [];
									acc[c.group].push(c);
									return acc;
								}, {});
								return Object.entries(groups).map(([group, items]) => `
									<div class="menu-group">
										<div class="menu-group-title">
											<span>${group}</span>
											<span class="group-count">${items.length}</span>
											<button class="btn-copy-group" data-copy-text="homepage > ${group}" title="Copy group path">📋</button>
										</div>
										<div class="launcher-grid">
											${items.map(c =>
																'<div class="launcher-item" data-open-tab="' + c.id + '">' +
																'<div class="launcher-info">' +
																'<div class="launcher-title">' + c.title + '</div>' +
																'<div class="launcher-desc">' + c.desc + '</div>' +
																'</div></div>').join('')}
										</div>
									</div>`).join('');
								})()
						: '<div class="no-match">No features match &quot;' + q + '&quot;</div>'}
					`
					: t.content()}
				
			</div>`).join('')}
	</div>`
}

export function renderStatusBar(bottomOpen, bottomTab, sideOpen, sideTab, hiddenBottom = [], hiddenSide = []) {
	return `<div class="status-bar">
		<div class="status-left">
			<button class="sb-btn${bottomOpen ? ' active' : ''}" id="btn-bottom-drawer" title="Bottom Drawer">⊞ Panels</button>
		</div>
		<div class="status-right">
			<button class="sb-btn${sideOpen ? ' active' : ''}" id="btn-side-panel" title="Side Panel">⊟ Info</button>
		</div>
	</div>`
}

export function renderOverlay(bottomOpen, sideOpen) {
	return `<div class="drawer-overlay${bottomOpen || sideOpen ? ' visible' : ''}"></div>`
}

export function renderBottomVPanel(bottomOpen, bottomTab) {
	const icons = { quick: '⚡', logs: '📜', health: '💚' }
	return `<div class="vpanel vpanel-bottom${bottomOpen ? ' open' : ''}">
		<div class="vpanel-header">
			<span class="vpanel-title">Bottom Panels</span>
			<button class="vpanel-close" id="btn-close-bottom-drawer">✕</button>
		</div>
		<div class="vpanel-list" id="vpanel-bottom-list">
			${BOTTOM_ITEMS.map(i => `
				<div class="vpanel-item" draggable="true" data-sort-id="${i.id}" data-group="bottom">
					<span class="vpanel-item-icon">${icons[i.id] || '•'}</span>
					<span class="vpanel-item-label">${i.label}</span>
					<span class="vpanel-item-drag">⋮⋮</span>
				</div>
			`).join('')}
		</div>
	</div>`
}

export function renderSideVPanel(sideOpen, sideTab) {
	const icons = { info: 'ℹ', plugins: '🧩', debug: '🐛' }
	const labels = { info: 'About', plugins: 'Plugins', debug: 'Debug' }
	return `<div class="vpanel vpanel-right${sideOpen ? ' open' : ''}">
		<div class="vpanel-header">
			<span class="vpanel-title">Side Panels</span>
			<button class="vpanel-close" id="btn-close-side-panel">✕</button>
		</div>
		<div class="vpanel-list" id="vpanel-side-list">
			${SIDE_ITEMS.map(i => `
				<div class="vpanel-item" draggable="true" data-sort-id="${i.id}" data-group="side">
					<span class="vpanel-item-icon">${icons[i.id] || '•'}</span>
					<span class="vpanel-item-label">${labels[i.id] || i.label}</span>
					<span class="vpanel-item-drag">⋮⋮</span>
				</div>
			`).join('')}
		</div>
	</div>`
}

function renderSortableTabs(items, order, activeId, prefix, hidden) {
	const ordered = order.map(id => items.find(i => i.id === id)).filter(Boolean)
	return ordered.map(i => {
		const isHidden = hidden.includes(i.id)
		return `<span class="ctrl-tab${isHidden ? ' hidden' : ''}" data-id="${i.id}" data-group="${prefix}">
			<button class="ctrl-tab-eye" data-toggle-vis="${prefix}:${i.id}" title="${isHidden ? 'Show' : 'Hide'} ${i.label}">${isHidden ? '◌' : '●'}</button>
			<span class="ctrl-tab-label">${i.label}</span>
		</span>`
	}).join('')
}

export function renderBottomDrawer(bottomOpen, bottomTab, bottomOrder, hiddenBottom = []) {
	const active = BOTTOM_ITEMS.find(i => i.id === bottomTab)
	return `<div class="bottom-drawer${bottomOpen ? ' open' : ''}">
		<div class="drawer-handle"></div>
		<div class="drawer-header">
			<span class="drawer-title">${active ? active.title : ''}</span>
			<button class="drawer-close" id="btn-close-bottom-drawer">✕</button>
		</div>
		<div class="drawer-tabs-bar">
			${renderSortableTabs(BOTTOM_ITEMS, bottomOrder, bottomTab, 'bottom', hiddenBottom)}
		</div>
		<div class="drawer-body">
			${active ? drawerContent(bottomTab) : ''}
		</div>
	</div>`
}

export function renderSidePanel(sideOpen, sideTab, tabs, active, bottomOpen, q, sideOrder, hiddenSide = []) {
	const activeSide = SIDE_ITEMS.find(i => i.id === sideTab)
	return `<div class="side-panel${sideOpen ? ' open' : ''}">
		<div class="side-header">
			<span class="side-title">${activeSide ? (activeSide.id === 'info' ? 'About' : activeSide.id === 'plugins' ? 'Plugins' : 'Debug Inspector') : ''}</span>
			<button class="side-close" id="btn-close-side-panel">✕</button>
		</div>
		<div class="panel-tabs-bar">
			${renderSortableTabs(SIDE_ITEMS, sideOrder, sideTab, 'side', hiddenSide)}
		</div>
		<div class="side-body">
			${sideTab === 'info' ? renderSideInfo() : sideTab === 'plugins' ? renderSidePlugins() : renderSideDebug(tabs, active, bottomOpen, q)}
		</div>
	</div>`
}

function drawerContent(tabId) {
	if (tabId === 'quick') {
		const filtered = launchers.filter(c => c.id !== 'dashboard');
		const groups = filtered.reduce((acc, c) => {
			acc[c.group] = acc[c.group] || [];
			acc[c.group].push(c);
			return acc;
		}, {});
		return Object.entries(groups).map(([group, items]) => `
			<div class="menu-group">
				<div class="menu-group-title">
					<span>${group}</span>
					<span class="group-count">${items.length}</span>
					<button class="btn-copy-group" data-copy-text="homepage > ${group}" title="Copy group path">📋</button>
				</div>
				<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
					${items.map(c => `
						<div class="launcher-item" data-open-tab="${c.id}" style="padding:10px 14px">
							<div class="launcher-info">
								<div class="launcher-title" style="font-size:0.85rem">${c.title}</div>
								<div class="launcher-desc" style="font-size:0.72rem">${c.desc}</div>
							</div>
						</div>`).join('')}
				</div>
			</div>`).join('');
	}
	if (tabId === 'logs') return '<terminal-view style="height:100%;min-height:200px"></terminal-view>'
	return health.render()
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
			<button class="btn-icon" style="font-size:0.78rem;padding:4px 10px" onclick="window.rpc?.shell.dumpBackendState?.()">Dump to Console</button>
			<div style="font-size:0.72rem;color:#64748b;margin-top:6px">Click to dump backend state to terminal logs.</div>
		</div>
		<div>
			<label>Keyboard Shortcuts</label>
			<div class="mono" style="font-size:0.78rem">
Ctrl+Shift+D — Dump all state
			</div>
		</div>`
}
