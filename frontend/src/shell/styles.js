export const styles = `
  :host {
    display: block;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, sans-serif;
    color: #f8fafc;
    box-sizing: border-box;
  }
  .shell-wrap {
    padding: 24px 48px 80px;
  }
  .card {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05);
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

  /* --- tab bar --- */
  .tab-bar {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    padding: 4px;
    background: rgba(15, 23, 42, 0.92);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.04);
    overflow-x: auto;
    position: sticky;
    top: 16px;
    z-index: 100;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #94a3b8;
    white-space: nowrap;
    transition: all 0.15s ease;
    user-select: none;
    flex-shrink: 0;
  }
  .tab:hover {
    background: rgba(255,255,255,0.04);
    color: #e2e8f0;
  }
  .tab.active {
    background: rgba(99, 102, 241, 0.15);
    color: #a5b4fc;
    font-weight: 600;
  }
  .tab-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 2px;
    margin: 0;
    box-shadow: none;
    border-radius: 4px;
    transition: all 0.1s;
  }
  .tab-close:hover {
    background: rgba(248,113,113,0.2);
    color: #f87171;
  }
  .tab-icon { font-size: 1rem; }
  .tab-close-all {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.78rem;
    color: #64748b;
    white-space: nowrap;
    transition: all 0.12s ease;
    margin-left: auto;
    flex-shrink: 0;
    background: none;
    border: 1px solid transparent;
    font-family: inherit;
  }
  .tab-close-all:hover {
    background: rgba(248,113,113,0.15);
    color: #f87171;
    border-color: rgba(248,113,113,0.3);
  }

  /* --- tab content --- */
  .tab-content {
    position: relative;
  }
  .tab-pane {
    display: none;
  }
  .tab-pane.active {
    display: block;
  }

  /* --- launcher grid --- */
  .search-row {
    margin-bottom: 24px;
  }
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-wrap input {
    margin: 0;
    padding: 14px 18px;
    padding-right: 40px;
    font-size: 1rem;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
  }
  .search-wrap input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
  .search-clear {
    position: absolute;
    right: 8px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #94a3b8;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    padding: 0;
    line-height: 1;
  }
  .search-clear:hover {
    background: rgba(248,113,113,0.15);
    border-color: rgba(248,113,113,0.3);
    color: #f87171;
  }
  .launcher-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    justify-content: center;
  }
  @media (min-width: 1024px) {
    .launcher-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .launcher-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    min-height: 56px;
    background: rgba(30, 41, 59, 0.3);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }
  .launcher-item:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }
  .launcher-item:active {
    transform: translateY(0);
  }
  .launcher-icon {
    font-size: 1.4rem;
    width: 32px;
    text-align: center;
    flex-shrink: 0;
  }
  .launcher-info {
    flex: 1;
    min-width: 0;
  }
  .launcher-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: #e2e8f0;
  }
  .launcher-desc {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .no-match {
    text-align: center;
    padding: 48px 20px;
    color: #64748b;
    font-style: italic;
  }
  .launcher-badge {
    font-size: 0.7rem;
    color: #6366f1;
    background: rgba(99,102,241,0.12);
    padding: 2px 8px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  /* --- status bar --- */
  .status-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 32px;
    background: rgba(15, 23, 42, 0.92);
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    font-size: 0.75rem;
    color: #94a3b8;
    z-index: 9999;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    user-select: none;
  }
  .status-bar .status-left,
  .status-bar .status-right {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .sb-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    color: #94a3b8;
    font-size: 0.72rem;
    font-family: inherit;
    background: none;
    border: 1px solid transparent;
    transition: all 0.12s ease;
    margin: 0;
    box-shadow: none;
    white-space: nowrap;
  }
  .sb-btn:hover {
    background: rgba(255,255,255,0.06);
    color: #e2e8f0;
    border-color: rgba(255,255,255,0.08);
  }
  .sb-btn.active {
    background: rgba(99, 102, 241, 0.15);
    color: #a5b4fc;
    border-color: rgba(99, 102, 241, 0.25);
  }
  .sb-sep {
    width: 1px;
    height: 14px;
    background: rgba(255,255,255,0.08);
    margin: 0 4px;
    flex-shrink: 0;
  }

  /* --- overlay --- */
  .drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 32px;
    background: rgba(0,0,0,0.4);
    z-index: 9998;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }
  .drawer-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* --- bottom drawer (slides up) --- */
  .bottom-drawer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 32px;
    height: 50vh;
    max-height: 420px;
    background: rgba(15, 23, 42, 0.96);
    border-top: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px 12px 0 0;
    z-index: 10000;
    transform: translateY(calc(100% + 32px));
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 -8px 32px rgba(0,0,0,0.4);
    will-change: transform;
  }
  .bottom-drawer.open {
    transform: translateY(0);
  }
  .bottom-drawer.dragging {
    transition: none;
  }
  .drawer-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0 4px;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .drawer-handle:active {
    cursor: grabbing;
  }
  .drawer-handle::after {
    content: '';
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.15);
    transition: background 0.15s ease;
  }
  .drawer-handle:hover::after {
    background: rgba(255,255,255,0.25);
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 20px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .drawer-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e2e8f0;
  }
  .drawer-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 2px 6px;
    margin: 0;
    box-shadow: none;
    border-radius: 4px;
    transition: all 0.1s;
  }
  .drawer-close:hover {
    background: rgba(255,255,255,0.08);
    color: #e2e8f0;
  }
  .drawer-tabs {
    display: flex;
    gap: 2px;
    padding: 8px 16px 0;
  }
  .drawer-tab {
    padding: 6px 14px;
    font-size: 0.78rem;
    color: #64748b;
    cursor: pointer;
    border-radius: 6px 6px 0 0;
    transition: all 0.12s;
    background: none;
    border: none;
    margin: 0;
    box-shadow: none;
  }
  .drawer-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }
  .drawer-tab.active {
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.12);
    font-weight: 600;
  }
  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }

  /* --- side panel (slides from right) --- */
  .side-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 32px;
    width: 340px;
    max-width: 85vw;
    background: rgba(15, 23, 42, 0.96);
    border-left: 1px solid rgba(255,255,255,0.08);
    z-index: 10001;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: -8px 0 32px rgba(0,0,0,0.4);
    will-change: transform;
  }
  .side-panel.open {
    transform: translateX(0);
  }
  .side-panel.dragging {
    transition: none;
  }
  .side-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .side-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }
  .side-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 2px 6px;
    margin: 0;
    box-shadow: none;
    border-radius: 4px;
    transition: all 0.1s;
  }
  .side-close:hover {
    background: rgba(255,255,255,0.08);
    color: #e2e8f0;
  }
  .side-tabs {
    display: flex;
    gap: 2px;
    padding: 8px 16px 0;
  }
  .side-tab {
    padding: 6px 12px;
    font-size: 0.78rem;
    color: #64748b;
    cursor: pointer;
    border-radius: 6px 6px 0 0;
    transition: all 0.12s;
    background: none;
    border: none;
    margin: 0;
    box-shadow: none;
  }
  .side-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }
  .side-tab.active {
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.12);
    font-weight: 600;
  }
  .side-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
`
