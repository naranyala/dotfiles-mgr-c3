import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

export const state = reactive({
	searchQuery: '',
	selectedSection: 'all',
	currentPage: '',
	currentManpage: '',
	manpages: [],
	manpageContent: '',
	manpageHistory: [],
	sections: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
	sectionNames: {
		'1': 'General Commands',
		'2': 'System Calls',
		'3': 'Library Functions',
		'4': 'Special Files',
		'5': 'File Formats',
		'6': 'Games',
		'7': 'Conventions',
		'8': 'System Administration',
		'9': 'Kernel Routines'
	},
	bookmarks: [],
	newBookmarkName: '',
	editingBookmark: null,
	loading: false,
	error: null,
	loaded: false,
	showAll: false,
	showBookmarks: true,
	showHistory: true,
	itemsPerPage: 50,
	currentPageNum: 1
})

export async function init() {
	state.loading = true
	try {
		loadBookmarks()
		await scanManpages()
		state.loaded = true
	} catch (e) {
		state.error = e.message
	} finally {
		state.loading = false
	}
}

function loadBookmarks() {
	try {
		const saved = localStorage.getItem('manpageBookmarksV2')
		if (saved) {
			state.bookmarks = JSON.parse(saved)
		}
	} catch (e) {
		console.log('Could not load bookmarks:', e.message)
	}
}

function saveBookmarks() {
	try {
		localStorage.setItem('manpageBookmarksV2', JSON.stringify(state.bookmarks))
	} catch (e) {
		console.log('Could not save bookmarks:', e.message)
	}
}

async function scanManpages() {
	state.loading = true
	try {
		const result = await window.rpc.shell.execRead('man -w -a 2>/dev/null | sort -u | head -500')
		if (result && result.output) {
			const rawPages = result.output.trim().split('\n').filter(name => name.trim())
			state.manpages = rawPages.map(name => {
				const parts = name.split('.')
				return {
					name: parts[0],
					section: parts.length > 1 ? parts[parts.length - 1] : '1',
					fullName: name,
					description: getDescription(parts[0], parts.length > 1 ? parts[parts.length - 1] : '1')
				}
			}).filter((page, index, self) => {
				return index === self.findIndex(p => p.name === page.name && p.section === page.section)
			})
		} else {
			state.manpages = getCommonManpages()
		}
	} catch (e) {
		console.log('Using fallback:', e.message)
		state.manpages = getCommonManpages()
	} finally {
		state.loading = false
	}
}

function getCommonManpages() {
	return [
		{ name: 'ls', section: '1', fullName: 'ls.1', description: 'list directory contents' },
		{ name: 'cd', section: '1', fullName: 'cd.1', description: 'change directory' },
		{ name: 'grep', section: '1', fullName: 'grep.1', description: 'print lines matching a pattern' },
		{ name: 'find', section: '1', fullName: 'find.1', description: 'search for files' },
		{ name: 'ssh', section: '1', fullName: 'ssh.1', description: 'OpenSSH client' },
		{ name: 'git', section: '1', fullName: 'git.1', description: 'content tracker' },
		{ name: 'tar', section: '1', fullName: 'tar.1', description: 'archiving utility' },
		{ name: 'gzip', section: '1', fullName: 'gzip.1', description: 'compression utility' },
		{ name: 'curl', section: '1', fullName: 'curl.1', description: 'transfer a URL' },
		{ name: 'wget', section: '1', fullName: 'wget.1', description: 'network downloader' }
	]
}

function getDescription(name, section) {
	const descriptions = {
		'ls': 'list directory contents', 'cd': 'change directory', 'grep': 'print lines matching a pattern',
		'find': 'search for files in a directory hierarchy', 'ssh': 'OpenSSH remote login client',
		'git': 'the stupid content tracker', 'tar': 'an archiving utility', 'gzip': 'compression utility',
		'curl': 'transfer a URL', 'wget': 'non-interactive network downloader', 'man': 'format and display man pages',
		'cp': 'copy files and directories', 'mv': 'move/rename files', 'rm': 'remove files or directories',
		'mkdir': 'make directories', 'rmdir': 'remove empty directories', 'chmod': 'change file mode bits',
		'chown': 'change file owner and group', 'ps': 'process status', 'kill': 'send a signal to a process'
	}
	return descriptions[name.toLowerCase()] || `section ${section} manual`
}

