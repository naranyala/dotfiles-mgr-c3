import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'

export class SqliteDemoComponent extends ReactiveComponent {
    constructor() {
        super()
        this.dbPath = signal('demo.db')
        this.dbOpen = signal(false)
        this.sql = signal('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);')
        this.results = signal({ rows: [] })
        this.error = signal('')
        this.loading = signal(false)
        this.logs = signal([])
    }

    async openDb() {
        this.loading.value = true
        this.error.value = ''
        try {
            const res = await window.rpc.sqlite.open(this.dbPath.value)
            if (res.ok) {
                this.dbOpen.value = true
                this.log('Database opened successfully')
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
        this.loading.value = true
        try {
            await window.rpc.sqlite.close()
            this.dbOpen.value = false
            this.log('Database closed')
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    async runSql() {
        this.loading.value = true
        this.error.value = ''
        try {
            if (this.sql.value.trim().toUpperCase().startsWith('SELECT')) {
                const res = await window.rpc.sqlite.query(this.sql.value)
                if (res.rows) {
                    this.results.value = res
                    this.log(`Query returned ${res.rows.length} rows`)
                } else {
                    this.error.value = 'No rows returned'
                }
            } else {
                const res = await window.rpc.sqlite.exec(this.sql.value)
                if (res.ok) {
                    this.log('Command executed successfully')
                    // If it was a modification, we might want to refresh a default select
                    // For this demo, we just let the user run the next SELECT
                } else {
                    this.error.value = res.message || 'Execution failed'
                }
            }
        } catch (e) {
            this.error.value = e.message
        } finally {
            this.loading.value = false
        }
    }

    log(msg) {
        this.logs.value = [...this.logs.value, `[${new Date().toLocaleTimeString()}] ${msg}`]
        if (this.logs.value.length > 10) this.logs.value.shift()
    }

    render() {
        const dbOpen = this.dbOpen.value
        const loading = this.loading.value
        const error = this.error.value
        const results = this.results.value
        const logs = this.logs.value
        const sql = this.sql.value

        const columns = results.rows.length > 0 ? Object.keys(results.rows[0]) : []

        return `
        <style>
            .sqlite-demo {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                padding: 1rem;
                height: 100%;
                box-sizing: border-box;
            }
            .controls {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            input, textarea {
                background: #1e293b;
                border: 1px solid #334155;
                color: #f8fafc;
                padding: 0.5rem;
                border-radius: 4px;
                font-family: inherit;
            }
            input { flex: 1; }
            textarea { width: 100%; min-height: 100px; resize: vertical; }
            button {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
            }
            button:disabled { opacity: 0.5; cursor: not-allowed; }
            button.secondary { background: #64748b; }
            button.danger { background: #ef4444; }
            
            .error-box { color: #f87171; font-size: 0.875rem; }
            
            .table-container {
                flex: 1;
                overflow: auto;
                border: 1px solid #334155;
                border-radius: 4px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.875rem;
            }
            th {
                position: sticky;
                top: 0;
                background: #334155;
                text-align: left;
                padding: 0.5rem;
            }
            td { padding: 0.5rem; border-bottom: 1px solid #334155; }
            
            .logs {
                height: 100px;
                background: #020617;
                font-family: monospace;
                font-size: 0.75rem;
                padding: 0.5rem;
                overflow-y: auto;
                color: #94a3b8;
                border-radius: 4px;
            }
        </style>

        <div class="sqlite-demo">
            <div class="controls">
                <input type="text" placeholder="Database Path" .value="${this.dbPath.value}" @input="${e => this.dbPath.value = e.target.value}" />
                ${dbOpen 
                    ? `<button class="danger" @click="${this.closeDb}" ${loading ? 'disabled' : ''}>Close</button>`
                    : `<button @click="${this.openDb}" ${loading ? 'disabled' : ''}>Open</button>`
                }
                <div style="flex: 1"></div>
                <span style="font-size: 0.75rem; color: ${dbOpen ? '#4ade80' : '#f87171'}">
                    ${dbOpen ? 'Connected' : 'Disconnected'}
                </span>
            </div>

            <div class="controls">
                <textarea placeholder="SQL Query..." .value="${sql}" @input="${e => this.sql.value = e.target.value}"></textarea>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button @click="${this.runSql}" ${loading || !dbOpen ? 'disabled' : ''}>Run</button>
                    <button class="secondary" @click="${() => this.sql.value = 'SELECT * FROM users;'}" ${loading || !dbOpen ? 'disabled' : ''}>Select All</button>
                </div>
            </div>

            ${error ? `<div class="error-box">${error}</div>` : ''}

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${results.rows.map(row => `
                            <tr>
                                ${columns.map(col => `<td>${row[col] !== null ? row[col] : 'NULL'}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="logs">
                ${logs.map(l => `<div>${l}</div>`).join('')}
            </div>
        </div>
        `
    }
}
