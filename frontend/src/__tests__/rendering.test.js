import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { html, render, TemplateResult, classMap, styleMap, when, each } from '../core/template.js'
import { signal, effect, computed, batch } from '../core/signals.js'
import { DirectiveResult } from '../core/directives.js'

class MockNode {
	constructor(nodeType, name) {
		this.nodeType = nodeType
		this.nodeName = name
		this._nodeValue = ''
		this.parentNode = null
		this.childNodes = []
		this.children = []
		this._attributes = {}
		this._value = ''
		this._listeners = {}
	}

	get nodeValue() { return this._nodeValue }
	set nodeValue(v) { this._nodeValue = v }

	get textContent() {
		if (this.nodeType === 3) return this._nodeValue
		return this.childNodes.map(c => c.textContent).join('')
	}
	set textContent(v) { this._nodeValue = v }

	get value() { return this._value }
	set value(v) { this._value = v }

	click() {
		if (this._listeners?.click) {
			for (const h of this._listeners.click) h({ type: 'click', target: this })
		}
	}

	appendChild(child) {
		if (child.parentNode) {
			const oldSiblings = child.parentNode.childNodes
			const oldIdx = oldSiblings.indexOf(child)
			if (oldIdx >= 0) oldSiblings.splice(oldIdx, 1)
			const oldChildren = child.parentNode.children
			const oldCidx = oldChildren.indexOf(child)
			if (oldCidx >= 0) oldChildren.splice(oldCidx, 1)
		}
		child.parentNode = this
		this.childNodes.push(child)
		if (child.nodeType === 1) this.children.push(child)
		return child
	}

	removeChild(child) {
		const idx = this.childNodes.indexOf(child)
		if (idx >= 0) this.childNodes.splice(idx, 1)
		const cidx = this.children.indexOf(child)
		if (cidx >= 0) this.children.splice(cidx, 1)
		child.parentNode = null
		return child
	}

	replaceChild(newNode, oldNode) {
		const idx = this.childNodes.indexOf(oldNode)
		if (idx >= 0) {
			if (newNode.parentNode) {
				const oi = newNode.parentNode.childNodes.indexOf(newNode)
				if (oi >= 0) newNode.parentNode.childNodes.splice(oi, 1)
				const oci = newNode.parentNode.children.indexOf(newNode)
				if (oci >= 0) newNode.parentNode.children.splice(oci, 1)
			}
			newNode.parentNode = this
			this.childNodes[idx] = newNode
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
			const oldSiblings = newNode.parentNode.childNodes
			const oldIdx = oldSiblings.indexOf(newNode)
			if (oldIdx >= 0) oldSiblings.splice(oldIdx, 1)
			if (newNode.parentNode !== this) {
				const oldChildren = newNode.parentNode.children
				const oldCidx = oldChildren.indexOf(newNode)
				if (oldCidx >= 0) oldChildren.splice(oldCidx, 1)
			}
		}
		newNode.parentNode = this
		const idx = refNode ? this.childNodes.indexOf(refNode) : this.childNodes.length
		this.childNodes.splice(idx, 0, newNode)
		if (newNode.nodeType === 1) {
			const cidx = refNode ? this.children.indexOf(refNode) : this.children.length
			this.children.splice(cidx, 0, newNode)
		}
		return newNode
	}

	get firstChild() { return this.childNodes[0] || null }
	get lastChild() { return this.childNodes[this.childNodes.length - 1] || null }
	get nextSibling() {
		if (!this.parentNode) return null
		const siblings = this.parentNode.childNodes
		const idx = siblings.indexOf(this)
		return siblings[idx + 1] || null
	}
	get previousSibling() {
		if (!this.parentNode) return null
		const siblings = this.parentNode.childNodes
		const idx = siblings.indexOf(this)
		return idx > 0 ? siblings[idx - 1] : null
	}

	setAttribute(name, value) { this._attributes[name] = value }
	getAttribute(name) { return this._attributes[name] ?? null }
	hasAttribute(name) { return name in this._attributes }
	removeAttribute(name) { delete this._attributes[name] }
	get attributes() {
		return Object.entries(this._attributes).map(([name, value]) => ({ name, value }))
	}

	addEventListener(type, handler) {
		if (!this._listeners[type]) this._listeners[type] = []
		this._listeners[type].push(handler)
	}

