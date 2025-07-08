document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        toggle.textContent = '🌚';
    }

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const dark = document.body.classList.contains('dark');
        toggle.textContent = dark ? '🌚' : '🌞';
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    });

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
