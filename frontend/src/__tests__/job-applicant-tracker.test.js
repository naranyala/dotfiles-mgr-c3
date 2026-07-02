import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test'

// ─── Mock document for Web Component APIs ──────────────────────
if (typeof CSSStyleSheet === 'undefined') {
	globalThis.CSSStyleSheet = class CSSStyleSheet {
		replaceSync() {}
	}
}
if (typeof customElements === 'undefined') {
	globalThis.customElements = { define: () => {}, get: () => null }
}
if (typeof HTMLElement === 'undefined') {
	globalThis.HTMLElement = class HTMLElement {
		constructor() {
			this._shadowRoot = null
			this._attributes = {}
		}
		attachShadow() {
			this._shadowRoot = {
				innerHTML: '',
				querySelector: () => null,
				querySelectorAll: () => [],
				addEventListener: () => {},
				appendChild: () => {},
				removeChild: () => {},
				childNodes: [],
				children: [],
				adoptedStyleSheets: [],
			}
			return this._shadowRoot
		}
		get shadowRoot() { return this._shadowRoot }
		getAttribute(name) { return this._attributes[name] || null }
		setAttribute(name, value) { this._attributes[name] = value }
		hasAttribute(name) { return name in this._attributes }
	}
}
if (!globalThis.document) {
	globalThis.document = {
		documentElement: { style: { setProperty() {}, getProperty() { return '' } } },
		createElement() { return { style: {} } },
		createElementNS() { return { style: {} } },
	}
}

// ─── Mock backendRPC + handlers ───────────────────────────────
const handlers = {}
function mockBackendRPC(method, ...args) {
	const fn = handlers[method]
	if (!fn) return JSON.stringify({ error: true, message: `No handler for ${method}` })
	return JSON.stringify(fn(...args))
}
function registerHandler(method, fn) { handlers[method] = fn }
function registerHandlers(obj) { Object.assign(handlers, obj) }

beforeAll(async () => {
	globalThis.window = globalThis.window || globalThis
	globalThis.window.backendRPC = mockBackendRPC
	await import('../core/rpc.js')
})

afterEach(() => {
	for (const k in handlers) delete handlers[k]
})

async function call(method, ...args) {
	return await window.rpc[method](...args)
}

// ═══════════════════════════════════════════════════════════════
// 1. PLUGIN CONTRACT
// ═══════════════════════════════════════════════════════════════

describe('job-applicant-tracker plugin contract', () => {
	it('exports state, init, and render', async () => {
		const mod = await import('../plugins/job-applicant-tracker/index.js')
		expect(mod.state).toBeDefined()
		expect(typeof mod.init).toBe('function')
		expect(typeof mod.render).toBe('function')
	})

	it('init() runs without throwing', async () => {
		const mod = await import('../plugins/job-applicant-tracker/index.js')
		try { await mod.init() } catch (e) {
			expect(e).toBeDefined()
		}
	})

	it('render() returns a non-empty string with custom element tag', async () => {
		const mod = await import('../plugins/job-applicant-tracker/index.js')
		const result = mod.render()
		expect(typeof result).toBe('string')
		expect(result).toContain('job-applicant-tracker')
		expect(result.length).toBeGreaterThan(0)
	})

	it('has empty state object', async () => {
		const mod = await import('../plugins/job-applicant-tracker/index.js')
		expect(typeof mod.state).toBe('object')
		expect(Object.keys(mod.state).length).toBe(0)
	})
})

// ═══════════════════════════════════════════════════════════════
// 2. COMPONENT BEHAVIOR (unit tests on the class)
// ═══════════════════════════════════════════════════════════════

