document.addEventListener('DOMContentLoaded', () => {

    const priceSpan = document.getElementById('product-price');
    if (priceSpan) {
        const price = localStorage.getItem('product-price') || '0.00';
        priceSpan.textContent = parseFloat(price).toFixed(2);
    }

    const priceInput = document.getElementById('price-input');
    const saveBtn = document.getElementById('save-price');
    if (priceInput && saveBtn) {
        const price = localStorage.getItem('product-price') || '0.00';
        priceInput.value = parseFloat(price).toFixed(2);
        saveBtn.addEventListener('click', () => {
            const val = parseFloat(priceInput.value).toFixed(2);
            localStorage.setItem('product-price', val);
            alert('Цената е запазена');
        });
    }
});
