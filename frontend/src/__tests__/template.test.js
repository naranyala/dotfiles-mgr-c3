import { describe, it, expect, beforeEach } from 'bun:test'
import { html, TemplateResult, classMap, styleMap, when, each, render, reconcile } from '../core/template.js'

describe('classMap', () => {
	it('should return space-separated class names for truthy values', () => {
		const result = classMap({ active: true, hidden: false, selected: true })
		expect(result).toBe('active selected')
	})

	it('should return empty string for all falsy', () => {
		const result = classMap({ a: false, b: 0, c: null })
		expect(result).toBe('')
	})

	it('should handle empty object', () => {
		const result = classMap({})
		expect(result).toBe('')
	})

	it('should handle truthy non-boolean values', () => {
		const result = classMap({ a: 1, b: 'yes', c: [] })
		expect(result).toBe('a b c')
	})
})

describe('styleMap', () => {
	it('should return semicolon-separated styles', () => {
		const result = styleMap({ color: 'red', fontSize: '14px' })
		expect(result).toBe('color:red;fontSize:14px')
	})

	it('should exclude null/undefined values', () => {
		const result = styleMap({ color: 'red', bg: null, size: undefined })
		expect(result).toBe('color:red')
	})

	it('should handle zero as valid value', () => {
		const result = styleMap({ padding: 0 })
		expect(result).toBe('padding:0')
	})

	it('should handle empty object', () => {
		const result = styleMap({})
		expect(result).toBe('')
	})
})

describe('html tagged template', () => {
	it('should return a TemplateResult', () => {
		const result = html`<div></div>`
		expect(result).toBeInstanceOf(TemplateResult)
	})

	it('should interpolate string values', () => {
		const name = 'world'
		const result = html`<div>Hello ${name}</div>`
		expect(result.toString()).toBe('<div>Hello world</div>')
	})

	it('should interpolate number values', () => {
		const count = 42
		const result = html`<span>${count}</span>`
		expect(result.toString()).toBe('<span>42</span>')
	})

	it('should handle null/undefined interpolation', () => {
		const result = html`<div>${null}${undefined}</div>`
		expect(result.toString()).toBe('<div></div>')
	})

	it('should capture event handlers', () => {
		const handler = () => {}
		const result = html`<button @click=${handler}>Click</button>`
		expect(result.events.size).toBe(1)
		expect(result.toString()).toContain('data-e=')
	})

	it('should capture nested TemplateResult children', () => {
		const inner = html`<span>inner</span>`
		const result = html`<div>${inner}</div>`
		expect(result.children.size).toBe(1)
	})

	it('should handle multiple interpolations', () => {
		const a = 'A'
		const b = 'B'
		const result = html`<div>${a} and ${b}</div>`
		expect(result.toString()).toBe('<div>A and B</div>')
	})

	it('should handle boolean event handlers', () => {
		const handler = () => {}
		const result = html`<input @input=${handler} />`
		expect(result.events.size).toBe(1)
	})
})

describe('when', () => {
	it('should return then_ when condition is true', () => {
		const result = when(true, 'yes', 'no')
		expect(result).toBe('yes')
	})

	it('should return else_ when condition is false', () => {
		const result = when(false, 'yes', 'no')
		expect(result).toBe('no')
	})

	it('should return empty TemplateResult when condition false and no else', () => {
		const result = when(false, 'yes')
		expect(result).toBeInstanceOf(TemplateResult)
		expect(result.toString()).toBe('')
	})
})

describe('each', () => {
	it('should map items to results', () => {
		const result = each([1, 2, 3], (item) => html`<span>${item}</span>`)
		expect(result).toBeInstanceOf(TemplateResult)
		expect(result.toString()).toContain('<span>1</span>')
		expect(result.toString()).toContain('<span>2</span>')
		expect(result.toString()).toContain('<span>3</span>')
	})

	it('should return empty TemplateResult for empty array', () => {
		const result = each([], (item) => html`<div>${item}</div>`)
		expect(result).toBeInstanceOf(TemplateResult)
		expect(result.toString()).toBe('')
	})

	it('should return empty TemplateResult for null/undefined', () => {
		const result = each(null, (item) => html`<div>${item}</div>`)
		expect(result.toString()).toBe('')
	})

	it('should pass index to callback', () => {
		const indices = []
		each(['a', 'b'], (item, i) => {
			indices.push(i)
			return html`<div>${item}</div>`
		})
		expect(indices).toEqual([0, 1])
	})

	it('should collect events from items', () => {
		const handler = () => {}
		const result = each([1], (item) => html`<button @click=${handler}>${item}</button>`)
		expect(result.events.size).toBe(1)
	})
})

