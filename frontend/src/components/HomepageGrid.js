import { uiCard } from '../shared/index.js';
import { launchers } from '../shell/launchers.js';

const DETAIL_CATEGORY = 'System Tools';

/**
 * @param {Array<{category: string, items: Array<{id: string, title: string, name: string, icon: string, plugin: any}>}>} categories
 */
export function renderHomepageGrid(categories) {
    return `
        <div class="homepage-grid">
            ${categories.map(cat => {
                if (cat.category === DETAIL_CATEGORY) {
                    return renderDetailCategory(cat);
                }
                return renderGridCategory(cat);
            }).join('')}
        </div>
    `;
}

function renderGridCategory(cat) {
    return `
        <section class="grid-category">
            <h2 class="category-title">${cat.category}</h2>
            <div class="grid-items">
                ${cat.items.map(item => `
                    <div class="grid-item" onclick="window.navigateToPlugin('${item.id}')">
                        ${uiCard(item.title || item.name, '', item.icon)}
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function renderDetailCategory(cat) {
    return `
        <section class="detail-category">
            <h2 class="category-title">${cat.category}</h2>
            <div class="detail-layout">
                <div class="detail-list">
                    ${cat.items.map((item, i) => `
                        <div class="detail-list-item${i === 0 ? ' active' : ''}" data-detail-id="${item.id}">
                            <span class="detail-list-icon">${item.icon}</span>
                            <div class="detail-list-info">
                                <div class="detail-list-title">${item.title || item.name}</div>
                                <div class="detail-list-desc">${item.desc || ''}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="detail-content" id="detail-preview">
                    ${cat.items.length > 0 ? renderPreviewContent(cat.items[0].id) : '<div class="detail-empty">Select an item</div>'}
                </div>
            </div>
        </section>
    `;
}

function renderPreviewContent(id) {
    const launcher = launchers.find(l => l.id === id);
    if (!launcher) return '<div class="detail-empty">Not found</div>';
    return `<div class="detail-preview-header">
        <span class="detail-preview-icon">${launcher.icon}</span>
        <span class="detail-preview-title">${launcher.title}</span>
        <span class="detail-preview-desc">${launcher.desc}</span>
    </div>
    <div class="detail-preview-body">${launcher.content()}</div>`;
}