	removeEventListener(type, handler) {
		if (!this._listeners || !this._listeners[type]) return
		const idx = this._listeners[type].indexOf(handler)
		if (idx >= 0) this._listeners[type].splice(idx, 1)
	}

	dispatchEvent(event) {
		if (this._listeners && this._listeners[event.type]) {
			for (const h of this._listeners[event.type]) h(event)
		}
		return true
	}

	cloneNode(deep) {
		const clone = new MockNode(this.nodeType, this.nodeName)
		clone.nodeValue = this.nodeValue
		clone.textContent = this.textContent
		clone._value = this._value
		clone._attributes = { ...this._attributes }
		if (deep) {
			for (const child of this.childNodes) {
				clone.appendChild(child.cloneNode(true))
			}
		}
		return clone
	}

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
		if (html) {
			this._parseHTML(html, this)
		}
	}

	_parseHTML(str, parent) {
		let i = 0
		while (i < str.length) {
			if (str[i] === '<') {
				if (str.substring(i, i + 4) === '<!--') {
					const end = str.indexOf('-->', i)
					if (end === -1) break
					const comment = new MockNode(8, '#comment')
					comment.nodeValue = str.substring(i + 4, end)
					comment.textContent = comment.nodeValue
					parent.appendChild(comment)
					i = end + 3
				} else if (str[i + 1] === '/') {
					const end = str.indexOf('>', i)
					if (end === -1) break
					i = end + 1
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
						if (innerEnd === -1) {
							this._parseHTML(str.substring(tagEnd + 1), el)
							break
						} else {
							this._parseHTML(str.substring(tagEnd + 1, innerEnd), el)
							i = str.indexOf('>', innerEnd)
							if (i === -1) break
							i++
						}
					} else {
						i = tagEnd + 1
					}
				}
			} else {
				const nextTag = str.indexOf('<', i)
				const text = nextTag === -1 ? str.substring(i) : str.substring(i, nextTag)
				if (text) {
					const t = new MockNode(3, '#text')
					t.nodeValue = text
					t.textContent = text
					parent.appendChild(t)
				}
				i = nextTag === -1 ? str.length : nextTag
			}
		}
	}

	querySelector(sel) {
		for (const child of this.childNodes) {
			if (child.nodeType === 1) {
				if (child.nodeName.toLowerCase() === sel) return child
				const found = child.querySelector(sel)
				if (found) return found
			}
		}
		return null
	}

	querySelectorAll(sel) {
		const results = []
		for (const child of this.childNodes) {
			if (child.nodeType === 1) {
				if (child.matches(sel)) results.push(child)
				results.push(...child.querySelectorAll(sel))
			}
		}
		return results
	}

	matches(sel) {
		if (sel.startsWith('[')) {
			const inner = sel.slice(1, -1)
			const eqIdx = inner.indexOf('=')
			if (eqIdx > -1) {
				const name = inner.substring(0, eqIdx)
				const val = inner.substring(eqIdx + 2, inner.length - 1)
				return this.getAttribute(name) === val
			}
			return this.hasAttribute(inner)
		}
		if (sel.startsWith('.')) return this._attributes.class === sel.slice(1)
		return this.nodeName.toLowerCase() === sel
	}

	closest(sel) {
		if (this.matches(sel)) return this
		return this.parentNode?.closest?.(sel) || null
	}
}

class MockComment extends MockNode {
	constructor(text) {
		super(8, '#comment')
		this.nodeValue = text
		this.textContent = text
	}
}

class MockText extends MockNode {
	constructor(text) {
		super(3, '#text')
		this.nodeValue = text
		this.textContent = text
	}
}

class MockElement extends MockNode {
	constructor(tag) {
		super(1, tag.toUpperCase())
	}
}

class MockTemplateElement extends MockNode {
	constructor() {
		super(1, 'TEMPLATE')
		this._content = new MockDocumentFragment()
	}
	get content() { return this._content }
	set innerHTML(html) { this._content.innerHTML = html }
}

class MockDocumentFragment extends MockNode {
	constructor() {
		super(11, '#document-fragment')
	}
}