// reconcile tests require DOM API (document.createElement)
describe('reconcile (DOM)', () => {
	it('should update text content', () => {
		const container = new MockNode(1, 'DIV')
		const span = new MockNode(1, 'SPAN')
		span.appendChild(Object.assign(new MockNode(3, '#text'), { _nodeValue: 'old' }))
		container.appendChild(span)
		reconcile(container, '<span>new</span>')
		expect(container.querySelector('span').textContent).toBe('new')
	})

	it('should add new children', () => {
		const container = new MockNode(1, 'DIV')
		const p = new MockNode(1, 'P')
		p.appendChild(Object.assign(new MockNode(3, '#text'), { _nodeValue: 'keep' }))
		container.appendChild(p)
		reconcile(container, '<p>keep</p><span>added</span>')
		expect(container.childNodes.length).toBe(2)
	})

	it('should remove extra children', () => {
		const container = new MockNode(1, 'DIV')
		const p = new MockNode(1, 'P')
		p.appendChild(Object.assign(new MockNode(3, '#text'), { _nodeValue: 'a' }))
		container.appendChild(p)
		const span = new MockNode(1, 'SPAN')
		span.appendChild(Object.assign(new MockNode(3, '#text'), { _nodeValue: 'b' }))
		container.appendChild(span)
		const i = new MockNode(1, 'I')
		i.appendChild(Object.assign(new MockNode(3, '#text'), { _nodeValue: 'c' }))
		container.appendChild(i)
		reconcile(container, '<p>a</p>')
		expect(container.childNodes.length).toBe(1)
	})

	it('should update attributes', () => {
		const container = new MockNode(1, 'DIV')
		const div = new MockNode(1, 'DIV')
		div._attributes = { class: 'old' }
		container.appendChild(div)
		reconcile(container, '<div class="new"></div>')
		expect(container.querySelector('div').getAttribute('class')).toBe('new')
	})
})