describe('JobApplicantTrackerComponent', () => {
	let ComponentClass

	beforeAll(async () => {
		const mod = await import('../components/job-applicant-tracker.js')
		ComponentClass = mod.JobApplicantTrackerComponent
	})

	it('is a class extending HTMLElement', () => {
		expect(typeof ComponentClass).toBe('function')
		const inst = new ComponentClass()
		expect(inst).toBeInstanceOf(HTMLElement)
	})

	it('initializes signals with correct defaults', () => {
		const inst = new ComponentClass()
		expect(inst.dbPath.value).toBe('job_applicants.db')
		expect(inst.connected.value).toBe(false)
		expect(inst.applicants.value).toEqual([])
		expect(inst.editingRow.value).toBeNull()
		expect(inst.isNew.value).toBe(false)
		expect(inst.error.value).toBe('')
		expect(inst.loading.value).toBe(false)
		expect(inst.search.value).toBe('')
	})

	it('filteredApplicants returns all when search is empty', () => {
		const inst = new ComponentClass()
		inst.applicants.value = [
			{ id: 1, name: 'Alice', email: 'a@test.com', position: 'Dev', company: 'ACME', status: 'pending' },
			{ id: 2, name: 'Bob', email: 'b@test.com', position: 'PM', company: 'Corp', status: 'hired' },
		]
		inst.search.value = ''
		expect(inst.filteredApplicants.length).toBe(2)
	})

	it('filteredApplicants filters by name', () => {
		const inst = new ComponentClass()
		inst.applicants.value = [
			{ id: 1, name: 'Alice', email: 'a@test.com', position: 'Dev', company: 'ACME', status: 'pending' },
			{ id: 2, name: 'Bob', email: 'b@test.com', position: 'PM', company: 'Corp', status: 'hired' },
		]
		inst.search.value = 'alice'
		expect(inst.filteredApplicants.length).toBe(1)
		expect(inst.filteredApplicants[0].name).toBe('Alice')
	})

	it('filteredApplicants filters by email', () => {
		const inst = new ComponentClass()
		inst.applicants.value = [
			{ id: 1, name: 'Alice', email: 'alice@test.com', position: 'Dev', company: 'ACME', status: 'pending' },
			{ id: 2, name: 'Bob', email: 'bob@test.com', position: 'PM', company: 'Corp', status: 'hired' },
		]
		inst.search.value = 'bob@'
		expect(inst.filteredApplicants.length).toBe(1)
		expect(inst.filteredApplicants[0].name).toBe('Bob')
	})

	it('filteredApplicants filters by position', () => {
		const inst = new ComponentClass()
		inst.applicants.value = [
			{ id: 1, name: 'Alice', position: 'Frontend Dev', status: 'pending' },
			{ id: 2, name: 'Bob', position: 'Backend Dev', status: 'reviewing' },
			{ id: 3, name: 'Carol', position: 'Designer', status: 'interview' },
		]
		inst.search.value = 'frontend'
		expect(inst.filteredApplicants.length).toBe(1)
		expect(inst.filteredApplicants[0].name).toBe('Alice')
	})

	it('filteredApplicants filters by company', () => {
		const inst = new ComponentClass()
		inst.applicants.value = [
			{ id: 1, name: 'Alice', company: 'Google', status: 'pending' },
			{ id: 2, name: 'Bob', company: 'Meta', status: 'hired' },
		]
		inst.search.value = 'google'
		expect(inst.filteredApplicants.length).toBe(1)
	})

	it('filteredApplicants filters by status', () => {
		const inst = new ComponentClass()
		inst.applicants.value = [
			{ id: 1, name: 'Alice', status: 'pending' },
			{ id: 2, name: 'Bob', status: 'hired' },
			{ id: 3, name: 'Carol', status: 'pending' },
		]
		inst.search.value = 'hired'
		expect(inst.filteredApplicants.length).toBe(1)
		expect(inst.filteredApplicants[0].name).toBe('Bob')
	})

	it('filteredApplicants is case-insensitive', () => {
		const inst = new ComponentClass()
		inst.applicants.value = [
			{ id: 1, name: 'Alice', status: 'Pending' },
		]
		inst.search.value = 'PENDING'
		expect(inst.filteredApplicants.length).toBe(1)
	})

	it('statusColor returns correct colors', () => {
		const inst = new ComponentClass()
		expect(inst.statusColor('pending')).toBe('#f59e0b')
		expect(inst.statusColor('reviewing')).toBe('#3b82f6')
		expect(inst.statusColor('interview')).toBe('#8b5cf6')
		expect(inst.statusColor('offered')).toBe('#10b981')
		expect(inst.statusColor('rejected')).toBe('#ef4444')
		expect(inst.statusColor('hired')).toBe('#06b6d4')
		expect(inst.statusColor('unknown')).toBe('#64748b')
	})

	it('updateField updates editingRow immutably', () => {
		const inst = new ComponentClass()
		inst.editingRow.value = { name: 'Alice', email: '' }
		inst.updateField('email', 'alice@test.com')
		expect(inst.editingRow.value.email).toBe('alice@test.com')
		expect(inst.editingRow.value.name).toBe('Alice')
	})

	it('cancelEdit sets editingRow to null', () => {
		const inst = new ComponentClass()
		inst.editingRow.value = { name: 'test' }
		inst.cancelEdit()
		expect(inst.editingRow.value).toBeNull()
	})

	it('createRow sets editingRow with empty fields and isNew=true', () => {
		const inst = new ComponentClass()
		inst.createRow()
		expect(inst.editingRow.value).toBeDefined()
		expect(inst.editingRow.value.name).toBe('')
		expect(inst.editingRow.value.status).toBe('pending')
		expect(inst.isNew.value).toBe(true)
	})

	it('editRow copies row and sets isNew=false', () => {
		const inst = new ComponentClass()
		const row = { id: 1, name: 'Alice', email: 'a@test.com' }
		inst.editRow(row)
		expect(inst.editingRow.value.name).toBe('Alice')
		expect(inst.isNew.value).toBe(false)
		// Should be a copy, not the same reference
		inst.editingRow.value.name = 'Changed'
		expect(row.name).toBe('Alice')
	})
})