async function fetchManpage(name, section = null) {
	state.loading = true
	state.error = null
	state.currentPage = name
	state.currentManpage = name
	
	try {
		let manCmd = section ? `man ${section} ${name}` : `man ${name}`
		const result = await window.rpc.shell.execRead(`${manCmd} 2>&1 | col -bx`)
		
		if (result && result.output) {
			state.manpageContent = result.output
			if (!state.manpageHistory.find(h => h.name === name && h.section === section)) {
				state.manpageHistory.push({ name, section, timestamp: Date.now() })
				if (state.manpageHistory.length > 50) state.manpageHistory.shift()
			}
		} else {
			state.error = `Manpage for '${name}' not found`
			state.manpageContent = ''
		}
	} catch (e) {
		state.error = `Failed to fetch manpage: ${e.message}`
		state.manpageContent = ''
	} finally {
		state.loading = false
	}
}

function filterManpages() {
	let filtered = [...state.manpages]
	if (state.searchQuery) {
		const query = state.searchQuery.toLowerCase()
		filtered = filtered.filter(page => 
			page.name.toLowerCase().includes(query) ||
			page.fullName.toLowerCase().includes(query) ||
			(page.description && page.description.toLowerCase().includes(query))
		)
	}
	if (state.selectedSection !== 'all') {
		filtered = filtered.filter(page => page.section === state.selectedSection)
	}
	return filtered
}

function getSectionCounts() {
	const counts = { all: state.manpages.length }
	state.sections.forEach(section => {
		counts[section] = state.manpages.filter(p => p.section === section).length
	})
	return counts
}

function getPagedManpages() {
	const filtered = filterManpages()
	const start = (state.currentPageNum - 1) * state.itemsPerPage
	const end = start + state.itemsPerPage
	return {
		pages: filtered.slice(start, end),
		totalPages: Math.ceil(filtered.length / state.itemsPerPage),
		totalItems: filtered.length
	}
}

export function onMount(component) {
	component.delegate('input', '#manpage-search', (e) => {
		state.searchQuery = e.target.value.toLowerCase()
		state.currentPageNum = 1
	})

	component.delegate('click', '[data-section]', (e) => {
		const section = e.target.closest('[data-section]').dataset.section
		state.selectedSection = section
		state.currentPageNum = 1
	})

	component.delegate('click', '[data-view-manpage]', (e) => {
		const name = e.target.closest('[data-view-manpage]').dataset.viewManpage
		const section = e.target.closest('[data-view-manpage]').dataset.section || null
		fetchManpage(name, section)
	})

	component.delegate('click', '#prev-page', () => {
		if (state.currentPageNum > 1) state.currentPageNum--
	})
	
	component.delegate('click', '#next-page', () => {
		const paged = getPagedManpages()
		if (state.currentPageNum < paged.totalPages) state.currentPageNum++
	})
	
	component.delegate('click', '[data-page]', (e) => {
		state.currentPageNum = parseInt(e.target.closest('[data-page]').dataset.page)
	})

	component.delegate('click', '[data-bookmark-manpage]', (e) => {
		const name = e.target.closest('[data-bookmark-manpage]').dataset.bookmarkManpage
		const section = e.target.closest('[data-bookmark-manpage]').dataset.section || null
		if (!state.bookmarks.find(b => b.name === name && b.section === section)) {
			state.bookmarks.push({ name, section, created: Date.now(), notes: '' })
			saveBookmarks()
		} else {
			state.error = `Already bookmarked: ${name}`
		}
	})

	component.delegate('click', '[data-remove-bookmark]', (e) => {
		const index = parseInt(e.target.closest('[data-remove-bookmark]').dataset.removeBookmark)
		state.bookmarks.splice(index, 1)
		saveBookmarks()
	})

	component.delegate('click', '[data-view-bookmark]', (e) => {
		const index = parseInt(e.target.closest('[data-view-bookmark]').dataset.viewBookmark)
		const bookmark = state.bookmarks[index]
		fetchManpage(bookmark.name, bookmark.section)
	})

	component.delegate('click', '[data-view-history]', (e) => {
		const index = parseInt(e.target.closest('[data-view-history]').dataset.viewHistory)
		const history = state.manpageHistory[index]
		fetchManpage(history.name, history.section)
	})

	component.delegate('click', '#clear-history', () => {
		if (confirm('Clear manpage history?')) state.manpageHistory = []
	})

	component.delegate('click', '#clear-bookmarks', () => {
		if (confirm('Clear all bookmarks?')) {
			state.bookmarks = []
			saveBookmarks()
		}
	})

	component.delegate('click', '#toggle-bookmarks', () => {
		state.showBookmarks = !state.showBookmarks
	})
	
	component.delegate('click', '#toggle-history', () => {
		state.showHistory = !state.showHistory
	})

	component.delegate('click', '#refresh-manpages', () => {
		scanManpages()
	})
}

