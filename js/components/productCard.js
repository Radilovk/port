import { generateVariantItem } from './variantItem.js';
import { generateEffectBar } from './effectBar.js';

export function generateProductCard(product) {
    if (!product.public_data) {
        console.warn(`Продукт с ID '${product.product_id}' няма 'public_data' и няма да бъде рендиран.`);
        return '';
    }

    const publicData = product.public_data;
    const inventory = product.system_data?.inventory ?? 0;
    const productId = product.product_id;
    const cardDetailsId = `card-details-${productId}`;

    return `
    <article class="product-card fade-in-up" data-product-id="${productId}">
        <div class="card-header" role="button" aria-expanded="false" aria-controls="${cardDetailsId}" tabindex="0">
            <div class="product-title"><h3>${publicData.name}</h3><p>${publicData.tagline}</p></div>
            <div class="product-price">${Number(publicData.price).toFixed(2)} лв.</div>
            <div class="product-stock ${inventory > 0 ? '' : 'out-of-stock'}">${inventory > 0 ? `Налично: ${inventory}` : 'Изчерпано'}</div>
            <div class="effects-container">
                ${(publicData.effects || []).map(generateEffectBar).join('')}
            </div>
            <span class="expand-icon"></span>
        </div>
        <div class="card-details" id="${cardDetailsId}">
            <p>${publicData.description}</p>
            ${publicData.research_note && publicData.research_note.url ? `<div class="research-note">Източник: <a href="${publicData.research_note.url}" target="_blank" rel="noopener">${publicData.research_note.text}</a></div>` : ''}
            <h4 class="details-section-title">Налични форми:</h4>
            <ul class="product-variants">
                ${(publicData.variants || []).map(generateVariantItem).join('')}
            </ul>
            <button class="add-to-cart-btn" data-id="${productId}" data-name="${publicData.name}" data-price="${publicData.price}" data-inventory="${inventory}" ${inventory > 0 ? '' : 'disabled'}>Добави в количката</button>
        </div>
    </article>`;
}