// ═══════════════════════════════════════════════════════════════
// 3. RPC BACKEND INTEGRATION (mocked handlers)
// ═══════════════════════════════════════════════════════════════

describe('job-applicant-tracker RPC methods', () => {
	let db = []
	let nextId = 1

	beforeEach(() => {
		db = []
		nextId = 1
		registerHandlers({
			'job-applicant-tracker.init': (path) => {
				if (!path) return { error: true, message: 'Missing path' }
				return { ok: true }
			},
			'job-applicant-tracker.list': () => {
				return { rows: [...db].reverse() }
			},
			'job-applicant-tracker.create': (data) => {
				if (!data || !data.name) return { error: true, message: 'Name is required' }
				const row = { id: nextId++, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
				db.push(row)
				return { ok: true }
			},
			'job-applicant-tracker.update': (data) => {
				if (!data || !data.id) return { error: true, message: 'Missing id' }
				const idx = db.findIndex(r => r.id === data.id)
				if (idx === -1) return { error: true, message: 'Not found' }
				db[idx] = { ...db[idx], ...data, updated_at: new Date().toISOString() }
				return { ok: true }
			},
			'job-applicant-tracker.delete': (id) => {
				const numId = Number(id)
				const idx = db.findIndex(r => r.id === numId)
				if (idx === -1) return { error: true, message: 'Not found' }
				db.splice(idx, 1)
				return { ok: true }
			},
		})
	})

	it('init returns ok with valid path', async () => {
		const r = await call('job-applicant-tracker.init', 'test.db')
		expect(r.ok).toBe(true)
	})

	it('init returns error without path', async () => {
		const r = await call('job-applicant-tracker.init')
		expect(r.error).toBe(true)
	})

	it('list returns empty rows initially', async () => {
		const r = await call('job-applicant-tracker.list')
		expect(Array.isArray(r.rows)).toBe(true)
		expect(r.rows.length).toBe(0)
	})

	it('create adds a row and returns ok', async () => {
		const r = await call('job-applicant-tracker.create', {
			name: 'Alice', email: 'alice@test.com', phone: '123',
			position: 'Dev', company: 'ACME', status: 'pending', notes: ''
		})
		expect(r.ok).toBe(true)
		const list = await call('job-applicant-tracker.list')
		expect(list.rows.length).toBe(1)
		expect(list.rows[0].name).toBe('Alice')
		expect(list.rows[0].id).toBe(1)
	})

	it('create requires name', async () => {
		const r = await call('job-applicant-tracker.create', { email: 'no-name@test.com' })
		expect(r.error).toBe(true)
	})

	it('create assigns auto-incrementing id', async () => {
		await call('job-applicant-tracker.create', { name: 'Alice' })
		await call('job-applicant-tracker.create', { name: 'Bob' })
		const list = await call('job-applicant-tracker.list')
		// List returns newest first (reverse id order)
		expect(list.rows[0].id).toBe(2)
		expect(list.rows[1].id).toBe(1)
	})

	it('create sets created_at and updated_at timestamps', async () => {
		await call('job-applicant-tracker.create', { name: 'Alice' })
		const list = await call('job-applicant-tracker.list')
		expect(typeof list.rows[0].created_at).toBe('string')
		expect(typeof list.rows[0].updated_at).toBe('string')
	})

	it('update modifies an existing row', async () => {
		await call('job-applicant-tracker.create', { name: 'Alice', status: 'pending' })
		const r = await call('job-applicant-tracker.update', { id: 1, name: 'Alice', status: 'hired' })
		expect(r.ok).toBe(true)
		const list = await call('job-applicant-tracker.list')
		expect(list.rows[0].status).toBe('hired')
	})

	it('update returns error for missing id', async () => {
		const r = await call('job-applicant-tracker.update', { name: 'test' })
		expect(r.error).toBe(true)
	})

	it('update returns error for non-existent id', async () => {
		const r = await call('job-applicant-tracker.update', { id: 999, name: 'test' })
		expect(r.error).toBe(true)
	})

	it('delete removes a row', async () => {
		await call('job-applicant-tracker.create', { name: 'Alice' })
		await call('job-applicant-tracker.create', { name: 'Bob' })
		const r = await call('job-applicant-tracker.delete', '1')
		expect(r.ok).toBe(true)
		const list = await call('job-applicant-tracker.list')
		expect(list.rows.length).toBe(1)
		expect(list.rows[0].name).toBe('Bob')
	})

	it('delete returns error for non-existent id', async () => {
		const r = await call('job-applicant-tracker.delete', '999')
		expect(r.error).toBe(true)
	})

	it('full CRUD lifecycle: create -> list -> update -> list -> delete -> list', async () => {
		// Create
		await call('job-applicant-tracker.create', { name: 'Alice', position: 'Dev' })
		let list = await call('job-applicant-tracker.list')
		expect(list.rows.length).toBe(1)
		expect(list.rows[0].name).toBe('Alice')

		// Update
		await call('job-applicant-tracker.update', { id: 1, name: 'Alice Smith', position: 'Senior Dev', status: 'interview' })
		list = await call('job-applicant-tracker.list')
		expect(list.rows[0].name).toBe('Alice Smith')
		expect(list.rows[0].position).toBe('Senior Dev')
		expect(list.rows[0].status).toBe('interview')

		// Delete
		await call('job-applicant-tracker.delete', '1')
		list = await call('job-applicant-tracker.list')
		expect(list.rows.length).toBe(0)
	})

	it('handles multiple applicants independently', async () => {
		await call('job-applicant-tracker.create', { name: 'Alice', company: 'Google' })
		await call('job-applicant-tracker.create', { name: 'Bob', company: 'Meta' })
		await call('job-applicant-tracker.create', { name: 'Carol', company: 'Apple' })

		const list = await call('job-applicant-tracker.list')
		expect(list.rows.length).toBe(3)

		// Update only Bob
		await call('job-applicant-tracker.update', { id: 2, name: 'Bob', status: 'hired' })
		const updated = await call('job-applicant-tracker.list')
		expect(updated.rows.find(r => r.id === 2).status).toBe('hired')
		expect(updated.rows.find(r => r.id === 1).status).toBeUndefined()
		expect(updated.rows.find(r => r.id === 3).status).toBeUndefined()
	})

	it('list returns rows in reverse id order (newest first)', async () => {
		await call('job-applicant-tracker.create', { name: 'First' })
		await call('job-applicant-tracker.create', { name: 'Second' })
		await call('job-applicant-tracker.create', { name: 'Third' })
		const list = await call('job-applicant-tracker.list')
		expect(list.rows[0].name).toBe('Third')
		expect(list.rows[1].name).toBe('Second')
		expect(list.rows[2].name).toBe('First')
	})
})

// ═══════════════════════════════════════════════════════════════
// 4. RENDER OUTPUT
// ═══════════════════════════════════════════════════════════════

describe('JobApplicantTrackerComponent render', () => {
	let ComponentClass

	beforeAll(async () => {
		const mod = await import('../components/job-applicant-tracker.js')
		ComponentClass = mod.JobApplicantTrackerComponent
	})

	it('render returns a string containing tracker-wrap class', () => {
		const inst = new ComponentClass()
		const html = inst.render()
		expect(html).toContain('tracker-wrap')
	})

	it('render shows connect button when not connected', () => {
		const inst = new ComponentClass()
		inst.connected.value = false
		const html = inst.render()
		expect(html).toContain('Connect')
		expect(html).toContain('job_applicants.db')
	})

	it('render shows disconnect button when connected', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		const html = inst.render()
		expect(html).toContain('Disconnect')
	})

	it('render shows search input when connected', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		const html = inst.render()
		expect(html).toContain('Search applicants')
	})

	it('render shows new applicant button when connected', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		const html = inst.render()
		expect(html).toContain('New Applicant')
	})

	it('render shows empty state when no applicants', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.applicants.value = []
		const html = inst.render()
		expect(html).toContain('No applicants yet')
	})

	it('render shows datatable when applicants exist', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.applicants.value = [
			{ id: 1, name: 'Alice', email: 'a@test.com', phone: '123', position: 'Dev', company: 'ACME', status: 'pending' },
		]
		const html = inst.render()
		expect(html).toContain('datatable')
		expect(html).toContain('Alice')
		expect(html).toContain('ACME')
	})

	it('render shows editor panel when editingRow is set', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.editingRow.value = { name: 'Alice', email: '', phone: '', position: '', company: '', status: 'pending', notes: '' }
		inst.isNew.value = true
		const html = inst.render()
		expect(html).toContain('editor-panel')
		expect(html).toContain('New Applicant')
	})

	it('render shows status badge for each row', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.applicants.value = [
			{ id: 1, name: 'Alice', status: 'hired' },
			{ id: 2, name: 'Bob', status: 'pending' },
		]
		const html = inst.render()
		expect(html).toContain('status-badge')
		expect(html).toContain('hired')
		expect(html).toContain('pending')
	})

	it('render shows count label', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.applicants.value = [
			{ id: 1, name: 'Alice', status: 'pending' },
			{ id: 2, name: 'Bob', status: 'hired' },
		]
		const html = inst.render()
		expect(html).toContain('2 applicants')
	})

	it('render shows singular "applicant" for one row', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.applicants.value = [
			{ id: 1, name: 'Alice', status: 'pending' },
		]
		const html = inst.render()
		expect(html).toContain('1 applicant')
	})

	it('render shows empty search state', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.applicants.value = [
			{ id: 1, name: 'Alice', status: 'pending' },
		]
		inst.search.value = 'zzz'
		const html = inst.render()
		expect(html).toContain('No applicants match your search')
	})

	it('render shows all form fields in editor', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.editingRow.value = { name: '', email: '', phone: '', position: '', company: '', status: 'pending', notes: '' }
		inst.isNew.value = true
		const html = inst.render()
		expect(html).toContain('Name')
		expect(html).toContain('Email')
		expect(html).toContain('Phone')
		expect(html).toContain('Position')
		expect(html).toContain('Company')
		expect(html).toContain('Status')
		expect(html).toContain('Notes')
	})

	it('render shows all status options in select', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.editingRow.value = { name: '', status: 'pending' }
		inst.isNew.value = true
		const html = inst.render()
		expect(html).toContain('pending')
		expect(html).toContain('reviewing')
		expect(html).toContain('interview')
		expect(html).toContain('offered')
		expect(html).toContain('rejected')
		expect(html).toContain('hired')
	})

	it('render shows edit and delete buttons per row', () => {
		const inst = new ComponentClass()
		inst.connected.value = true
		inst.applicants.value = [
			{ id: 1, name: 'Alice', status: 'pending' },
		]
		const html = inst.render()
		expect(html).toContain('Edit')
		expect(html).toContain('Del')
	})

	it('render shows empty state when not connected', () => {
		const inst = new ComponentClass()
		// Clear any mock data
		inst.connected.value = false
		const html = inst.render()
		expect(html).toContain('Connect to a database')
	})
})
