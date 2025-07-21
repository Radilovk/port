import { generateProductCard } from './productCard.js';

export function generateProductCategoryHTML(component, index) {
    const isCollapsible = component.options.is_collapsible;
    const isExpanded = component.options.is_expanded_by_default;
    const productGridId = `product-grid-${component.id || index}`;
    return `
    <section id="${component.id}" class="category-section fade-in-up ${isCollapsible ? '' : 'not-collapsible'}">
        <div class="container">
             <div class="category-header" ${isCollapsible ? `role="button" aria-expanded="${isExpanded}" aria-controls="${productGridId}" tabindex="0"` : ''}>
                <h2 class="category-title">
                    ${component.title}
                    ${isCollapsible ? '<span class="category-expand-icon"></span>' : ''}
                </h2>
                ${component.image ? `<div class="category-image-wrapper"><img src="${component.image}" alt="${component.title}" loading="lazy"></div>` : ''}
            </div>
            <div class="product-grid" id="${productGridId}">
                ${(component.products || []).map(generateProductCard).join('')}
            </div>
        </div>
    </section>`;
}
