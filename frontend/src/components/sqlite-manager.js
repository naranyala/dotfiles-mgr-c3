import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .sqlite-manager {
        display: grid;
        grid-template-columns: 200px 1fr;
        grid-template-rows: auto 1fr auto;
        height: 100%;
        gap: 1px;
        background: #334155;
        overflow: hidden;
    }
    .header { grid-column: 1 / -1; background: #1e293b; padding: 0.75rem; display: flex; gap: 1rem; align-items: center; border-bottom: 1px solid #334155; }
    .sidebar { background: #0f172a; padding: 0.75rem; overflow-y: auto; border-right: 1px solid #334155; }
    .main { background: #1e293b; display: flex; flex-direction: column; overflow: hidden; }
    .toolbar { padding: 0.75rem; background: #334155; display: flex; gap: 0.5rem; align-items: center; }
    .grid-container { flex: 1; overflow: auto; padding: 0.75rem; }
    .footer { grid-column: 1 / -1; background: #0f172a; padding: 0.75rem; border-top: 1px solid #334155; display: flex; flex-direction: column; gap: 0.5rem; }
    .table-list-item { padding: 0.4rem 0.75rem; cursor: pointer; border-radius: 4px; margin-bottom: 0.25rem; font-size: 0.9rem; }
    .table-list-item:hover { background: #1e293b; }
    .table-list-item.active { background: #3b82f6; color: white; }
    .row-editor { background: #0f172a; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #3b82f6; }
    .row-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; }
`)

export class SqliteManagerComponent extends ReactiveComponent {
    static styles = styles
    constructor() {
        super()
        this.dbPath = signal('demo.db')
        this.connected = signal(false)
        this.tables = signal([])
        this.selectedTable = signal(null)
        this.tableData = signal([])
        this.tableSchema = signal([])
        this.editingRow = signal(null)
        this.sql = signal('')
        this.sqlResults = signal({ rows: [] })
        this.error = signal('')
        this.loading = signal(false)
    }

    async openDb() {
        this.loading.value = true
        this.error.value = ''
        try {
            const res = await window.rpc.sqlite.open(this.dbPath.value)
            if (res.ok) {
                this.connected.value = true
                await this.refreshTables()
            } else {
                this.error.value = res.message || 'Failed to open database'
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async closeDb() {
        try {
            await window.rpc.sqlite.close()
            this.connected.value = false
            this.selectedTable.value = null
            this.tableData.value = []
            this.tableSchema.value = []
        } catch (e) {
            this.error.value = e.message
        }
    }

    async refreshTables() {
        try {
            const res = await window.rpc.sqlite.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            this.tables.value = res.rows.map(r => r.name)
        } catch (e) {
            this.error.value = 'Failed to list tables: ' + e.message
        }
    }

    async selectTable(tableName) {
        this.selectedTable.value = tableName
        this.editingRow.value = null
        await this.refreshTableData()
    }

    async refreshTableData() {
        if (!this.selectedTable.value) return
        this.loading.value = true
        try {
            const table = this.selectedTable.value
            const schemaRes = await window.rpc.sqlite.query(`PRAGMA table_info(${table});`)
            this.tableSchema.value = schemaRes.rows
            
            const dataRes = await window.rpc.sqlite.query(`SELECT * FROM ${table};`)
            this.tableData.value = dataRes.rows
        } catch (e) {
            this.error.value = 'Failed to fetch table data: ' + e.message
        } finally {
            this.loading.value = false
        }
    }

    async saveRow() {
        if (!this.editingRow.value) return
        this.loading.value = true
        try {
            const table = this.selectedTable.value
            const row = this.editingRow.value
            const cols = Object.keys(row)
            const vals = Object.values(row).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)
            
            const pk = this.tableSchema.value.find(c => c.pk)
            if (pk && row[pk.name] !== undefined) {
                // Update
                const setClause = cols.map(c => `${c} = ${typeof row[c] === 'string' ? `'${row[c].replace(/'/g, "''")}'` : row[c]}`).join(', ')
                await window.rpc.sqlite.exec(`UPDATE ${table} SET ${setClause} WHERE ${pk.name} = ${typeof row[pk.name] === 'string' ? `'${row[pk.name].replace(/'/g, "''")}'` : row[pk.name]};`)
            } else {
                // Insert
                await window.rpc.sqlite.exec(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`)
            }
            
            this.editingRow.value = null
            await this.refreshTableData()
        } catch (e) {
            this.error.value = 'Failed to save row: ' + e.message
        } finally {
            this.loading.value = false
        }
    }

    async deleteRow(idValue) {
        if (!this.selectedTable.value) return
        this.loading.value = true
        try {
            const table = this.selectedTable.value
            const pk = this.tableSchema.value.find(c => c.pk)
            const pkName = pk ? pk.name : 'id'
            const val = typeof idValue === 'string' ? `'${idValue.replace(/'/g, "''")}'` : idValue
            await window.rpc.sqlite.exec(`DELETE FROM ${table} WHERE ${pkName} = ${val};`)
            await this.refreshTableData()
        } catch (e) {
            this.error.value = 'Failed to delete row: ' + e.message
        } finally {
            this.loading.value = false
        }
    }

    async runRawSql() {
        this.loading.value = true
        this.error.value = ''
        try {
            if (this.sql.value.trim().toUpperCase().startsWith('SELECT')) {
                const res = await window.rpc.sqlite.query(this.sql.value)
                this.sqlResults.value = res
            } else {
                await window.rpc.sqlite.exec(this.sql.value)
                if (this.selectedTable.value) await this.refreshTableData()
                await this.refreshTables()
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    render() {
        const connected = this.connected.value
        const tables = this.tables.value
        const selectedTable = this.selectedTable.value
        const data = this.tableData.value
        const schema = this.tableSchema.value
        const editingRow = this.editingRow.value
        const error = this.error.value
        const loading = this.loading.value

        return `
        <div class="sqlite-manager">
            <div class="header">
                <input type="text" .value="${this.dbPath.value}" @input="${e => this.dbPath.value = e.target.value}" placeholder="Database Path" />
                ${connected 
                    ? `<button class="danger" @click="${this.closeDb}" ${loading ? 'disabled' : ''}>Close</button>`
                    : `<button @click="${this.openDb}" ${loading ? 'disabled' : ''}>Open Database</button>`
                }
                ${error ? `<div class="error-box">${error}</div>` : ''}
            </div>
            
            <div class="sidebar">
                <div style="font-weight: bold; margin-bottom: 0.5rem; font-size: 0.8rem; opacity: 0.7;">TABLES</div>
                ${tables.map(t => `
                    <div class="table-list-item ${selectedTable === t ? 'active' : ''}" @click="${() => this.selectTable(t)}">
                        ${t}
                    </div>
                `).join('')}
                ${connected && tables.length === 0 ? '<div style="font-size: 0.8rem; opacity: 0.5;">No tables found</div>' : ''}
            </div>
            
            <div class="main">
                ${selectedTable ? `
                    <div class="toolbar">
                        <div style="font-weight: bold; margin-right: 1rem;">${selectedTable}</div>
                        <button @click="${() => this.editingRow.value = {}}">+ Add Row</button>
                        <button class="secondary" @click="${this.refreshTableData}">Refresh</button>
                    </div>
                    <div class="grid-container">
                        ${editingRow ? `
                            <div class="row-editor">
                                <div style="font-weight: bold; margin-bottom: 0.5rem;">${editingRow.id ? 'Edit' : 'New'} Row</div>
                                <div class="row-form">
                                    ${schema.map(col => `
                                        <div class="form-group">
                                            <label>${col.name} ${col.pk ? '(PK)' : ''}</label>
                                            <input type="text" .value="${editingRow[col.name] || ''}" @input="${e => {
                                                const next = { ...editingRow };
                                                next[col.name] = e.target.value;
                                                this.editingRow.value = next;
                                            }}" />
                                        </div>
                                    `).join('')}
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button @click="${this.saveRow}">Save</button>
                                    <button class="secondary" @click="${() => this.editingRow.value = null}">Cancel</button>
                                </div>
                            </div>
                        ` : ''}
                        
                        <table>
                            <thead>
                                <tr>
                                    ${schema.map(col => `<th>${col.name}</th>`).join('')}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(row => `
                                    <tr>
                                        ${schema.map(col => `<td>${row[col.name] !== null ? row[col.name] : 'NULL'}</td>`).join('')}
                                        <td>
                                            <button class="secondary" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;" @click="${() => this.editingRow.value = { ...row }}">Edit</button>
                                            <button class="danger" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;" @click="${() => this.deleteRow(row[schema.find(c => c.pk)?.name || 'id'])}">Del</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5; font-style: italic;">
                        Select a table from the sidebar to begin exploration
                    </div>
                `}
            </div>
            
            <div class="footer">
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span style="font-size: 0.8rem; font-weight: bold;">SQL:</span>
                    <input type="text" style="flex: 1" .value="${this.sql.value}" @input="${e => this.sql.value = e.target.value}" placeholder="Enter SQL query..." />
                    <button @click="${this.runRawSql}">Execute</button>
                </div>
                ${this.sqlResults.value.rows.length > 0 ? `
                    <div style="max-height: 150px; overflow: auto; background: #020617; padding: 0.5rem; border-radius: 4px; font-size: 0.75rem;">
                        <table>
                            <thead>
                                <tr>${Object.keys(this.sqlResults.value.rows[0]).map(k => `<th>${k}</th>`).join('')}</tr>
                            </thead>
                            <tbody>
                                ${this.sqlResults.value.rows.map(r => `<tr>${Object.values(r).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        </div>
        `
    }
}
