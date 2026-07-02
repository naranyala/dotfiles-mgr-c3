import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .tracker-header { display: flex; gap: 0.75rem; align-items: center; padding: 1rem 0; flex-wrap: wrap; }
    .tracker-header input { width: 200px; }
    .tracker-actions { display: flex; gap: 0.5rem; margin-left: auto; }
    .editor-panel { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
    .editor-title { font-weight: 600; margin-bottom: 1rem; font-size: 0.95rem; }
    .editor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .editor-buttons { display: flex; gap: 0.5rem; }
    .datatable { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .datatable th { text-align: left; padding: 0.65rem 0.75rem; background: rgba(15, 23, 42, 0.6); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; position: sticky; top: 0; z-index: 1; }
    .datatable td { padding: 0.65rem 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .datatable tr:hover td { background: rgba(255, 255, 255, 0.03); }
    .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; text-transform: capitalize; }
    .table-container { overflow: auto; max-height: 60vh; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06); }
    .count-label { font-size: 0.8rem; opacity: 0.5; margin-bottom: 0.5rem; }
`)

const STATUS_OPTIONS = ['pending', 'reviewing', 'interview', 'offered', 'rejected', 'hired']

export class JobApplicantTrackerComponent extends ReactiveComponent {
    static styles = styles
    constructor() {
        super()
        this.dbPath = signal('job_applicants.db')
        this.connected = signal(false)
        this.applicants = signal([])
        this.editingRow = signal(null)
        this.isNew = signal(false)
        this.error = signal('')
        this.loading = signal(false)
        this.search = signal('')
    }

    async initDb() {
        this.loading.value = true
        this.error.value = ''
        try {
            const res = await window.rpc['job-applicant-tracker']['init'](this.dbPath.value)
            if (res.ok) {
                this.connected.value = true
                await this.refresh()
            } else {
                this.error.value = res.message || 'Failed to open database'
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async refresh() {
        if (!this.connected.value) return
        this.loading.value = true
        try {
            const res = await window.rpc['job-applicant-tracker']['list']()
            this.applicants.value = res.rows || []
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async createRow() {
        this.editingRow.value = { name: '', email: '', phone: '', position: '', company: '', status: 'pending', notes: '' }
        this.isNew.value = true
    }

    editRow(row) {
        this.editingRow.value = { ...row }
        this.isNew.value = false
    }

    cancelEdit() {
        this.editingRow.value = null
    }

    async saveRow() {
        const row = this.editingRow.value
        if (!row || !row.name) {
            this.error.value = 'Name is required'
            return
        }
        this.loading.value = true
        this.error.value = ''
        try {
            if (this.isNew.value) {
                const { id, created_at, updated_at, ...data } = row
                await window.rpc['job-applicant-tracker']['create'](data)
            } else {
                await window.rpc['job-applicant-tracker']['update'](row)
            }
            this.editingRow.value = null
            await this.refresh()
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async deleteRow(id) {
        if (!confirm('Delete this applicant?')) return
        this.loading.value = true
        try {
            await window.rpc['job-applicant-tracker']['delete'](String(id))
            await this.refresh()
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async seedData() {
        const samples = [
            { name: 'Alice Chen', email: 'alice@example.com', position: 'Software Engineer', company: 'TechCorp', status: 'interview', notes: 'Strong full-stack background' },
            { name: 'Bob Martinez', email: 'bob@example.com', position: 'Data Scientist', company: 'DataFlow', status: 'reviewing', notes: 'PhD in ML' },
            { name: 'Carol Singh', email: 'carol@example.com', position: 'Product Manager', company: 'StartupX', status: 'pending', notes: 'MBA, 5yr experience' },
            { name: 'Dave Kim', email: 'dave@example.com', position: 'UX Designer', company: 'DesignLab', status: 'offered', notes: 'Portfolio includes fintech apps' },
            { name: 'Eve Johnson', email: 'eve@example.com', position: 'DevOps Engineer', company: 'CloudBase', status: 'hired', notes: 'Started next Monday' },
            { name: 'Frank Lee', email: 'frank@example.com', position: 'Backend Developer', company: 'ServerStack', status: 'rejected', notes: 'Chose another candidate' },
        ]
        this.loading.value = true
        this.error.value = ''
        try {
            for (const s of samples) {
                await window.rpc['job-applicant-tracker']['create'](s)
            }
            await this.refresh()
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    updateField(field, value) {
        this.editingRow.value = { ...this.editingRow.value, [field]: value }
    }

    get filteredApplicants() {
        const q = this.search.value.toLowerCase()
        if (!q) return this.applicants.value
        return this.applicants.value.filter(r =>
            (r.name && r.name.toLowerCase().includes(q)) ||
            (r.email && r.email.toLowerCase().includes(q)) ||
            (r.position && r.position.toLowerCase().includes(q)) ||
            (r.company && r.company.toLowerCase().includes(q)) ||
            (r.status && r.status.toLowerCase().includes(q))
        )
    }

    statusColor(s) {
        const colors = {
            pending: '#f59e0b', reviewing: '#3b82f6', interview: '#8b5cf6',
            offered: '#10b981', rejected: '#ef4444', hired: '#06b6d4'
        }
        return colors[s] || '#64748b'
    }

    render() {
        const connected = this.connected.value
        const editingRow = this.editingRow.value
        const error = this.error.value
        const loading = this.loading.value
        const filtered = this.filteredApplicants

        return `
        <div class="tracker-wrap">
            <div class="tracker-header">
                <input type="text" .value="${this.dbPath.value}" @input="${e => this.dbPath.value = e.target.value}"
                    placeholder="Database path" style="width: 200px;" ${connected ? 'disabled' : ''} />
                ${connected
                    ? `<button class="btn btn-danger btn-sm" @click="${() => { this.connected.value = false }}">Disconnect</button>`
                    : `<button class="btn btn-primary btn-sm" @click="${() => this.initDb()}" ${loading ? 'disabled' : ''}>Connect</button>`
                }
                ${connected
                    ? `<div class="tracker-actions">
                        <input type="text" .value="${this.search.value}" @input="${e => this.search.value = e.target.value}"
                            placeholder="Search applicants..." style="width: 220px;" />
                        <button class="btn btn-primary" @click="${() => this.createRow()}" ${loading ? 'disabled' : ''}>+ New Applicant</button>
                        <button class="btn btn-secondary" @click="${() => this.refresh()}" ${loading ? 'disabled' : ''}>Refresh</button>
                        <button class="btn btn-secondary" @click="${() => this.seedData()}" ${loading ? 'disabled' : ''}>Seed</button>
                       </div>`
                    : ''
                }
            </div>

            ${error ? `<div class="error-box">${error}</div>` : ''}

            ${connected ? `
                ${editingRow ? `
                    <div class="editor-panel">
                        <div class="editor-title">${this.isNew.value ? 'New Applicant' : `Edit: ${editingRow.name}`}</div>
                        <div class="editor-grid">
                            <div class="field-group">
                                <label>Name *</label>
                                <input type="text" .value="${editingRow.name || ''}"
                                    @input="${e => this.updateField('name', e.target.value)}" placeholder="Full name" />
                            </div>
                            <div class="field-group">
                                <label>Email</label>
                                <input type="email" .value="${editingRow.email || ''}"
                                    @input="${e => this.updateField('email', e.target.value)}" placeholder="email@example.com" />
                            </div>
                            <div class="field-group">
                                <label>Phone</label>
                                <input type="tel" .value="${editingRow.phone || ''}"
                                    @input="${e => this.updateField('phone', e.target.value)}" placeholder="+1 234 567 890" />
                            </div>
                            <div class="field-group">
                                <label>Position</label>
                                <input type="text" .value="${editingRow.position || ''}"
                                    @input="${e => this.updateField('position', e.target.value)}" placeholder="Job title" />
                            </div>
                            <div class="field-group">
                                <label>Company</label>
                                <input type="text" .value="${editingRow.company || ''}"
                                    @input="${e => this.updateField('company', e.target.value)}" placeholder="Company name" />
                            </div>
                            <div class="field-group">
                                <label>Status</label>
                                <select .value="${editingRow.status || 'pending'}"
                                    @change="${e => this.updateField('status', e.target.value)}">
                                    ${STATUS_OPTIONS.map(s => `<option value="${s}" ${editingRow.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="field-group" style="margin-bottom: 1rem;">
                            <label>Notes</label>
                            <textarea .value="${editingRow.notes || ''}"
                                @input="${e => this.updateField('notes', e.target.value)}" placeholder="Additional notes..."></textarea>
                        </div>
                        <div class="editor-buttons">
                            <button class="btn btn-primary" @click="${() => this.saveRow()}" ${loading ? 'disabled' : ''}>Save</button>
                            <button class="btn btn-secondary" @click="${() => this.cancelEdit()}">Cancel</button>
                        </div>
                    </div>
                ` : ''}

                <div class="count-label">${filtered.length} applicant${filtered.length !== 1 ? 's' : ''}</div>

                ${filtered.length > 0 ? `
                    <div class="table-container">
                        <table class="datatable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Position</th>
                                    <th>Company</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(r => `
                                    <tr>
                                        <td>${r.id}</td>
                                        <td>${r.name || ''}</td>
                                        <td>${r.email || ''}</td>
                                        <td>${r.phone || ''}</td>
                                        <td>${r.position || ''}</td>
                                        <td>${r.company || ''}</td>
                                        <td><span class="status-badge" style="background: ${this.statusColor(r.status)}22; color: ${this.statusColor(r.status)};">${r.status || 'pending'}</span></td>
                                        <td>
                                            <button class="btn btn-secondary btn-sm" @click="${() => this.editRow(r)}">Edit</button>
                                            <button class="btn btn-danger btn-sm" @click="${() => this.deleteRow(r.id)}">Del</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        ${this.search.value ? 'No applicants match your search' : 'No applicants yet. Click "+ New Applicant" to add one.'}
                    </div>
                `}
            ` : `
                <div class="empty-state">
                    Connect to a database to start tracking job applicants.
                </div>
            `}
        </div>
        `
    }
}
