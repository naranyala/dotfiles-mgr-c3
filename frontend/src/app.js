import './core/rpc.js'
import { signal } from './core/signals.js'
import { ReactiveComponent } from './core/component.js'
import { Terminal } from './components/terminal.js'

import { plugins, initAll } from './shell/plugins.js'
import { installStateDump } from './shell/state.js'
import { launchers, fuzzyMatch } from './shell/launchers.js'
import { styles } from './shell/styles.js'
import {
	renderTabBar, renderTabContent, renderStatusBar,
	renderOverlay, renderBottomDrawer, renderSidePanel,
} from './shell/templates.js'

installStateDump()

class SystemDashboard extends ReactiveComponent {
	constructor() {
		super()
		this.searchQuery = signal('')
		this.tabs = signal([{ id: 'home', title: 'Home', icon: '⊞', canClose: false }])
		this.activeTab = signal('home')
		this.bottomDrawerOpen = signal(false)
		this.bottomDrawerTab = signal('quick')
		this.sidePanelOpen = signal(false)
		this.sidePanelTab = signal('info')
	}

	openTab(card) {
		const tabs = [...this.tabs.value]
		if (!tabs.find(t => t.id === card.id)) {
			tabs.push({ id: card.id, title: card.title, icon: card.icon, canClose: true, content: card.content })
			this.tabs.value = tabs
		}
		this.activeTab.value = card.id
	}

	closeTab(tabId) {
		if (tabId === 'home') return
		const tabs = this.tabs.value.filter(t => t.id !== tabId)
		this.tabs.value = tabs
		if (this.activeTab.value === tabId) {
			this.activeTab.value = tabs.length > 0 ? tabs[tabs.length - 1].id : 'home'
		}
	}

	closeAllTabs() {
		this.tabs.value = [{ id: 'home', title: 'Home', icon: '⊞', canClose: false }]
		this.activeTab.value = 'home'
	}

	navigateToPlugin(id) {
		const card = launchers.find(c => c.id === id)
		if (card) this.openTab(card)
	}

	_initDrawerDrag() {
		const root = this.shadowRoot
		if (!root) return
		const handle = root.querySelector('.drawer-handle')
		const drawer = root.querySelector('.bottom-drawer')
		if (!handle || !drawer) return

		let startY = 0
		let startTranslate = 0
		const getMaxY = () => {
			const rect = drawer.getBoundingClientRect()
			return window.innerHeight - 32 - rect.height
		}

		const onStart = (e) => {
			e.preventDefault()
			const touch = e.touches ? e.touches[0] : e
			startY = touch.clientY
			const style = window.getComputedStyle(drawer)
			const matrix = new DOMMatrixReadOnly(style.transform)
			startTranslate = matrix.m42
			drawer.classList.add('dragging')
			document.addEventListener('mousemove', onMove)
			document.addEventListener('mouseup', onEnd)
			document.addEventListener('touchmove', onMove, { passive: false })
			document.addEventListener('touchend', onEnd)
		}

		const onMove = (e) => {
			e.preventDefault()
			const touch = e.touches ? e.touches[0] : e
			const dy = touch.clientY - startY
			const maxTranslate = 0
			const minTranslate = getMaxY() + 40
			const newY = Math.max(minTranslate, Math.min(maxTranslate, startTranslate + dy))
			drawer.style.transform = `translateY(${newY}px)`
		}

		const onEnd = () => {
			drawer.classList.remove('dragging')
			document.removeEventListener('mousemove', onMove)
			document.removeEventListener('mouseup', onEnd)
			document.removeEventListener('touchmove', onMove)
			document.removeEventListener('touchend', onEnd)
			const style = window.getComputedStyle(drawer)
			const matrix = new DOMMatrixReadOnly(style.transform)
			const currentY = matrix.m42
			const threshold = getMaxY() * 0.4
			if (currentY > threshold) {
				this.bottomDrawerOpen.value = false
			} else {
				this.bottomDrawerOpen.value = true
			}
			drawer.style.transform = ''
		}

		handle.addEventListener('mousedown', onStart)
		handle.addEventListener('touchstart', onStart, { passive: false })
	}

	_initSidePanelDrag() {
		const root = this.shadowRoot
		if (!root) return
		const panel = root.querySelector('.side-panel')
		const header = root.querySelector('.side-header')
		if (!panel || !header) return

		let startX = 0
		let startTranslate = 0
		const panelWidth = () => panel.getBoundingClientRect().width

		const onStart = (e) => {
			if (e.target.closest('button')) return
			e.preventDefault()
			const touch = e.touches ? e.touches[0] : e
			startX = touch.clientX
			const style = window.getComputedStyle(panel)
			const matrix = new DOMMatrixReadOnly(style.transform)
			startTranslate = matrix.m41
			panel.classList.add('dragging')
			document.addEventListener('mousemove', onMove)
			document.addEventListener('mouseup', onEnd)
			document.addEventListener('touchmove', onMove, { passive: false })
			document.addEventListener('touchend', onEnd)
		}

		const onMove = (e) => {
			e.preventDefault()
			const touch = e.touches ? e.touches[0] : e
			const dx = touch.clientX - startX
			const maxTranslate = 0
			const minTranslate = -panelWidth()
			const newX = Math.max(minTranslate, Math.min(maxTranslate, startTranslate + dx))
			panel.style.transform = `translateX(${newX}px)`
		}

		const onEnd = () => {
			panel.classList.remove('dragging')
			document.removeEventListener('mousemove', onMove)
			document.removeEventListener('mouseup', onEnd)
			document.removeEventListener('touchmove', onMove)
			document.removeEventListener('touchend', onEnd)
			const style = window.getComputedStyle(panel)
			const matrix = new DOMMatrixReadOnly(style.transform)
			const currentX = matrix.m41
			const threshold = -panelWidth() * 0.4
			if (currentX < threshold) {
				this.sidePanelOpen.value = false
			} else {
				this.sidePanelOpen.value = true
			}
			panel.style.transform = ''
		}

		header.addEventListener('mousedown', onStart)
		header.addEventListener('touchstart', onStart, { passive: false })
	}

