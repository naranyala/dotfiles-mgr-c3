/**
 * Shared CSS utilities for all components.
 * Host defaults are auto-injected by ReactiveComponent base class.
 * Only include component-specific + utility styles here.
 */

export const utilities = `
/* ── Buttons ──────────────────────────────────────────────── */
.btn {
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: opacity 0.15s;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: #6366f1; color: white; }
.btn-primary:hover:not(:disabled) { background: #4f46e5; }
.btn-secondary { background: rgba(100,116,139,0.3); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
.btn-secondary:hover:not(:disabled) { background: rgba(100,116,139,0.5); }
.btn-danger { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
.btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.3); }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.75rem; }

/* ── Form Elements ────────────────────────────────────────── */
input, textarea, select {
    background: rgba(15,23,42,0.8);
    border: 1px solid rgba(255,255,255,0.12);
    color: #f8fafc;
    padding: 0.45rem 0.6rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-family: inherit;
}
select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 28px;
    cursor: pointer;
}
option {
    background: #1e293b;
    color: #f8fafc;
    padding: 6px 10px;
}
option:hover, option:checked, option:active {
    background: #334155;
    color: #f8fafc;
}
input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: rgba(99,102,241,0.5);
}
textarea { resize: vertical; }

/* ── Layout Helpers ───────────────────────────────────────── */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
}
.field-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.field-group label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.5;
}

/* ── Status / Feedback ────────────────────────────────────── */
.error-box {
    color: #f87171;
    background: rgba(239,68,68,0.1);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
}
.success-box {
    color: #10b981;
    background: rgba(16,185,129,0.1);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
}
.status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
}
.status-dot.on { background: #10b981; }
.status-dot.off { background: #ef4444; }

/* ── Section Labels ───────────────────────────────────────── */
.section-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.5;
    margin-bottom: 0.4rem;
}

/* ── Empty State ──────────────────────────────────────────── */
.empty-state {
    text-align: center;
    padding: 2rem;
    opacity: 0.4;
    font-style: italic;
}
`

/**
 * Combines utilities + component-specific CSS.
 * Host defaults are handled by ReactiveComponent base class.
 */
export function componentStyles(extra = '') {
    return utilities + extra
}
