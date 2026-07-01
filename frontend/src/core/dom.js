export function morph(oldNode, newNode) {
	if (oldNode.nodeType !== newNode.nodeType) {
		oldNode.parentNode?.replaceChild(newNode.cloneNode(true), oldNode)
		return
	}

	if (oldNode.nodeType === Node.TEXT_NODE) {
		if (oldNode.nodeValue !== newNode.nodeValue) {
			oldNode.nodeValue = newNode.nodeValue
		}
		return
	}

	if (oldNode.nodeType === Node.ELEMENT_NODE || oldNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
		const oldEl = oldNode
		const newEl = newNode

		if (oldNode.nodeType === Node.ELEMENT_NODE) {
			if (oldEl.tagName !== newEl.tagName) {
				oldEl.parentNode?.replaceChild(newEl.cloneNode(true), oldEl)
				return
			}

			const oldAttrs = oldEl.attributes
			const newAttrs = newEl.attributes

			for (let i = oldAttrs.length - 1; i >= 0; i--) {
				const name = oldAttrs[i].name
				if (!newEl.hasAttribute(name)) {
					oldEl.removeAttribute(name)
				}
			}

			for (let i = 0; i < newAttrs.length; i++) {
				const name = newAttrs[i].name
				const value = newAttrs[i].value

				if (name === 'value' && oldEl.value !== undefined) {
					if (oldEl.value !== value) {
						oldEl.value = value
					}
				} else if (oldEl.getAttribute(name) !== value) {
					oldEl.setAttribute(name, value)
				}
			}
		}

		const oldChildren = Array.from(oldNode.childNodes)
		const newChildren = Array.from(newNode.childNodes)
		const maxLen = Math.max(oldChildren.length, newChildren.length)

		for (let i = 0; i < maxLen; i++) {
			if (i >= oldChildren.length) {
				oldNode.appendChild(newChildren[i].cloneNode(true))
			} else if (i >= newChildren.length) {
				oldNode.removeChild(oldChildren[i])
			} else {
				morph(oldChildren[i], newChildren[i])
			}
		}
	}
}
