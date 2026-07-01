import { reactive } from '../../core/signals.js'
import { html } from '../../core/template.js'

function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

export const state = reactive({
	bashrcPath: '~/.bashrc',
	bashrcContent: '',
	originalContent: '',
	backupName: '',
	backups: [],
	loading: false,
	error: null,
	saved: false,
	changed: false,
	backupCreated: false,
	backupRestored: false,
	// Diff view state
	comparing: false,
	selectedBackup: null,
	backupContent: '',
	diffOutput: '',
	useUnified: true
})

export async function init() {
	state.loading = true
	try {
		const home = await window.rpc.shell.execRead('echo $HOME')
		state.bashrcPath = home?.output?.trim() ? `${home.output.trim()}/.bashrc` : '~/.bashrc'
		
		// Load current bashrc
		await loadBashrc()
		
		// Load existing backups
		await loadBackups()
	} catch (e) {
		state.error = e.message
	} finally {
		state.loading = false
	}
}

async function loadBashrc() {
	try {
		const expandedPath = state.bashrcPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
		const result = await window.rpc.shell.execRead(`cat ${expandedPath} 2>/dev/null || echo ""`)
		if (result && result.output) {
			state.bashrcContent = result.output
			state.originalContent = result.output
		} else {
			state.bashrcContent = '# No .bashrc file found\n# Create one below:'
			state.originalContent = state.bashrcContent
		}
		state.changed = false
	} catch (e) {
		state.error = e.message
	}
}

async function loadBackups() {
	try {
		const backupDir = state.bashrcPath.replace('/.bashrc', '/.bashrc-backups')
		const expanded = backupDir.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
		
		const result = await window.rpc.shell.execRead(`ls -la ${expanded}/ 2>/dev/null || mkdir -p ${expanded} && ls -la ${expanded}/ 2>/dev/null`)
		if (result && result.output) {
			const lines = result.output.trim().split('\n').filter(l => l.trim() && !l.includes('total') && !l.includes('drwx'))
			state.backups = lines.map(line => {
				const parts = line.trim().split(/\s+/)
				const size = parts[4]
				const date = parts[5] + ' ' + parts[6] + ' ' + parts[7]
				const filename = parts.slice(8).join(' ')
				return { filename, size, date }
			}).filter(b => b.filename.endsWith('.bak') || b.filename.endsWith('.backup'))
		}
	} catch (e) {
		// No backups directory exists yet
		console.log('No backups directory found')
	}
}

async function loadBackupContent(backupFile) {
	try {
		const backupDir = state.bashrcPath.replace('/.bashrc', '/.bashrc-backups')
		const expanded = backupDir.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
		
		const result = await window.rpc.shell.execRead(`cat ${expanded}/${backupFile} 2>/dev/null || echo ""`)
		if (result && result.output) {
			state.backupContent = result.output
		}
		
		// Generate diff
		generateDiff()
	} catch (e) {
		state.error = e.message
	}
}

function generateDiff() {
	const currentLines = state.bashrcContent.split('\n')
	const backupLines = state.backupContent.split('\n')
	
	if (state.useUnified) {
		// Simple unified diff implementation
		const diffLines = []
		const maxLen = Math.max(currentLines.length, backupLines.length)
		
		for (let i = 0; i < maxLen; i++) {
			const current = currentLines[i] || null
			const backup = backupLines[i] || null
			
			if (current === backup) {
				diffLines.push(`  ${current || ''}`)
			} else if (current !== null && backup !== null) {
				diffLines.push(`- ${backup}`)
				diffLines.push(`+ ${current}`)
			} else if (backup === null) {
				diffLines.push(`+ ${current}`)
			} else if (current === null) {
				diffLines.push(`- ${backup}`)
			}
		}
		
		state.diffOutput = diffLines.join('\n')
	} else {
		// Side-by-side comparison
		const maxLen = Math.max(currentLines.length, backupLines.length)
		const sideBySide = []
		
		for (let i = 0; i < maxLen; i++) {
			const current = currentLines[i] || ''
			const backup = backupLines[i] || ''
			const lineNum = i + 1
			
			const currentMark = current !== backup ? '✓' : ' '
			const backupMark = current !== backup ? '✗' : ' '
			
			sideBySide.push(`${String(lineNum).padStart(4)} | ${backupMark} ${backup.padEnd(50)} | ${currentMark} ${current}`)
		}
		
		state.diffOutput = sideBySide.join('\n')
	}
}

