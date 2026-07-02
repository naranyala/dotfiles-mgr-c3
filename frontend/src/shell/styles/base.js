export const base = `
  :host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    max-width: 1280px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, sans-serif;
    color: #f8fafc;
    box-sizing: border-box;
  }
  .shell-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 48px 0;
    min-height: 0;
    overflow-y: auto;
  }
  .card {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
  }
  .hdr {
    background: rgba(15, 23, 42, 0.6);
    color: #f1f5f9;
    padding: 16px 20px;
    font-size: 1.05rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .bd {
    padding: 24px;
    font-size: 0.95rem;
    color: #cbd5e1;
    flex-grow: 1;
  }
  .mono {
    background: rgba(0, 0, 0, 0.3);
    color: #34d399;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: ui-monospace, 'Fira Code', monospace;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-break: break-all;
    border: 1px solid rgba(255,255,255,0.02);
  }
  label {
    font-weight: 500;
    font-size: 0.85rem;
    display: block;
    margin-bottom: 8px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  input, textarea {
    width: 100%;
    padding: 12px 14px;
    margin-bottom: 16px;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-sizing: border-box;
    color: #f8fafc;
    font-family: inherit;
    font-size: 0.95rem;
    transition: all 0.2s ease;
  }
  input:focus, textarea:focus {
    outline: none;
    border-color: #6366f1;
    background: rgba(15, 23, 42, 0.8);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
  textarea { height: 100px; resize: vertical; }
  select {
    width: 100%;
    padding: 12px 32px 12px 14px;
    margin-bottom: 16px;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-sizing: border-box;
    color: #f8fafc;
    font-family: inherit;
    font-size: 0.95rem;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    cursor: pointer;
  }
  select:focus {
    outline: none;
    border-color: #6366f1;
    background-color: rgba(15, 23, 42, 0.8);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
  option {
    background: #1e293b;
    color: #f8fafc;
    padding: 8px 10px;
  }
  option:hover, option:checked, option:active {
    background: #334155;
    color: #f8fafc;
  }
  button {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: #fff;
    border: none;
    padding: 10px 20px;
    margin: 4px 8px 0 0;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);
  }
  button:hover {
    background: linear-gradient(135deg, #4338ca, #6d28d9);
    transform: translateY(-1px);
    box-shadow: 0 6px 8px -1px rgba(124, 58, 237, 0.4);
  }
  button:active {
    transform: translateY(1px);
    box-shadow: 0 2px 4px -1px rgba(124, 58, 237, 0.3);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  .badge {
    display: inline-block;
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.3);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    margin: 4px;
    font-weight: 500;
  }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; margin-bottom: 28px; }
  .ok { color: #34d399; font-weight: 600; }
  .err { color: #f87171; background: rgba(248, 113, 113, 0.1); padding: 8px 12px; border-radius: 6px; display: inline-block; font-family: monospace; }
  .full-width { margin-bottom: 28px; }
  .feature-card {
     background: linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9));
     border: 1px solid rgba(16, 185, 129, 0.3);
     box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.15);
  }
  .feature-card .hdr {
     background: rgba(16, 185, 129, 0.08);
     border-bottom: 1px solid rgba(16, 185, 129, 0.2);
     color: #6ee7b7;
  }
  .clone-input-row {
    display: flex;
    gap: 12px;
    align-items: stretch;
  }
  .clone-input-row input {
    flex: 1;
    margin-bottom: 0;
  }
  .clone-input-row button {
    margin: 0;
    white-space: nowrap;
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
  }
  .clone-input-row button:hover {
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 6px 8px -1px rgba(16, 185, 129, 0.4);
  }
  .repo-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .repo-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.9rem;
  }
  .repo-item .repo-name {
    color: #6ee7b7;
    font-weight: 500;
  }
  .btn-remove {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.3);
    padding: 4px 10px;
    font-size: 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    margin: 0;
    box-shadow: none;
  }
  .btn-remove:hover {
    background: rgba(248, 113, 113, 0.4);
    transform: none;
    box-shadow: none;
  }
  .btn-restore {
    background: rgba(99, 102, 241, 0.2);
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.3);
    padding: 4px 10px;
    font-size: 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    margin: 0;
    box-shadow: none;
  }
  .btn-restore:hover {
    background: rgba(99, 102, 241, 0.4);
    transform: none;
    box-shadow: none;
  }
  .btn-icon {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #94a3b8;
    padding: 6px 10px;
    font-size: 0.85rem;
    border-radius: 6px;
    cursor: pointer;
    margin: 0;
    box-shadow: none;
  }
  .btn-icon:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: #f1f5f9;
    transform: none;
    box-shadow: none;
  }
  .git-status {
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.9rem;
  }
  .git-status.ok {
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.25);
  }
  .git-status.err {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
  }
  .empty-state {
    color: #64748b;
    font-style: italic;
    padding: 12px 0;
    font-size: 0.9rem;
  }
`
