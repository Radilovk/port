// =======================================================
//          1. ИНИЦИАЛИЗАЦИЯ И ГЛОБАЛНИ ЕЛЕМЕНТИ
// =======================================================

const API_URL = 'https://port.radilov-k.workers.dev';

const DOM = {
    mainContainer: document.getElementById('main-content-container'),
    header: {
        logoImg: document.getElementById('header-logo-img'),
        brandName: document.getElementById('header-brand-name'),
        brandSlogan: document.getElementById('header-brand-slogan'),
        navLinks: document.getElementById('main-nav-links'),
        cartCount: document.getElementById('cart-count')
    },
    footer: {
        gridContainer: document.getElementById('footer-grid-container'),
        copyrightContainer: document.getElementById('footer-copyright-container')
    },
    themeToggle: document.getElementById('theme-toggle'),
    backToTopBtn: document.getElementById('back-to-top'),
    menuToggle: document.querySelector('.menu-toggle'),
    navLinksContainer: document.querySelector('.nav-links'),
    navOverlay: document.querySelector('.nav-overlay'),
    body: document.body
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


// =======================================================
//          2. ГЕНЕРАТОРИ НА HTML (GENERATOR FUNCTIONS)
// =======================================================

const slugify = str => str ? str.toLowerCase().replace(/\s+/g, '-') : '';

const generateVariantItem = variant => `
    <li class="variant-item">
        <strong>${variant.title}</strong>
        <span>${variant.description}</span>
        <a href="${variant.url}" class="variant-link" target="_blank" rel="noopener">Виж продукта</a>
    </li>`;

const generateEffectBar = effect => `
    <div class="effect-bar-group">
        <div class="effect-label">${effect.label}</div>
        <div class="effect-bar-container">
            <div class="effect-bar" data-width="${effect.value}%">${(effect.value / 10).toFixed(1)} / 10</div>
        </div>
    </div>`;

const generateProductCard = (product, index) => {
    const cardDetailsId = `card-details-${index}`;
    const productId = slugify(product.name);
    return `
    <article class="product-card fade-in-up" data-product-id="${productId}">
        <div class="card-header" role="button" aria-expanded="false" aria-controls="${cardDetailsId}" tabindex="0">
            <div class="product-title"><h3>${product.name}</h3><p>${product.tagline}</p></div>
            <div class="product-price">${Number(product.price).toFixed(2)} лв.</div>
            <div class="effects-container">
                ${product.effects.map(generateEffectBar).join('')}
            </div>
            <span class="expand-icon"></span>
        </div>
        <div class="card-details" id="${cardDetailsId}">
            <p>${product.description}</p>
            ${product.research_note && product.research_note.url ? `<div class="research-note">Източник: <a href="${product.research_note.url}" target="_blank" rel="noopener">${product.research_note.text}</a></div>` : ''}
            <h4 class="details-section-title">Налични форми:</h4>
            <ul class="product-variants">
                ${product.variants.map(generateVariantItem).join('')}
            </ul>
            <button class="add-to-cart-btn" data-id="${productId}" data-name="${product.name}" data-price="${product.price}">Добави в количката</button>
        </div>
    </article>`;
}

const generateHeroHTML = component => `
    <header class="hero-section">
        <canvas id="neuron-canvas"></canvas>
        <div class="container">
            <div class="hero-content">
                <h1>${component.title}</h1>
                <p>${component.subtitle}</p>
            </div>
        </div>
    </header>`;

const generateProductCategoryHTML = component => {
    const isCollapsible = component.options.is_collapsible;
    const isExpanded = component.options.is_expanded_by_default;
    const productGridId = `product-grid-${component.id}`;
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
                ${component.products.map(generateProductCard).join('')}
            </div>
        </div>
    </section>`;
}

const generateInfoCardHTML = component => `
    <section class="info-card-section fade-in-up ${'image-align-' + (component.options.image_align || 'left')}">
        <div class="container">
            <div class="info-card-image">
                <img src="${component.image}" alt="${component.title}" loading="lazy">
            </div>
            <div class="info-card-content">
                <h2>${component.title}</h2>
                <p>${component.content}</p>
                ${component.button && component.button.text ? `<a href="${component.button.url}" class="btn-primary">${component.button.text}</a>` : ''}
            </div>
        </div>
    </section>`;


// =======================================================
//          3. УПРАВЛЕНИЕ НА КОЛИЧКА (CART LOGIC)
// =======================================================

const getCart = () => JSON.parse(localStorage.getItem('cart') || '[]');
const saveCart = cart => localStorage.setItem('cart', JSON.stringify(cart));

const updateCartCount = () => {
    if (!DOM.header.cartCount) return;
    const count = getCart().reduce((acc, item) => acc + item.quantity, 0);
    DOM.header.cartCount.textContent = count;
};

const showAddToCartFeedback = (productId) => {
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

const addToCart = (id, name, price) => {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx > -1) {
        cart[idx].quantity++;
    } else {
        cart.push({ id, name, price: Number(price), quantity: 1 });
    }
    saveCart(cart);
    updateCartCount();
    showAddToCartFeedback(id);
};


// =======================================================
//          4. РЕНДЪРИ НА СЪДЪРЖАНИЕ (RENDERERS)
// =======================================================

function renderHeader(settings, navigation) {
    document.title = settings.site_name;
    DOM.header.logoImg.src = settings.logo_url;
    DOM.header.logoImg.alt = `${settings.site_name} Logo`;
    DOM.header.brandName.textContent = settings.site_name;
    DOM.header.brandSlogan.textContent = settings.site_slogan;

    const navItemsHTML = navigation.map(item => `<li><a href="${item.link}">${item.text}</a></li>`).join('');
    const persistentLis = DOM.header.navLinks.querySelectorAll('li:nth-last-child(-n+2)');
    DOM.header.navLinks.innerHTML = navItemsHTML;
    persistentLis.forEach(li => DOM.header.navLinks.appendChild(li));

    updateCartCount();
}

function renderMainContent(pageContent) {
    if (!DOM.mainContainer) return;
    
    let contentHtml = '';
    pageContent.forEach((component, index) => {
        switch (component.type) {
            case 'hero_banner':
                contentHtml += generateHeroHTML(component);
                break;
            case 'product_category':
                // Pass index to generator for unique IDs
                contentHtml += generateProductCategoryHTML(component, index);
                break;
            case 'info_card':
                contentHtml += generateInfoCardHTML(component);
                break;
            default:
                console.warn('Unknown component type:', component.type);
        }
    });

    DOM.mainContainer.innerHTML = contentHtml;
}

function renderFooter(settings, footer) {
    const columnsHTML = footer.columns.map(col => {
        if (col.type === 'logo') {
            return `<div class="footer-column">
                 <a href="#" class="logo-container footer-logo-container">
                    <img src="${settings.logo_url}" alt="${settings.site_name} Logo">
                    <div><span class="brand-name">${settings.site_name}</span><span class="brand-slogan">${settings.site_slogan}</span></div>
                </a>
            </div>`;
        }
        if (col.type === 'links') {
            const links = col.links.map(link => `<li><a href="${link.url}">${link.text}</a></li>`).join('');
            return `<div class="footer-column"><h4>${col.title}</h4><ul>${links}</ul></div>`;
        }
        return '';
    }).join('');
    DOM.footer.gridContainer.innerHTML = columnsHTML;
    DOM.footer.copyrightContainer.innerHTML = footer.copyright_text;
}


// =======================================================
//          5. ИНИЦИАЛИЗАЦИЯ НА СЪБИТИЯ (INITIALIZERS)
// =======================================================

function initializePageInteractions() {
    // Event delegation for accordions and buttons
    document.body.addEventListener('click', e => {
        const toggleAccordion = (header) => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            header.setAttribute('aria-expanded', !isExpanded);
        };

        const categoryHeader = e.target.closest('.category-section:not(.not-collapsible) .category-header');
        if (categoryHeader) {
            toggleAccordion(categoryHeader);
            return;
        }

        const cardHeader = e.target.closest('.product-card .card-header');
        if (cardHeader && !e.target.closest('.add-to-cart-btn')) {
            toggleAccordion(cardHeader);
            return;
        }
        
        const addToCartBtn = e.target.closest('.add-to-cart-btn');
        if (addToCartBtn) {
            e.stopPropagation();
            addToCart(addToCartBtn.dataset.id, addToCartBtn.dataset.name, addToCartBtn.dataset.price);
            return;
        }
    });

    // Keyboard accessibility for accordions
    document.body.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            const accordionHeader = e.target.closest('[role="button"][aria-expanded]');
            if (accordionHeader) {
                e.preventDefault(); // Prevent page scroll on space
                const isExpanded = accordionHeader.getAttribute('aria-expanded') === 'true';
                accordionHeader.setAttribute('aria-expanded', !isExpanded);
            }
        }
    });


    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                if (entry.target.classList.contains('product-card')) {
                    entry.target.querySelectorAll('.effect-bar').forEach(bar => {
                        bar.style.width = bar.dataset.width;
                        bar.classList.add('animated');
                    });
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in-up').forEach(el => scrollObserver.observe(el));

    // Initialize Canvas only on desktop
    if (window.innerWidth > 768) {
        setupCanvas();
        const debouncedResize = debounce(setupCanvas, 250);
        window.addEventListener('resize', debouncedResize);
    }
}

function initializeGlobalScripts() {
    DOM.themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        // Re-init canvas on theme change only if it exists
        if (document.getElementById('neuron-canvas') && window.innerWidth > 768) {
            setupCanvas();
        }
    });

    window.addEventListener('scroll', () => {
        DOM.backToTopBtn.classList.toggle('visible', window.scrollY > 300);
    });

    const closeMenu = () => {
        DOM.menuToggle.classList.remove('active');
        DOM.navLinksContainer.classList.remove('active');
        DOM.navOverlay.classList.remove('active');
        DOM.body.classList.remove('nav-open');
    };
    DOM.menuToggle.addEventListener('click', () => {
        DOM.menuToggle.classList.toggle('active');
        DOM.navLinksContainer.classList.toggle('active');
        DOM.navOverlay.classList.toggle('active');
        DOM.body.classList.toggle('nav-open');
    });
    DOM.navOverlay.addEventListener('click', closeMenu);
    DOM.navLinksContainer.addEventListener('click', e => {
        if (e.target.tagName === 'A' || e.target.closest('button')) {
            if (!e.target.closest('#theme-toggle')) {
                closeMenu();
            }
        }
    });

    updateCartCount();
}

function initializeScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    const navLinks = document.querySelectorAll('.nav-links a');
    
    const observer = new IntersectionObserver(entries => {
        let lastVisibleSectionId = null;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                lastVisibleSectionId = entry.target.id;
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${lastVisibleSectionId}`) {
                link.classList.add('active');
            }
        });
    }, { rootMargin: '-40% 0px -60% 0px' });

    sections.forEach(section => observer.observe(section));
}


