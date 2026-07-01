import { uiCard } from '../shared/index.js';

/**
 * @param {Array<{category: string, items: Array<{id: string, title: string, name: string, icon: string, plugin: any}>}>} categories
 */
export function renderHomepageGrid(categories) {
    return `
        <div class="homepage-grid">
            ${categories.map(cat => `
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
            `).join('')}
        </div>
    `;
}