	onMount() {
		window.navigateToPlugin = this.navigateToPlugin.bind(this)
		initAll()
		for (const p of plugins) {
			if (p.onMount) p.onMount(this)
		}
		this.delegate('input', '#card-search', (e) => {
			this.searchQuery.value = e.target.value
		})
		this.delegate('click', '#btn-search-clear', () => {
			this.searchQuery.value = ''
			const input = this.shadowRoot && this.shadowRoot.querySelector('#card-search')
			if (input) input.value = ''
		})
		this.delegate('click', '[data-open-tab]', (e) => {
			const el = e.target.closest('[data-open-tab]')
			if (!el) return
			const card = launchers.find(c => c.id === el.dataset.openTab)
			if (card) this.openTab(card)
		})
		this.delegate('click', '[data-tab]', (e) => {
			const el = e.target.closest('[data-tab]')
			if (!el) return
			this.activeTab.value = el.dataset.tab
		})
		this.delegate('click', '[data-close-tab]', (e) => {
			const el = e.target.closest('[data-close-tab]')
			if (!el) return
			this.closeTab(el.dataset.closeTab)
		})
		this.delegate('click', '[data-close-all]', () => {
			this.closeAllTabs()
		})
		this.delegate('click', '#btn-bottom-drawer', () => {
			this.bottomDrawerOpen.value = !this.bottomDrawerOpen.value
		})
		this.delegate('click', '[data-bottom-tab]', (e) => {
			const el = e.target.closest('[data-bottom-tab]')
			if (!el) return
			this.bottomDrawerTab.value = el.dataset.bottomTab
			this.bottomDrawerOpen.value = true
		})
		this.delegate('click', '#btn-close-bottom-drawer', () => {
			this.bottomDrawerOpen.value = false
		})
		this.delegate('click', '#btn-side-panel', () => {
			this.sidePanelOpen.value = !this.sidePanelOpen.value
		})
		this.delegate('click', '[data-side-tab]', (e) => {
			const el = e.target.closest('[data-side-tab]')
			if (!el) return
			this.sidePanelTab.value = el.dataset.sideTab
			this.sidePanelOpen.value = true
		})
		this.delegate('click', '#btn-close-side-panel', () => {
			this.sidePanelOpen.value = false
		})
		this.delegate('click', '.drawer-overlay', (e) => {
			if (e.target.classList.contains('drawer-overlay')) {
				this.bottomDrawerOpen.value = false
				this.sidePanelOpen.value = false
			}
		})
		this.delegate('click', '[data-copy-text]', (e) => {
			const el = e.target.closest('[data-copy-text]')
			if (!el) return
			const text = el.dataset.copyText
			navigator.clipboard.writeText(text).then(() => {
				el.textContent = '✓'
				setTimeout(() => el.textContent = '📋', 1000)
			}).catch(() => alert('Copy failed'))
		})

		this._initDrawerDrag()
		this._initSidePanelDrag()

		window.addEventListener('backend-log', (e) => {
			const term = this.shadowRoot && this.shadowRoot.querySelector('terminal-view')
			if (term) term.addLog(e.detail.msg, e.detail.level)
		})
	}

	render() {
		const q = this.searchQuery.value
		const tabs = this.tabs.value
		const active = this.activeTab.value
		const bottomOpen = this.bottomDrawerOpen.value
		const bottomTab = this.bottomDrawerTab.value
		const sideOpen = this.sidePanelOpen.value
		const sideTab = this.sidePanelTab.value

		const visible = q
			? launchers.filter(c => fuzzyMatch(c.title + ' ' + c.desc, q))
			: launchers

		requestAnimationFrame(() => {
			this._initDrawerDrag()
			this._initSidePanelDrag()
		})

		return `
      <style>${styles}</style>
      <div class="shell-wrap">
        ${renderTabBar(tabs, active)}
        ${renderTabContent(tabs, active, q, visible)}
      </div>
      ${renderStatusBar(bottomOpen, bottomTab, sideOpen, sideTab)}
      ${renderOverlay(bottomOpen, sideOpen)}
      ${renderBottomDrawer(bottomOpen, bottomTab)}
      ${renderSidePanel(sideOpen, sideTab, tabs, active, bottomOpen, q)}`
	}
}

customElements.define('system-dashboard', SystemDashboard)
