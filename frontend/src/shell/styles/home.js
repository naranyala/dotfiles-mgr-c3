export const home = `
  /* --- homepage grid --- */
  .homepage-grid {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding-bottom: 40px;
  }
  .grid-category {
    margin-bottom: 8px;
  }
  .category-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 0;
    margin: 0 0 10px;
    user-select: none;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .grid-items {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  @media (max-width: 899px) {
    .grid-items { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 649px) {
    .grid-items { grid-template-columns: repeat(2, 1fr); }
  }
  .grid-item {
    cursor: pointer;
    height: 100%;
  }
  .grid-item .card {
    transition: border-color 0.15s ease;
    height: 100%;
    box-sizing: border-box;
  }
  .grid-item:hover .card {
    border-color: rgba(99, 102, 241, 0.3);
  }

  /* --- detail category (list + content) --- */
  .detail-category {
    margin-bottom: 8px;
  }
  .detail-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 16px;
    min-height: 400px;
  }
  .detail-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-right: 1px solid rgba(255,255,255,0.06);
    padding-right: 16px;
    overflow-y: auto;
    max-height: 70vh;
  }
  .detail-list-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.12s;
    border: 1px solid transparent;
  }
  .detail-list-item:hover {
    background: rgba(255,255,255,0.04);
  }
  .detail-list-item.active {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.2);
  }
  .detail-list-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
    width: 28px;
    text-align: center;
  }
  .detail-list-info {
    min-width: 0;
  }
  .detail-list-title {
    font-size: 0.85rem;
    font-weight: 500;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail-list-desc {
    font-size: 0.72rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail-content {
    overflow-y: auto;
    max-height: 70vh;
    padding-right: 4px;
  }
  .detail-preview-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .detail-preview-icon {
    font-size: 1.5rem;
  }
  .detail-preview-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #f1f5f9;
  }
  .detail-preview-desc {
    font-size: 0.8rem;
    color: #64748b;
    margin-left: auto;
  }
  .detail-preview-body {
    min-height: 200px;
  }
  .detail-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
    color: #475569;
    font-style: italic;
  }
`