// =======================================================
//          6. CANVAS АНИМАЦИЯ (CANVAS LOGIC)
// =======================================================
let animationFrameId;
let canvas, ctx, particles = [];

function setupCanvas() {
    canvas = document.getElementById('neuron-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    function resizeCanvas() {
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
        }
    }

    class Particle {
        constructor(x, y, dirX, dirY, size, color) { this.x = x; this.y = y; this.directionX = dirX; this.directionY = dirY; this.size = size; this.color = color; }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); }
        update() { if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX; if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY; this.x += this.directionX; this.y += this.directionY; this.draw(); }
    }

    function initCanvas() {
        resizeCanvas();
        particles = [];
        const particleCount = Math.floor((canvas.width * canvas.height) / 12000);
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height, (Math.random() * 0.4) - 0.2, (Math.random() * 0.4) - 0.2, Math.random() * 2 + 1, accentColor));
        }
    }

    function connect() {
        const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
        const connectDistance = Math.min(canvas.width, canvas.height) / 5;
        const connectArea = connectDistance * connectDistance;

        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                let distance = ((particles[a].x - particles[b].x) ** 2) + ((particles[a].y - particles[b].y) ** 2);
                if (distance < connectArea) {
                    let opacityValue = 1 - (distance / (connectArea * 1.1));
                    ctx.strokeStyle = `rgba(${accentRgb}, ${opacityValue})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(particles[a].x, particles[a].y); ctx.lineTo(particles[b].x, particles[b].y); ctx.stroke();
                }
            }
        }
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) particles[i].update();
        connect();
    }
    
    // Check if we need to re-initialize or just resize
    if (particles.length === 0) {
        initCanvas();
    } else {
        resizeCanvas();
    }
    animate();
}

// =======================================================
//          7. ГЛАВНА ИЗПЪЛНЯВАЩА ФУНКЦИЯ (MAIN)
// =======================================================
async function main() {
    initializeGlobalScripts();
    
    try {
        const response = await fetch(`${API_URL}/page_content.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        // Clear skeleton loader
        DOM.mainContainer.innerHTML = ''; 
        
        renderHeader(data.settings, data.navigation);
        renderMainContent(data.page_content);
        renderFooter(data.settings, data.footer);
        
        // Add loaded class after content is in the DOM
        DOM.mainContainer.classList.add('is-loaded');

        initializePageInteractions();
        initializeScrollSpy();

    } catch (error) {
        console.error("Fatal Error: Could not load or render page content.", error);
        DOM.mainContainer.innerHTML =
            `<div class="container" style="text-align: center; color: var(--text-secondary); padding: 5rem 1rem;">
                <h2>Грешка при зареждане на съдържанието</h2>
                <p>Не успяхме да се свържем със сървъра. Моля, опреснете страницата или опитайте по-късно.</p>
             </div>`;
    }
}

// Старт на приложението
main();