export function onMount(component) {
	// Save current bashrc
	component.delegate('click', '#btn-save-bashrc', async () => {
		state.loading = true
		try {
			const expandedPath = state.bashrcPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			
			// Ensure directory exists
			const dir = expandedPath.split('/').slice(0, -1).join('/')
			
			// Write the file
			await window.rpc.shell.writeFile(expandedPath, state.bashrcContent)
			
			// Reload to confirm save
			await loadBashrc()
			
			state.saved = true
			state.changed = false
			setTimeout(() => state.saved = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	// Create backup
	component.delegate('click', '#btn-backup-bashrc', async () => {
		state.loading = true
		try {
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			const backupName = state.backupName || `bashrc-backup-${timestamp}`
			
			const backupDir = state.bashrcPath.replace('/.bashrc', '/.bashrc-backups')
			const expandedBackupDir = backupDir.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			const expandedPath = state.bashrcPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			
			// Create backup directory if it doesn't exist
			await window.rpc.shell.execRead(`mkdir -p ${expandedBackupDir}`)
			
			// Copy current bashrc to backup
			await window.rpc.shell.execRead(`cp ${expandedPath} ${expandedBackupDir}/${backupName}.bak`)
			
			state.backupName = ''
			state.backupCreated = true
			setTimeout(() => state.backupCreated = false, 2000)
			
			// Refresh backups list
			await loadBackups()
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	// Restore from backup
	component.delegate('click', '[data-restore-backup]', async (e) => {
		const backupFile = e.target.closest('[data-restore-backup]').dataset.restoreBackup
		state.loading = true
		try {
			const backupDir = state.bashrcPath.replace('/.bashrc', '/.bashrc-backups')
			const expandedBackupDir = backupDir.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			const expandedPath = state.bashrcPath.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			
			// Restore backup
			await window.rpc.shell.execRead(`cp ${expandedBackupDir}/${backupFile} ${expandedPath}`)
			
			// Reload the content
			await loadBashrc()
			
			state.backupRestored = true
			state.changed = false
			setTimeout(() => state.backupRestored = false, 2000)
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	// Delete backup
	component.delegate('click', '[data-delete-backup]', async (e) => {
		const backupFile = e.target.closest('[data-delete-backup]').dataset.deleteBackup
		if (!confirm(`Delete backup "${backupFile}"? This cannot be undone.`)) return
		
		state.loading = true
		try {
			const backupDir = state.bashrcPath.replace('/.bashrc', '/.bashrc-backups')
			const expandedBackupDir = backupDir.replace('~', (await window.rpc.shell.execRead('echo $HOME')).output.trim())
			
			await window.rpc.shell.execRead(`rm ${expandedBackupDir}/${backupFile}`)
			
			// Refresh backups list
			await loadBackups()
		} catch (e) {
			state.error = e.message
		} finally {
			state.loading = false
		}
	})

	// Reset to original (when page loaded)
	component.delegate('click', '#btn-reset-bashrc', () => {
		state.bashrcContent = state.originalContent
		state.changed = false
	})

	// Track changes
	component.delegate('input', '#bashrc-content', (e) => {
		state.bashrcContent = e.target.value
		state.changed = state.bashrcContent !== state.originalContent
	})
	
	component.delegate('input', '#backup-name', (e) => {
		state.backupName = e.target.value
	})

	// Compare with backup
	component.delegate('click', '[data-compare-backup]', async (e) => {
		const backupFile = e.target.closest('[data-compare-backup]').dataset.compareBackup
		state.comparing = true
		state.selectedBackup = backupFile
		
		try {
			await loadBackupContent(backupFile)
		} catch (e) {
			state.error = e.message
			state.comparing = false
		}
	})

	// Close compare view
	component.delegate('click', '#btn-close-compare', () => {
		state.comparing = false
		state.selectedBackup = null
		state.backupContent = ''
		state.diffOutput = ''
	})

	// Toggle diff view style
	component.delegate('click', '[data-toggle-diff]', (e) => {
		state.useUnified = e.target.closest('[data-toggle-diff]').dataset.toggleDiff === 'unified'
		generateDiff()
	})
}

export function render() {
	const { bashrcPath, bashrcContent, backupName, backups, loading, error, saved, changed, backupCreated, backupRestored } = state

	return html`
		<div class="card">
			<div class="hdr">Bash Configuration Editor</div>
			<div class="bd">
				<p style="margin-bottom:12px">Read, edit, backup, and restore your .bashrc file.</p>
				
				${error ? `<div class="err" style="margin-bottom:12px">Error: ${error}</div>` : ''}
				${saved ? `<div style="color:#22c55e;margin-bottom:12px">✓ .bashrc saved successfully!</div>` : ''}
				${backupCreated ? `<div style="color:#22c55e;margin-bottom:12px">✓ Backup created successfully!</div>` : ''}
				${backupRestored ? `<div style="color:#22c55e;margin-bottom:12px">✓ Backup restored successfully!</div>` : ''}
				
				<div style="margin-bottom:8px">
					<span style="color:#64748b;font-size:0.8rem">File:</span>
					<code style="background:rgba(255,255,255,0.02);padding:2px 6px;border-radius:4px;font-size:0.8rem;margin-left:8px">${bashrcPath}</code>
					${changed ? `<span style="color:#fbbf24;margin-left:8px;font-size:0.8rem">(unsaved changes)</span>` : ''}
				</div>
				
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<button id="btn-save-bashrc" ${loading ? 'disabled' : ''} style="padding:8px 16px;background:rgba(0,255,0,0.1);border:1px solid rgba(0,255,0,0.3);border-radius:4px;cursor:pointer;${!changed ? 'opacity:0.5;cursor:not-allowed;' : ''}">
						${loading ? 'Saving...' : '💾 Save .bashrc'}
					</button>
					<button id="btn-reset-bashrc" ${loading ? 'disabled' : ''} style="padding:8px 16px;background:rgba(255,255,0,0.1);border:1px solid rgba(255,255,0,0.3);border-radius:4px;cursor:pointer">
						🔙 Reset
					</button>
				</div>
				
				<label style="display:block;margin-bottom:4px;font-weight:600">.bashrc Content</label>
				<textarea id="bashrc-content" 
					style="width:100%;min-height:300px;font-family:monospace;font-size:0.85rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:12px;line-height:1.5" 
					placeholder="# Bash configuration file">${bashrcContent}</textarea>
				
				<div style="margin-top:12px;color:#64748b;font-size:0.75rem">
					Tip: Use Ctrl+F to search, edits are tracked in real-time
				</div>
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Backup & Restore</div>
			<div class="bd">
				<div style="display:flex;gap:8px;margin-bottom:12px">
					<input id="backup-name" value="${backupName}" placeholder="backup-name (optional, auto-timestamped)" style="flex:1" />
					<button id="btn-backup-bashrc" ${loading ? 'disabled' : ''} style="padding:8px 16px;background:rgba(0,100,255,0.1);border:1px solid rgba(0,100,255,0.3);border-radius:4px;cursor:pointer">
						${loading ? 'Creating...' : '💾 Create Backup'}
					</button>
				</div>
				
				${backups.length > 0 ? `
					<div style="margin-top:12px">
						<div style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Existing Backups:</div>
						<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">
							${backups.map(backup => {
								const displayName = backup.filename.replace('.bak', '').replace('.backup', '')
								const isComparing = state.selectedBackup === backup.filename
								return html`
									<div class="card" style="background:rgba(255,255,255,0.02);border:1px solid ${isComparing ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.05)'};padding:12px">
										<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
											<div>
												<div style="font-size:0.85rem;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${displayName}</div>
												<div style="font-size:0.75rem;color:#64748b;margin-top:2px">${backup.size} • ${backup.date}</div>
											</div>
										</div>
										<div style="display:flex;gap:6px;justify-content:flex-end">
											<button data-compare-backup="${backup.filename}" 
												style="padding:4px 8px;background:rgba(0,100,255,0.1);border:1px solid rgba(0,100,255,0.3);border-radius:4px;cursor:pointer;font-size:0.75rem"
												title="Compare with current">
												🔍 Compare
											</button>
											<button data-restore-backup="${backup.filename}" 
												style="padding:4px 8px;background:rgba(0,255,0,0.1);border:1px solid rgba(0,255,0,0.3);border-radius:4px;cursor:pointer;font-size:0.75rem"
												title="Restore this backup">
												↻ Restore
											</button>
											<button data-delete-backup="${backup.filename}" 
												style="padding:4px 8px;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);border-radius:4px;cursor:pointer;font-size:0.75rem"
												title="Delete this backup">
												🗑️ Delete
											</button>
										</div>
									</div>
								`
							}).join('')}
						</div>
					</div>
				` : `
					<div style="color:#64748b;text-align:center;padding:20px">
						No backups yet. Create your first backup above!
					</div>
				`}
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Quick Actions</div>
			<div class="bd">
				<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" 
						onclick="navigator.clipboard.writeText('# Common Aliases\\nalias ll=\"ls -la\"\\nalias gs=\"git status\"\\nalias ga=\"git add .\"');alert('Copied common aliases to clipboard!')">
						📋 Copy Aliases
					</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" 
						onclick="alert('Feature: Open .bashrc in default editor')">
						📝 Edit Externally
					</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" 
						onclick="alert('Feature: Validate .bashrc syntax')">
						✅ Validate Syntax
					</button>
					<button style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer" 
						onclick="window.open('https://bash-guide.gitbooks.io/bash-guide/content/','_blank')">
						📖 Bash Guide
					</button>
				</div>
			</div>
		</div>
		
		<div class="card" style="margin-top:12px">
			<div class="hdr">Common .bashrc Sections</div>
			<div class="bd">
				<div style="font-size:0.8rem;color:#64748b;margin-bottom:8px">Click to copy templates:</div>
				<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px">
					<button onclick="navigator.clipboard.writeText('#!/bin/bash\\n# If not running interactively, don\\'t do anything\\ncase $- in\\n  *i*) ;;&\\n  *) return;;&\\nesac');alert('Copied!')" 
						style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer;text-align:left;font-size:0.8rem">
						✨ Bash Guard
					</button>
					<button onclick="navigator.clipboard.writeText('alias ll=\"ls -la\"\\nalias la=\"ls -la\"\\nalias l=\"ls -l\"\\nalias g=\"git\"\\nalias gs=\"git status\"\\nalias ga=\"git add .\"\\nalias gc=\"git commit -m\"');alert('Copied!')" 
						style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer;text-align:left;font-size:0.8rem">
						🔧 Common Aliases
					</button>
					<button onclick="navigator.clipboard.writeText('export PS1=\"\\u@\\h:\\w\\$ \\"');alert('Copied!')" 
						style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer;text-align:left;font-size:0.8rem">
						🎨 Prompt Style
					</button>
					<button onclick="navigator.clipboard.writeText('export PATH=\"$PATH:/usr/local/bin\"\\nexport EDITOR=\"nano\"\\nexport BROWSER=\"firefox\"');alert('Copied!')" 
						style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;cursor:pointer;text-align:left;font-size:0.8rem">
						⚙️ Environment Vars
					</button>
				</div>
			</div>
		</div>
		
		${state.comparing ? `
			<div class="card" style="margin-top:12px;border:1px solid rgba(0,212,255,0.3);background:rgba(0,212,255,0.02)">
				<div class="hdr">
					Comparing: ${state.selectedBackup}
					<button id="btn-close-compare" style="margin-left:auto;background:none;border:none;color:#e2e8f0;cursor:pointer;font-size:0.9rem">✕</button>
				</div>
				<div class="bd">
					<div style="display:flex;gap:8px;margin-bottom:12px">
						<button data-toggle-diff="unified" class="${state.useUnified ? 'active' : ''}" style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer">
							Unified Diff
						</button>
						<button data-toggle-diff="sidebyside" class="${!state.useUnified ? 'active' : ''}" style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer">
							Side by Side
						</button>
					</div>
					
					${state.diffOutput ? `
						<div style="overflow-x:auto">
							${state.useUnified ? `
								<pre style="font-family:monospace;font-size:0.75rem;line-height:1.4;white-space:pre-wrap;background:rgba(0,0,0,0.2);padding:12px;border-radius:4px;overflow:auto">${escapeHtml(state.diffOutput)}</pre>
							` : `
								<pre style="font-family:monospace;font-size:0.7rem;line-height:1.4;white-space:pre-wrap;background:rgba(0,0,0,0.2);padding:12px;border-radius:4px;overflow:auto">${escapeHtml(state.diffOutput)}</pre>
							`}
						</div>
						<div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end">
							<button onclick="alert('Feature coming soon: Copy diff to clipboard')" style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer">
								📋 Copy Diff
							</button>
						</div>
					` : `
						<div style="color:#64748b;text-align:center;padding:20px">
							No differences found or backup could not be loaded.
						</div>
					`}
				</div>
			</div>
		` : ''}
	`
}