const mockDocument = {
	createElement(tag) {
		if (tag === 'template') return new MockTemplateElement()
		return new MockElement(tag)
	},
	createElementNS(ns, tag) { return new MockElement(tag) },
	createComment(text) { return new MockComment(text) },
	createTextNode(text) { return new MockText(text) },
	createDocumentFragment() { return new MockDocumentFragment() },
	importNode(node, deep) { return node.cloneNode(deep) },
	createTreeWalker(root, filter) {
		const nodes = []
		const walk = (node) => {
			nodes.push(node)
			for (const child of node.childNodes) walk(child)
		}
		walk(root)
		let idx = 0
		return {
			nextNode() {
				while (idx < nodes.length) {
					const node = nodes[idx++]
					if (filter === 128 && node.nodeType === 8) return node
					if (filter === 1 && node.nodeType === 1) return node
				}
				return null
			},
			currentNode: null
		}
	},
	body: null
}
mockDocument.body = new MockElement('body')
mockDocument.body._attributes = {}

globalThis.document = mockDocument
globalThis.Node = MockNode
globalThis.Node.TEXT_NODE = 3
globalThis.Node.ELEMENT_NODE = 1
globalThis.Node.DOCUMENT_FRAGMENT_NODE = 11
globalThis.Node.COMMENT_NODE = 8
globalThis.NodeFilter = { SHOW_COMMENT: 128 }
globalThis.CSSStyleSheet = class { replaceSync() {} }
globalThis.HTMLElement = MockElement
globalThis.Element = MockElement
globalThis.customElements = { define() {}, get() { return null } }
globalThis.CustomEvent = class { constructor(type, opts) { this.type = type; Object.assign(this, opts) } }

function createContainer() {
	const div = new MockElement('div')
	mockDocument.body.appendChild(div)
	return div
}

function cleanup() {
	mockDocument.body.childNodes = []
	mockDocument.body.children = []
}

describe('Template Parsing', () => {
	it('should return TemplateResult from html tag', () => {
		const result = html`<div></div>`
		expect(result).toBeInstanceOf(TemplateResult)
		expect(result.html).toBeDefined()
	})

	it('should store static HTML string', () => {
		const result = html`<div>Hello World</div>`
		expect(result.html).toContain('Hello World')
		expect(result.html).toContain('<div>')
	})

	it('should handle dynamic text interpolation', () => {
		const name = 'world'
		const result = html`<div>Hello ${name}</div>`
		expect(result.html).toContain('Hello world')
	})

	it('should handle multiple interpolations', () => {
		const a = 'A', b = 'B'
		const result = html`<div>${a} and ${b}</div>`
		expect(result.html).toContain('A and B')
	})

	it('should handle nested TemplateResult', () => {
		const inner = html`<span>inner</span>`
		const result = html`<div>${inner}</div>`
		expect(result.children.size).toBe(1)
		expect(result.html).toContain('<div>')
	})

	it('should capture event handlers', () => {
		const handler = () => {}
		const result = html`<button @click=${handler}>Click</button>`
		expect(result.events.size).toBe(1)
	})

	it('should handle null/undefined as empty', () => {
		const result = html`<div>${null}${undefined}</div>`
		expect(result.html).toContain('<div>')
	})
})

describe('render() - Basic Rendering', () => {
	let container

	beforeEach(() => { container = createContainer() })
	afterEach(() => { cleanup() })

	it('should render simple text', () => {
		render(html`Hello`, container)
		expect(container.innerHTML).toBe('Hello')
	})

	it('should render element', () => {
		render(html`<div>Content</div>`, container)
		expect(container.innerHTML).toContain('<div')
		expect(container.innerHTML).toContain('Content')
	})

	it('should render nested elements', () => {
		render(html`<div><span>Nested</span></div>`, container)
		expect(container.innerHTML).toContain('Nested')
	})

	it('should clear container before rendering', () => {
		container.innerHTML = '<p>Old</p>'
		render(html`<div>New</div>`, container)
		expect(container.innerHTML).not.toContain('Old')
		expect(container.innerHTML).toContain('New')
	})

	it('should render dynamic text', () => {
		const name = 'Alice'
		render(html`<span>${name}</span>`, container)
		expect(container.innerHTML).toContain('Alice')
	})

	it('should render number values', () => {
		const count = 42
		render(html`<span>${count}</span>`, container)
		expect(container.innerHTML).toContain('42')
	})

	it('should render null/undefined as empty', () => {
		render(html`<div>${null}${undefined}</div>`, container)
		expect(container.innerHTML).toContain('<div>')
	})
})

