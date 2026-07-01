/**
 * HTML Rendering Patterns
 * Common safe rendering patterns for reuse across the frontend
 */

import { escapeHtml, escapeAttr } from './html-safe.js'

/**
 * Render a list of items safely
 * @param {Array} items - Array of items to render
 * @param {Function} renderFn - Function that takes item and returns HTML string
 * @returns {string} Safe HTML for the list
 */
export function renderList(items, renderFn) {
	if (!Array.isArray(items)) return ''
	return items.map(item => {
		try {
			return renderFn(item) || ''
		} catch (e) {
			console.error('Error rendering list item:', e)
			return ''
		}
	}).join('')
}

/**
 * Render table rows safely
 * @param {Array} rows - Array of row objects
 * @param {Array} columns - Array of column definitions {key, label, format}
 * @returns {string} Safe HTML table rows
 */
export function renderTableRows(rows, columns) {
	if (!Array.isArray(rows)) return ''
	
	return rows.map(row =>
		`<tr>${columns.map(col => {
			const value = row[col.key] ?? ''
			const formatted = col.format ? col.format(value) : value
			return `<td>${escapeHtml(String(formatted))}</td>`
		}).join('')}</tr>`
	).join('')
}

/**
 * Render key-value pairs safely
 * @param {Object} obj - Object with key-value pairs
 * @returns {string} Safe HTML for key-value display
 */
export function renderKeyValue(obj) {
	if (typeof obj !== 'object' || obj === null) return ''
	
	return Object.entries(obj).map(([key, value]) =>
		`<div style="display:flex;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.1)">
			<span style="font-weight:600;width:150px;color:#cbd5e1">${escapeHtml(String(key))}</span>
			<span>${escapeHtml(String(value))}</span>
		</div>`
	).join('')
}

/**
 * Render a badge with optional count
 * @param {string} text - Badge text
 * @param {number} [count] - Optional count badge
 * @param {string} [color] - Badge color class or style
 * @returns {string} Safe HTML badge
 */
export function renderBadge(text, count, color = '') {
	const textEscaped = escapeHtml(String(text))
	const countHtml = count !== undefined ? `<span style="margin-left:4px;padding:0 4px;background:rgba(0,0,0,0.3);border-radius:2px">${count}</span>` : ''
	
	return `<span style="display:inline-block;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:4px;${color}">${textEscaped}${countHtml}</span>`
}

/**
 * Render error message safely
 * @param {string} message - Error message
 * @param {string} [code] - Optional error code
 * @returns {string} Safe HTML error display
 */
export function renderError(message, code = '') {
	const msgEscaped = escapeHtml(String(message || 'Unknown error'))
	const codeHtml = code ? `<code style="display:block;margin-top:4px;padding:4px;background:rgba(0,0,0,0.3);font-size:0.8rem;font-family:monospace">${escapeHtml(String(code))}</code>` : ''
	
	return `<div style="padding:12px;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:4px;color:#fca5a5">
		<div>${msgEscaped}</div>
		${codeHtml}
	</div>`
}

/**
 * Render success message safely
 * @param {string} message - Success message
 * @returns {string} Safe HTML success display
 */
export function renderSuccess(message) {
	const msgEscaped = escapeHtml(String(message))
	return `<div style="padding:12px;background:rgba(34,197,94,0.1);border-left:3px solid #22c55e;border-radius:4px;color:#86efac">
		${msgEscaped}
	</div>`
}

/**
 * Render warning message safely
 * @param {string} message - Warning message
 * @returns {string} Safe HTML warning display
 */
export function renderWarning(message) {
	const msgEscaped = escapeHtml(String(message))
	return `<div style="padding:12px;background:rgba(251,191,36,0.1);border-left:3px solid #fbbf24;border-radius:4px;color:#fcd34d">
		${msgEscaped}
	</div>`
}

/**
 * Render code block safely
 * @param {string} code - Code to display
 * @param {string} [language] - Language hint (for styling)
 * @returns {string} Safe HTML code block
 */
export function renderCode(code, language = '') {
	const codeEscaped = escapeHtml(String(code))
	const langClass = language ? escapeHtml(String(language)) : ''
	
	return `<pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:4px;overflow:auto;font-size:0.8rem;font-family:ui-monospace,'Fira Code',monospace" class="language-${langClass}"><code>${codeEscaped}</code></pre>`
}

/**
 * Render tag/chip safely
 * @param {string} text - Tag text
 * @param {Function} [onRemove] - Optional remove callback
 * @returns {string} Safe HTML tag/chip
 */
export function renderTag(text, onRemove) {
	const textEscaped = escapeHtml(String(text))
	const removeBtn = onRemove ? `<button style="margin-left:4px;padding:0 2px;background:none;border:none;color:inherit;cursor:pointer;font-size:0.9em">✕</button>` : ''
	
	return `<span style="display:inline-flex;align-items:center;padding:4px 8px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.5);border-radius:4px;font-size:0.85rem;color:#93c5fd">
		${textEscaped}${removeBtn}
	</span>`
}

/**
 * Render loading skeleton safely
 * @param {number} [lines] - Number of lines to show
 * @returns {string} Safe HTML skeleton loader
 */
export function renderSkeleton(lines = 3) {
	const skeletons = Array(lines).fill(0).map(() =>
		`<div style="height:16px;background:linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2), rgba(255,255,255,0.1));background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:4px;margin-bottom:8px"></div>`
	).join('')
	
	return `<div>${skeletons}</div>`
}

/**
 * Render breadcrumb trail safely
 * @param {Array} breadcrumbs - Array of {label, href?}
 * @returns {string} Safe HTML breadcrumbs
 */
export function renderBreadcrumbs(breadcrumbs) {
	if (!Array.isArray(breadcrumbs)) return ''
	
	return breadcrumbs.map((crumb, index) => {
		const label = escapeHtml(String(crumb.label))
		const href = crumb.href ? `href="${escapeAttr(crumb.href)}"` : ''
		const isLast = index === breadcrumbs.length - 1
		const separator = !isLast ? '<span style="margin:0 8px;color:#64748b">/</span>' : ''
		
		const element = href 
			? `<a ${href} style="color:#3b82f6;text-decoration:none">${label}</a>`
			: `<span>${label}</span>`
		
		return element + separator
	}).join('')
}

/**
 * Render a description list (dt/dd pairs) safely
 * @param {Object} items - Object with label: value pairs
 * @returns {string} Safe HTML description list
 */
export function renderDescriptionList(items) {
	if (typeof items !== 'object' || items === null) return ''
	
	const pairs = Object.entries(items).map(([label, value]) =>
		`<dt style="font-weight:600;color:#cbd5e1;margin-top:8px">${escapeHtml(String(label))}</dt>
		 <dd style="margin:4px 0 0 0;color:#e2e8f0">${escapeHtml(String(value))}</dd>`
	).join('')
	
	return `<dl style="margin:0">${pairs}</dl>`
}
