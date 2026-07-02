export const nav = `
  /* --- tab bar --- */
  .tab-bar {
    display: flex;
    align-items: stretch;
    height: 38px;
    margin: 0;
    padding: 0;
    background: rgba(15, 23, 42, 0.95);
    border-radius: 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .tab-bar-scroll {
    display: flex;
    flex: 1;
    overflow-x: auto;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    width: 120px;
    flex-shrink: 0;
    border-radius: 0;
    cursor: pointer;
    font-size: 0.8rem;
    color: #94a3b8;
    transition: all 0.15s ease;
    user-select: none;
    border-right: 1px solid rgba(255,255,255,0.04);
    box-sizing: border-box;
  }
  .tab-home {
    border-right: 1px solid rgba(255,255,255,0.04);
  }
  .tab:last-of-type {
    border-right: none;
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
  .tab-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tab-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 0.7rem;
    line-height: 1;
    padding: 1px 3px;
    margin: 0;
    box-shadow: none;
    border-radius: 4px;
    transition: all 0.1s;
    flex-shrink: 0;
  }
  .tab-close:hover {
    background: rgba(248,113,113,0.2);
    color: #f87171;
  }
  .tab-close-all {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 16px;
    flex-shrink: 0;
    margin: 0;
    border-radius: 0;
    cursor: pointer;
    font-size: 0.78rem;
    color: #64748b;
    white-space: nowrap;
    transition: all 0.12s ease;
    background: none;
    border: none;
    border-left: 1px solid rgba(255,255,255,0.06);
    font-family: inherit;
  }
  .tab-close-all:hover {
    background: rgba(248,113,113,0.15);
    color: #f87171;
    border-color: rgba(248,113,113,0.3);
  }

  /* --- tab content --- */
  .tab-content {
    flex: 1;
    min-height: 0;
    padding: 24px 0 32px;
  }
  .tab-pane {
    display: none;
  }
  .tab-pane.active {
    display: block;
  }

  /* --- breadcrumbs --- */
  .breadcrumbs-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px 4px;
    background: rgba(15, 23, 42, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.75rem;
    min-height: 32px;
    flex-shrink: 0;
    position: sticky;
    top: 38px;
    z-index: 100;
  }
  .breadcrumbs-path {
    display: flex;
    align-items: center;
    gap: 0;
    color: #64748b;
  }
  .breadcrumb {
    color: #64748b;
    transition: color 0.12s;
  }
  .breadcrumb.active {
    color: #e2e8f0;
    font-weight: 500;
  }
  .breadcrumb-sep {
    margin: 0 8px;
    color: #475569;
    font-size: 0.7rem;
  }
  .btn-copy-breadcrumb {
    background: none;
    border: 1px solid transparent;
    color: #64748b;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.12s ease;
    box-shadow: none;
    margin: 0;
  }
  .btn-copy-breadcrumb:hover {
    color: #34d399;
    border-color: rgba(52,211,153,0.3);
    background: rgba(52,211,153,0.05);
  }

  /* --- search --- */
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

  /* --- launcher grid --- */
  .launcher-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
    justify-content: center;
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
    height: 100%;
    box-sizing: border-box;
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
  .menu-group {
    margin-bottom: 20px;
  }
   .menu-group-title {
     display: flex;
     align-items: center;
     gap: 8px;
     font-size: 0.8rem;
     font-weight: 600;
     color: #94a3b8;
     text-transform: uppercase;
     letter-spacing: 0.5px;
     padding: 8px 0;
     user-select: none;
   }
   .group-count {
     background: rgba(99, 102, 241, 0.15);
     color: #818cf8;
     font-size: 0.65rem;
     font-weight: 700;
     padding: 1px 6px;
     border-radius: 999px;
     min-width: 18px;
     text-align: center;
   }
  .btn-copy-group {
    background: none;
    border: 1px solid transparent;
    color: #64748b;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.12s ease;
    box-shadow: none;
    margin: 0;
  }
  .btn-copy-group:hover {
    color: #34d399;
    border-color: rgba(52,211,153,0.3);
    background: rgba(52,211,153,0.05);
  }
`