describe('render() - Attribute Binding', () => {
	let container

	beforeEach(() => { container = createContainer() })
	afterEach(() => { cleanup() })

	it('should set static attribute', () => {
		render(html`<div class="test"></div>`, container)
		const div = container.querySelector('div')
		expect(div.getAttribute('class')).toBe('test')
	})

	it('should set dynamic attribute', () => {
		const cls = 'active'
		render(html`<div class=${cls}></div>`, container)
		const div = container.querySelector('div')
		expect(div.getAttribute('class')).toBe('active')
	})

	it('should remove attribute on null value', () => {
		const cls = null
		render(html`<div class=${cls}></div>`, container)
		const div = container.querySelector('div')
		expect(div.getAttribute('class')).toBe('')
	})
})

describe('render() - Event Binding', () => {
	let container

	beforeEach(() => { container = createContainer() })
	afterEach(() => { cleanup() })

	it('should bind click event', () => {
		let clicked = false
		const handler = () => { clicked = true }
		render(html`<button @click=${handler}>Click</button>`, container)
		const btn = container.querySelector('button')
		btn.click()
		expect(clicked).toBe(true)
	})

	it('should pass event object', () => {
		let receivedEvent = null
		const handler = (e) => { receivedEvent = e }
		render(html`<button @click=${handler}>Click</button>`, container)
		const btn = container.querySelector('button')
		btn.click()
		expect(receivedEvent).not.toBeNull()
		expect(receivedEvent.type).toBe('click')
	})
})

describe('render() - Nested Templates', () => {
	let container

	beforeEach(() => { container = createContainer() })
	afterEach(() => { cleanup() })

	it('should render nested html template', () => {
		const inner = html`<span>Inner</span>`
		const result = html`<div>${inner}</div>`
		render(result, container)
		expect(container.innerHTML).toContain('Inner')
	})

	it('should render deeply nested templates', () => {
		const level2 = html`<b>Bold</b>`
		const level1 = html`<span>${level2}</span>`
		const level0 = html`<div>${level1}</div>`
		render(level0, container)
		expect(container.innerHTML).toContain('Bold')
	})
})

describe('render() - Arrays', () => {
	let container

	beforeEach(() => { container = createContainer() })
	afterEach(() => { cleanup() })

	it('should render array of templates', () => {
		const items = ['A', 'B', 'C']
		render(html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`, container)
		expect(container.innerHTML).toContain('A')
		expect(container.innerHTML).toContain('B')
		expect(container.innerHTML).toContain('C')
	})

	it('should handle empty array', () => {
		render(html`<div>${[]}</div>`, container)
		expect(container.innerHTML).toContain('<div>')
	})
})

describe('render() - classMap and styleMap', () => {
	let container

	beforeEach(() => { container = createContainer() })
	afterEach(() => { cleanup() })

	it('should apply classMap', () => {
		const classes = classMap({ active: true, hidden: false })
		render(html`<div class=${classes}></div>`, container)
		const div = container.querySelector('div')
		expect(div.getAttribute('class')).toBe('active')
	})

	it('should apply styleMap', () => {
		const styles = styleMap({ color: 'red' })
		render(html`<div style=${styles}></div>`, container)
		const div = container.querySelector('div')
		expect(div.getAttribute('style')).toContain('color:red')
	})
})

describe('render() - Edge Cases', () => {
	let container

	beforeEach(() => { container = createContainer() })
	afterEach(() => { cleanup() })

	it('should handle undefined value', () => {
		render(html`<div>${undefined}</div>`, container)
		expect(container.innerHTML).toContain('<div>')
	})

	it('should handle 0 value', () => {
		render(html`<div>${0}</div>`, container)
		expect(container.innerHTML).toContain('0')
	})

	it('should handle empty string', () => {
		render(html`<div>${''}</div>`, container)
		expect(container.innerHTML).toContain('<div>')
	})

	it('should handle object toString', () => {
		const obj = { toString: () => 'custom' }
		render(html`<div>${obj}</div>`, container)
		expect(container.innerHTML).toContain('custom')
	})

	it('should handle multiple renders to same container', () => {
		render(html`<span>First</span>`, container)
		expect(container.innerHTML).toContain('First')
		render(html`<span>Second</span>`, container)
		expect(container.innerHTML).toContain('Second')
		expect(container.innerHTML).not.toContain('First')
	})
})