class MockNode {
	constructor(nodeType, name) {
		this.nodeType = nodeType
		this.nodeName = name
		this._nodeValue = ''
		this.parentNode = null
		this.childNodes = []
		this.children = []
		this._attributes = {}
	}
	get nodeValue() { return this._nodeValue }
	set nodeValue(v) { this._nodeValue = v }
	get textContent() {
		if (this.nodeType === 3) return this._nodeValue
		return this.childNodes.map(c => c.textContent).join('')
	}
	set textContent(v) { this._nodeValue = v }
	get innerHTML() {
		return this.childNodes.map(c => {
			if (c.nodeType === 3) return c.nodeValue || c.textContent
			if (c.nodeType === 8) return `<!--${c.nodeValue}-->`
			const attrs = Object.entries(c._attributes || {}).map(([k, v]) => v === '' ? k : `${k}="${v}"`).join(' ')
			const tag = c.nodeName.toLowerCase()
			return `<${tag}${attrs ? ' ' + attrs : ''}>${c.innerHTML}</${tag}>`
		}).join('')
	}
	set innerHTML(html) {
		this.childNodes = []
		this.children = []
		if (html) this._parseHTML(html, this)
	}
	_parseHTML(str, parent) {
		let i = 0
		while (i < str.length) {
			if (str[i] === '<') {
				if (str.substring(i, i + 4) === '<!--') {
					const end = str.indexOf('-->', i)
					if (end === -1) break
					const comment = new MockNode(8, '#comment')
					comment._nodeValue = str.substring(i + 4, end)
					parent.appendChild(comment)
					i = end + 3
				} else if (str[i + 1] === '/') {
					const end = str.indexOf('>', i)
					i = end === -1 ? str.length : end + 1
				} else {
					const tagEnd = str.indexOf('>', i)
					if (tagEnd === -1) break
					const tagContent = str.substring(i + 1, tagEnd)
					const selfClosing = tagContent.endsWith('/')
					const cleanTag = selfClosing ? tagContent.slice(0, -1).trim() : tagContent.trim()
					const spaceIdx = cleanTag.indexOf(' ')
					const tagName = spaceIdx > -1 ? cleanTag.substring(0, spaceIdx) : cleanTag
					const el = new MockNode(1, tagName.toUpperCase())
					if (spaceIdx > -1) {
						const attrsStr = cleanTag.substring(spaceIdx + 1)
						const attrRe = /([\w-]+)(?:="([^"]*)"|=([^\s>]+))?/g
						let m
						while ((m = attrRe.exec(attrsStr)) !== null) {
							el._attributes[m[1]] = m[2] ?? m[3] ?? ''
						}
					}
					parent.appendChild(el)
					if (!selfClosing) {
						const innerEnd = str.indexOf(`</${tagName}`, tagEnd + 1)
						if (innerEnd === -1) { break } else {
							this._parseHTML(str.substring(tagEnd + 1, innerEnd), el)
							i = str.indexOf('>', innerEnd)
							if (i === -1) break
							i++
						}
					} else { i = tagEnd + 1 }
				}
			} else {
				const nextTag = str.indexOf('<', i)
				const text = nextTag === -1 ? str.substring(i) : str.substring(i, nextTag)
				if (text) {
					const t = new MockNode(3, '#text')
					t._nodeValue = text
					parent.appendChild(t)
				}
				i = nextTag === -1 ? str.length : nextTag
			}
		}
	}
	appendChild(child) {
		if (child.parentNode) {
			const oi = child.parentNode.childNodes.indexOf(child)
			if (oi >= 0) child.parentNode.childNodes.splice(oi, 1)
			const oci = child.parentNode.children.indexOf(child)
			if (oci >= 0) child.parentNode.children.splice(oci, 1)
		}
		child.parentNode = this
		this.childNodes.push(child)
		if (child.nodeType === 1) this.children.push(child)
		return child
	}
	removeChild(child) {
		const i = this.childNodes.indexOf(child)
		if (i >= 0) this.childNodes.splice(i, 1)
		const ci = this.children.indexOf(child)
		if (ci >= 0) this.children.splice(ci, 1)
		child.parentNode = null
		return child
	}
	replaceChild(newNode, oldNode) {
		const i = this.childNodes.indexOf(oldNode)
		if (i >= 0) {
			if (newNode.parentNode) {
				const oi = newNode.parentNode.childNodes.indexOf(newNode)
				if (oi >= 0) newNode.parentNode.childNodes.splice(oi, 1)
			}
			newNode.parentNode = this
			this.childNodes[i] = newNode
			if (newNode.nodeType === 1) {
				const ci = this.children.indexOf(oldNode)
				if (ci >= 0) this.children[ci] = newNode
			}
		}
		oldNode.parentNode = null
		return oldNode
	}
	insertBefore(newNode, refNode) {
		if (newNode.parentNode) {
			const oi = newNode.parentNode.childNodes.indexOf(newNode)
			if (oi >= 0) newNode.parentNode.childNodes.splice(oi, 1)
		}
		newNode.parentNode = this
		const idx = refNode ? this.childNodes.indexOf(refNode) : this.childNodes.length
		this.childNodes.splice(idx, 0, newNode)
		if (newNode.nodeType === 1) {
			const ci = refNode ? this.children.indexOf(refNode) : this.children.length
			this.children.splice(ci, 0, newNode)
		}
		return newNode
	}
	get firstChild() { return this.childNodes[0] || null }
	cloneNode(deep) {
		const c = new MockNode(this.nodeType, this.nodeName)
		c._nodeValue = this._nodeValue
		c._attributes = { ...this._attributes }
		if (deep) for (const ch of this.childNodes) c.appendChild(ch.cloneNode(true))
		return c
	}
	setAttribute(n, v) { this._attributes[n] = v }
	getAttribute(n) { return this._attributes[n] ?? null }
	hasAttribute(n) { return n in this._attributes }
	removeAttribute(n) { delete this._attributes[n] }
	get attributes() { return Object.entries(this._attributes).map(([name, value]) => ({ name, value })) }
	querySelector(sel) {
		for (const c of this.childNodes) {
			if (c.nodeType === 1) {
				if (c.nodeName.toLowerCase() === sel) return c
				const f = c.querySelector(sel)
				if (f) return f
			}
		}
		return null
	}
}

globalThis.document = {
	createElement(tag) {
		if (tag === 'template') {
			const t = new MockNode(1, 'TEMPLATE')
			t._content = new MockNode(11, '#document-fragment')
			Object.defineProperty(t, 'content', { get() { return t._content } })
			Object.defineProperty(t, 'innerHTML', {
				set(v) { t._content.innerHTML = v },
				get() { return t._content.innerHTML },
			})
			return t
		}
		return new MockNode(1, tag)
	},
	createDocumentFragment() { return new MockNode(11, '#document-fragment') },
	importNode(node, deep) { return node.cloneNode(deep) },
}
globalThis.Node = MockNode
globalThis.Node.TEXT_NODE = 3
globalThis.Node.ELEMENT_NODE = 1
globalThis.Node.COMMENT_NODE = 8
globalThis.Node.DOCUMENT_FRAGMENT_NODE = 11