export function render() {
	const { searchQuery, selectedSection, currentPage, manpageContent, manpageHistory, bookmarks, loading, error, loaded, showBookmarks, showHistory } = state
	const sectionCounts = getSectionCounts()
	const paged = getPagedManpages()

	return html`
		<div class="card">
			<div class="hdr">
				Manpage Reader
				<div style="margin-left:auto;display:flex;gap:8px">
					<button id="refresh-manpages" style="padding:4px 8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;font-size:0.75rem">↻ Refresh</button>
					<button id="toggle-bookmarks" style="padding:4px 8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;font-size:0.75rem">
						${showBookmarks ? '📚 Hide' : '📚 Show'} Bookmarks
					</button>
					<button id="toggle-history" style="padding:4px 8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;font-size:0.75rem">
						${showHistory ? '🕒 Hide' : '🕒 Show'} History
					</button>
				</div>
			</div>
			<div class="bd">
				<p style="margin-bottom:12px">Browse and bookmark system manpages with persistent storage and better navigation.</p>
				${error ? `<div class="err" style="margin-bottom:12px">${error}</div>` : ''}
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<input id="manpage-search" value="${searchQuery}" placeholder="Search manpages..." 
						style="flex:1;padding:8px;border:1px solid rgba(255,255,255,0.05);border-radius:4px;background:rgba(255,255,255,0.02);color:#e2e8f0;font-size:0.85rem" />
				</div>
				<div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">
					<button data-section="all" class="${selectedSection === 'all' ? 'active' : ''}" 
						style="padding:6px 10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer;font-size:0.75rem">
						All (${sectionCounts.all})
					</button>
					${state.sections.map(section => {
						const count = sectionCounts[section] || 0
						return html`<button data-section="${section}" class="${selectedSection === section ? 'active' : ''}" 
							style="padding:6px 10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:4px;cursor:pointer;font-size:0.75rem">${section}: ${count}</button>`
					}).join('')}
				</div>
			</div>
		</div>
		
		${currentPage ? html`
			<div class="card" style="margin-top:12px">
				<div class="hdr">
					<div style="display:flex;align-items:center;gap:8px">
						<span style="font-family:monospace;color:#818cf8">${currentPage}</span>
						<span style="color:#64748b">- man page</span>
					</div>
					<div style="margin-left:auto;display:flex;gap:8px">
						<button data-bookmark-manpage="${currentPage}" data-section="1" 
							style="padding:4px 10px;background:rgba(0,255,0,0.1);border:1px solid rgba(0,255,0,0.3);border-radius:4px;cursor:pointer;font-size:0.75rem">⭐ Bookmark</button>
						<button onclick="navigator.clipboard.writeText('man ${currentPage}');alert('Copied!')" 
							style="padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;font-size:0.75rem">📋 Copy</button>
					</div>
				</div>
				<div class="bd" style="max-height:500px;overflow-y:auto">
					${loading ? `<div style="display:flex;align-items:center;justify-content:center;padding:40px;color:#64748b"><div class="spinner"></div><span style="margin-left:10px">Loading...</span></div>` : 
					 error ? `<div class="err">${error}</div>` : 
					 manpageContent ? `<pre style="font-family:monospace;font-size:0.75rem;line-height:1.5;white-space:pre-wrap;background:rgba(0,0,0,0.2);padding:12px;border-radius:4px;margin:0">${escapeHtml(manpageContent)}</pre>` : 
					`<div style="color:#64748b;text-align:center;padding:20px">Manpage content not available</div>`}
				</div>
			</div>
		` : ''}
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Available Manpages (${sectionCounts.all} total)</div>
			<div class="bd">
				${!loaded ? `<div style="display:flex;align-items:center;justify-content:center;padding:40px;color:#64748b"><div class="spinner"></div><span style="margin-left:10px">Scanning system manpages...</span></div>` : 
				 paged.pages.length === 0 ? `<div style="color:#64748b;text-align:center;padding:20px">No manpages found matching your criteria</div>` : html`
					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
						${paged.pages.map(page => html`
							<button data-view-manpage="${page.name}" data-section="${page.section}" 
								style="text-align:left;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" 
								onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
								<div style="font-size:0.9rem;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace">${page.name}</div>
								<div style="font-size:0.75rem;color:#64748b;margin-top:4px">Section ${page.section}: ${page.description || ''}</div>
							</button>
						`).join('')}
					</div>
					${paged.totalPages > 1 ? html`
						<div style="display:flex;justify-content:center;gap:8px;margin-top:12px">
							<button id="prev-page" ${state.currentPageNum === 1 ? 'disabled' : ''} style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer">← Previous</button>
							<span style="padding:6px 12px;color:#64748b">Page ${state.currentPageNum} of ${paged.totalPages}</span>
							<button id="next-page" ${state.currentPageNum === paged.totalPages ? 'disabled' : ''} style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer">Next →</button>
						</div>
					` : ''}
				`}
			</div>
		</div>
		
		${showBookmarks && bookmarks.length > 0 ? html`
			<div class="card" style="margin-top:12px">
				<div class="hdr">📚 Bookmarked Manpages (${bookmarks.length})<button id="clear-bookmarks" style="margin-left:auto;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.75rem">Clear All</button></div>
				<div class="bd">
					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
						${bookmarks.map((bookmark, index) => html`
							<div class="card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);padding:10px;border-radius:6px">
								<div style="display:flex;justify-content:space-between;align-items:flex-start">
									<button data-view-bookmark="${index}" style="background:none;border:none;color:#e2e8f0;cursor:pointer;font-size:0.85rem;flex:1;text-align:left;font-family:monospace">${bookmark.name}</button>
									<button data-remove-bookmark="${index}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem">✕</button>
								</div>
								${bookmark.notes ? html`<div style="font-size:0.7rem;color:#64748b;margin-top:4px">${bookmark.notes}</div>` : ''}
								<div style="font-size:0.7rem;color:#64748b;margin-top:4px">Section ${bookmark.section || '1'} • ${new Date(bookmark.created).toLocaleDateString()}</div>
							</div>
						`).join('')}
					</div>
				</div>
			</div>
		` : ''}
		
		${showHistory && manpageHistory.length > 0 ? html`
			<div class="card" style="margin-top:12px">
				<div class="hdr">🕒 Recently Viewed (${manpageHistory.length})<button id="clear-history" style="margin-left:auto;background:none;border:none;color:#64748b;cursor:pointer;font-size:0.75rem">Clear</button></div>
				<div class="bd">
					<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
						${manpageHistory.slice().reverse().map((history, index) => {
							const revIndex = manpageHistory.length - 1 - index
							return html`<button data-view-history="${revIndex}" style="text-align:left;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer">
								<div style="font-size:0.9rem;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace">${history.name}</div>
								<div style="font-size:0.75rem;color:#64748b;margin-top:4px">Section ${history.section || '1'}</div>
							</button>`
						}).join('')}
					</div>
				</div>
			</div>
		` : ''}
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Quick Stats</div>
			<div class="bd">
				<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
					<div style="text-align:center">
						<div style="font-size:1.5rem;color:#818cf8">${sectionCounts.all}</div>
						<div style="font-size:0.75rem;color:#64748b">Total Manpages</div>
					</div>
					<div style="text-align:center">
						<div style="font-size:1.5rem;color:#22c55e">${bookmarks.length}</div>
						<div style="font-size:0.75rem;color:#64748b">Bookmarks</div>
					</div>
					<div style="text-align:center">
						<div style="font-size:1.5rem;color:#fbbf24">${manpageHistory.length}</div>
						<div style="font-size:0.75rem;color:#64748b">History Items</div>
					</div>
				</div>
			</div>
		</div>
	`
}

function escapeHtml(s) {
	return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]))
}
