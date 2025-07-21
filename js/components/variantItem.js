export const generateVariantItem = variant => `
    <li class="variant-item">
        <strong>${variant.title}</strong>
        <span>${variant.description}</span>
        <a href="${variant.url}" class="variant-link" target="_blank" rel="noopener">Виж продукта</a>
    </li>`;
