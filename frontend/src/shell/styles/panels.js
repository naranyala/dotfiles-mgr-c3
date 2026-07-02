export const panels = `
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
    z-index: 10010;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    user-select: none;
  }
  .status-bar .status-left,
  .status-bar .status-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sb-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
    color: #94a3b8;
    font-size: 0.78rem;
    font-family: inherit;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.12s ease;
    margin: 0;
    box-shadow: none;
    white-space: nowrap;
  }
  .sb-btn:hover {
    background: rgba(255,255,255,0.08);
    color: #e2e8f0;
    border-color: rgba(255,255,255,0.12);
  }
  .sb-btn.active {
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
    border-color: rgba(99, 102, 241, 0.4);
  }
  .sb-sep {
    width: 1px;
    height: 16px;
    background: rgba(255,255,255,0.1);
    margin: 0 6px;
    flex-shrink: 0;
  }
  .sb-tab-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    color: #64748b;
    font-size: 0.75rem;
    font-family: inherit;
    background: none;
    border: 1px solid transparent;
    transition: all 0.12s ease;
    margin: 0;
    box-shadow: none;
    white-space: nowrap;
  }
  .sb-tab-btn:hover {
    background: rgba(255,255,255,0.06);
    color: #94a3b8;
  }
  .sb-tab-btn.active {
    background: rgba(99, 102, 241, 0.15);
    color: #a5b4fc;
    border-color: rgba(99, 102, 241, 0.2);
  }
  .sb-tab-btn.hidden {
    opacity: 0.4;
  }
  .sb-tab-btn.hidden:hover {
    opacity: 0.7;
  }

  /* --- vertical toggle panels --- */
  .vpanel {
    position: fixed;
    z-index: 10003;
    background: rgba(15, 23, 42, 0.96);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
    overflow-y: auto;
  }
  .vpanel.open {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
  .vpanel-bottom {
    left: 0;
    right: 0;
    bottom: 32px;
    top: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }
  .vpanel-right {
    left: 0;
    right: 0;
    bottom: 32px;
    top: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }
  .vpanel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    position: sticky;
    top: 0;
    background: rgba(15, 23, 42, 0.98);
    z-index: 1;
  }
  .vpanel-title {
    font-size: 1rem;
    font-weight: 600;
    color: #e2e8f0;
  }
  .vpanel-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px 8px;
    margin: 0;
    box-shadow: none;
    border-radius: 6px;
    transition: all 0.12s;
  }
  .vpanel-close:hover {
    background: rgba(255,255,255,0.08);
    color: #e2e8f0;
  }
  .vpanel-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 16px;
  }
  .vpanel-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    cursor: grab;
    color: #94a3b8;
    font-size: 0.9rem;
    transition: all 0.12s;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(30, 41, 59, 0.4);
    width: 100%;
    text-align: left;
    margin: 0;
    box-shadow: none;
    font-family: inherit;
    border-radius: 10px;
    user-select: none;
  }
  .vpanel-item:active {
    cursor: grabbing;
  }
  .vpanel-item.dragging {
    opacity: 0.5;
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }
  .vpanel-item.drag-over {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(99, 102, 241, 0.1);
  }
  .vpanel-item-icon {
    font-size: 1.2rem;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }
  .vpanel-item-label {
    flex: 1;
    color: #e2e8f0;
    font-weight: 500;
  }
  .vpanel-item-drag {
    color: #475569;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  /* --- ctrl tabs (sortable) --- */
  .ctrl-tabs {
    display: flex;
    gap: 2px;
    padding: 8px 16px 0;
  }
  .ctrl-tab-label {
    font-size: 0.72rem;
    color: #64748b;
    padding: 4px 8px;
  }
  .ctrl-tab:hover .ctrl-tab-label {
    color: #94a3b8;
  }
  .drawer-tabs-bar, .panel-tabs-bar {
    display: flex;
    gap: 4px;
    padding: 6px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    overflow-x: auto;
  }
  .ctrl-tab {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    transition: opacity 0.15s;
  }
  .ctrl-tab.hidden { opacity: 0.4; }
  .ctrl-tab-eye {
    background: none;
    border: none;
    color: #475569;
    font-size: 0.55rem;
    padding: 0 1px;
    cursor: pointer;
    line-height: 1;
    margin: 0;
    box-shadow: none;
    transition: color 0.15s;
  }
  .ctrl-tab-eye:hover { color: #94a3b8; }
  .ctrl-tab-btn {
    padding: 6px 10px;
    font-size: 0.78rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.12s;
    background: none;
    border: none;
    margin: 0;
    box-shadow: none;
    border-radius: 6px 6px 0 0;
  }
  .ctrl-tab-btn:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }
  .ctrl-tab-btn.active {
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.12);
  }

  /* --- overlay --- */
  .drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 32px;
    background: rgba(0,0,0,0.4);
    z-index: 10004;
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
    height: calc(100vh - 32px);
    background: rgba(15, 23, 42, 0.96);
    border-top: 1px solid rgba(255,255,255,0.08);
    border-radius: 0;
    z-index: 10005;
    transform: translateY(100%);
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
    width: 100%;
    background: rgba(15, 23, 42, 0.96);
    border-left: 1px solid rgba(255,255,255,0.08);
    z-index: 10005;
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
  .side-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
`
