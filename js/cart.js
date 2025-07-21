export const getCart = () => JSON.parse(localStorage.getItem('cart') || '[]');
export const saveCart = cart => localStorage.setItem('cart', JSON.stringify(cart));

export function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const count = getCart().reduce((acc, item) => acc + item.quantity, 0);
    el.textContent = count;
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

export function showAddToCartFeedback(productId) {
    const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (!card) return;
    const btn = card.querySelector('.add-to-cart-btn');
    if (!btn || btn.classList.contains('added')) return;

    btn.classList.add('added');
    btn.textContent = 'Добавено ✓';

    setTimeout(() => {
        btn.classList.remove('added');
        btn.textContent = 'Добави в количката';
    }, 2000);
}

export function addToCart(id, name, price, inventory) {
    const maxQty = Number(inventory) || 0;
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx > -1) {
        if (maxQty && cart[idx].quantity >= maxQty) {
            showToast('Няма достатъчна наличност.', 'error');
            return;
        }
        cart[idx].quantity++;
    } else {
        if (maxQty === 0) {
            showToast('Продуктът е изчерпан.', 'error');
            return;
        }
        cart.push({ id, name, price: Number(price), quantity: 1, inventory: maxQty });
    }
    saveCart(cart);
    updateCartCount();
    showAddToCartFeedback(id);
}
