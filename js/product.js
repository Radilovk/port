import { fetchProducts } from './api.js';
import { addToCart, updateCartCount } from './cart.js';
import { generateProductCard } from './components/productCard.js';
import { trackPageView, trackAddToCart } from "./analytics.js";

const DOM = {
    productContainer: document.getElementById('product-container'),
    relatedGrid: document.getElementById('related-products-grid'),
    cartCount: document.getElementById('cart-count')
};

function renderProduct(product) {
    const { public_data: pd, system_data: sd } = product;
    DOM.productContainer.innerHTML = `
        <h1>${pd.name}</h1>
        <p>${pd.tagline || ''}</p>
        ${pd.image_url ? `<img src="${pd.image_url}" alt="${pd.name}" class="product-main-image">` : ''}
        <p>${pd.description}</p>
        <section id="product-gallery"></section>
        <section id="product-reviews"></section>
        <button class="add-to-cart-btn" data-id="${product.product_id}" data-name="${pd.name}" data-price="${pd.price}" data-inventory="${sd?.inventory ?? 0}">Поръчай</button>
    `;
}

function renderRelated(products) {
    if (!DOM.relatedGrid) return;
    DOM.relatedGrid.innerHTML = products.slice(0, 4).map(generateProductCard).join('');
}

async function main() {
    updateCartCount();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        DOM.productContainer.textContent = 'Липсва ID на продукт.';
        return;
    }
    try {
        const data = await fetchProducts();
        const all = data.product_categories.flatMap(c => c.products);
        const product = all.find(p => p.product_id === id);
        if (!product) {
            DOM.productContainer.textContent = 'Продуктът не е намерен.';
            return;
        }
        renderProduct(product);
        renderRelated(all.filter(p => p.product_id !== id));
        trackPageView();
    } catch (err) {
        console.error(err);
        DOM.productContainer.textContent = 'Грешка при зареждане на продукта.';
    }
}

document.body.addEventListener('click', e => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (btn) {
        addToCart(btn.dataset.id, btn.dataset.name, btn.dataset.price, btn.dataset.inventory);
        trackAddToCart({ id: btn.dataset.id, name: btn.dataset.name, price: Number(btn.dataset.price) });
    }
});

main();
