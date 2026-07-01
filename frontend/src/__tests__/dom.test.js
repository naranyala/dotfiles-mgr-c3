import { describe, it, expect } from 'bun:test'

// dom.js morph() requires full DOM API (document.createElement, Node types, etc.)
// These tests should be run in a browser or with a DOM polyfill (e.g., happy-dom, jsdom)

describe.skip('morph (requires DOM API)', () => {
	it('placeholder', () => {
		expect(true).toBe(true)
	})
})
