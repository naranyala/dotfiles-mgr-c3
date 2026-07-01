/**
 * HTML Safety Utilities
 * Prevents common rendering issues by validating and escaping HTML content
 */

/**
 * Escapes HTML special characters to prevent injection and attribute breakage
 * @param {string} str - The string to escape
 * @returns {string} Escaped string safe for HTML content
 */
export function escapeHtml(str) {
	if (typeof str !== 'string') return ''
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

/**
 * Escapes attribute values specifically (for data-* attributes, etc)
 * @param {string} str - The string to use as an attribute value
 * @returns {string} Escaped string safe for HTML attributes
 */
export function escapeAttr(str) {
	if (typeof str !== 'string') return ''
	return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Validates that a string is safe to use in HTML rendering
 * @param {string} str - The string to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateHtmlSafety(str) {
	if (typeof str !== 'string') {
		return { valid: false, error: 'Value must be a string' }
	}

	// Check for unescaped quotes that could break attributes
	const unescapedQuotes = str.match(/(?<!&quot;)"|(?<!&#39;)'/g)
	if (unescapedQuotes && unescapedQuotes.length > 0) {
		return { valid: false, error: 'Unescaped quotes detected in attribute value' }
	}

	// Check for suspicious HTML-like content
	if (/<|>|script|onerror|onclick/i.test(str)) {
		return { valid: false, error: 'Potentially malicious HTML content detected' }
	}

	return { valid: true }
}

/**
 * Safely renders a button with a command attribute
 * @param {string} cmd - The command to run
 * @param {string} label - The button label text
 * @param {string} icon - The icon character/emoji
 * @param {string} [extraStyles] - Additional CSS styles
 * @returns {string} Safe HTML button element
 */
export function renderCommandButton(cmd, label, icon, extraStyles = '') {
	if (typeof cmd !== 'string' || typeof label !== 'string') {
		console.warn('Invalid command button parameters:', { cmd, label })
		return ''
	}

	const escapedCmd = escapeAttr(cmd)
	const escapedLabel = escapeHtml(label)
	const escapedIcon = escapeHtml(icon)
	
	const baseStyles = 'font-size:0.75rem;padding:5px 8px;white-space:normal;max-width:90px;overflow:hidden;text-overflow:ellipsis'
	const styles = extraStyles ? `${baseStyles};${extraStyles}` : baseStyles

	return `<button data-run-cmd="${escapedCmd}" class="btn-icon" style="${styles}">${escapedIcon} ${escapedLabel}</button>`
}

/**
 * Sanitizes user input before rendering (removes dangerous content)
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
	if (typeof input !== 'string') return ''
	
	// Remove script tags and event handlers
	let cleaned = input
		.replace(/<script[^>]*>.*?<\/script>/gi, '')
		.replace(/on\w+\s*=/gi, '')
		.replace(/javascript:/gi, '')

	// Escape remaining HTML
	return escapeHtml(cleaned)
}

/**
 * Validates and escapes a string for safe use in data attributes
 * @param {string} value - The value to validate
 * @returns {string} Safe escaped value, or empty string if invalid
 */
export function safeDataAttr(value) {
	if (typeof value !== 'string') return ''
	
	const validation = validateHtmlSafety(value)
	if (!validation.valid) {
		console.warn('Unsafe data attribute value:', { value, reason: validation.error })
		return ''
	}

	return escapeAttr(value)
}

/**
 * Safely concatenate CSS styles, validating for injection
 * @param {...string} styles - Style strings to concatenate
 * @returns {string} Safe combined styles
 */
export function validateStyles(...styles) {
	return styles
		.filter(s => typeof s === 'string')
		.map(s => {
			// Basic validation: no script or expression injection
			if (/expression|javascript|import|@/i.test(s)) {
				console.warn('Potentially unsafe CSS:', s)
				return ''
			}
			return s
		})
		.filter(Boolean)
		.join(';')
}
