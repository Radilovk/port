// =======================================================
//          1. ИНИЦИАЛИЗАЦИЯ И ГЛОБАЛНИ ЕЛЕМЕНТИ
// =======================================================

import { API_URL } from './config.js';

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
    backToTopBtn: document.getElementById('back-to-top'),
    menuToggle: document.querySelector('.menu-toggle'),
    navLinksContainer: document.querySelector('.nav-links'),
    navOverlay: document.querySelector('.nav-overlay'),
    body: document.body,
    questModal: {
        backdrop: document.getElementById('quest-modal-backdrop'),
        container: document.getElementById('quest-modal-container'),
        iframe: document.getElementById('quest-modal-iframe')
    },
    toastContainer: document.getElementById('toast-container')
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

// --- START: MODIFIED FUNCTION ---
const generateProductCard = (product) => {
    // Проверка за сигурност: ако продуктът няма public_data, не го рендираме.
    if (!product.public_data) {
        console.warn(`Продукт с ID '${product.product_id}' няма 'public_data' и няма да бъде рендиран.`);
        return '';
    }

    const publicData = product.public_data;
    const inventory = product.system_data?.inventory ?? 0;
    const productId = product.product_id; // Използваме надеждния уникален ID
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
// --- END: MODIFIED FUNCTION ---


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

// --- START: MODIFIED FUNCTION ---
const generateProductCategoryHTML = (component, index) => {
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
// --- END: MODIFIED FUNCTION ---

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

const showToast = (message, type = 'info', duration = 3000) => {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
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

const addToCart = (id, name, price, inventory) => {
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
};


// =======================================================
//          4. РЕНДЪРИ НА СЪДЪРЖАНИЕ (RENDERERS)
// =======================================================

function renderHeader(settings, navigation) {
    document.title = settings.site_name;
    DOM.header.logoImg.src = encodeURI(settings.logo_url);
    DOM.header.logoImg.alt = `${settings.site_name} Logo`;
    DOM.header.brandName.textContent = settings.site_name;
    DOM.header.brandSlogan.textContent = settings.site_slogan;

    const navItemsHTML = navigation.map(item => `<li><a href="${item.link}">${item.text}</a></li>`).join('');
    const questionnaireLink = '<li><a href="quest.html">Въпросник</a></li>';
    const persistentLis = DOM.header.navLinks.querySelectorAll('li:nth-last-child(-n+2)');
    DOM.header.navLinks.innerHTML = navItemsHTML + questionnaireLink;
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

function initializePageInteractions(animationType = 'particles') {
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
            addToCart(
                addToCartBtn.dataset.id,
                addToCartBtn.dataset.name,
                addToCartBtn.dataset.price,
                addToCartBtn.dataset.inventory
            );
            return;
        }
    });

    document.body.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            const accordionHeader = e.target.closest('[role="button"][aria-expanded]');
            if (accordionHeader) {
                e.preventDefault();
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

    // Initialize Canvas with selected animation type
    initializeCanvasAnimation(animationType);
}

function initializeGlobalScripts() {

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
            closeMenu();
        }
    });

    // --- Quest Modal ---
    function openQuestModal(url) {
        DOM.questModal.iframe.src = url || 'quest.html';
        DOM.questModal.container.classList.add('show');
        DOM.questModal.backdrop.classList.add('show');
        DOM.body.classList.add('modal-open');
    }
    function closeQuestModal() {
        DOM.questModal.container.classList.remove('show');
        DOM.questModal.backdrop.classList.remove('show');
        DOM.questModal.iframe.src = '';
        DOM.body.classList.remove('modal-open');
    }
    DOM.questModal.backdrop.addEventListener('click', closeQuestModal);
    document.addEventListener('click', e => {
        const questLink = e.target.closest('a[href$="quest.html"]');
        if (questLink) {
            e.preventDefault();
            openQuestModal(questLink.getAttribute('href'));
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
let canvas, ctx,
    particles = [],
    lastWidth = 0,
    lastHeight = 0,
    currentAnimationType = 'particles',
    waveTime = 0; // Move waveTime to module scope

function initializeCanvasAnimation(animationType = 'particles', forceReinit = false) {
    canvas = document.getElementById('neuron-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');

    // Always cancel any existing animation before starting a new one
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Reset animation-specific state when switching types
    if (currentAnimationType !== animationType || forceReinit) {
        particles = [];
        waveTime = 0;
        currentAnimationType = animationType;
    }
    
    // Respect user preference for reduced motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    currentAnimationType = animationType;

    // --- Common Helper Functions ---
    function resizeCanvas() {
        const parent = canvas.parentElement;
        if (!parent) return;
        const width = parent.offsetWidth;
        const height = parent.offsetHeight;
        if (width === lastWidth && height === lastHeight) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        lastWidth = width;
        lastHeight = height;
    }

    // --- Animation Type 1: Floating Particles (Trust, Gentle) ---
    class FloatingParticle {
        constructor(x, y, dirX, dirY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = dirX;
            this.directionY = dirY;
            this.size = size;
            this.color = color;
            this.opacity = Math.random() * 0.5 + 0.5;
        }
        draw() {
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function initParticlesAnimation() {
        particles = [];
        const baseCount = Math.floor((canvas.width * canvas.height) / 12000);
        const particleCount = Math.max(10, Math.floor(baseCount * (window.innerWidth < 768 ? 0.6 : 1)));
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        for (let i = 0; i < particleCount; i++) {
            particles.push(new FloatingParticle(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                (Math.random() * 0.3) - 0.15,
                (Math.random() * 0.3) - 0.15,
                Math.random() * 3 + 1,
                accentColor
            ));
        }
    }

    function animateParticles() {
        animationFrameId = requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw particles
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
        }
        
        // Connect nearby particles
        const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
        const connectDistance = Math.min(canvas.width, canvas.height) / 6;
        const connectArea = connectDistance * connectDistance;

        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                let distance = ((particles[a].x - particles[b].x) ** 2) + ((particles[a].y - particles[b].y) ** 2);
                if (distance < connectArea) {
                    let opacityValue = (1 - (distance / connectArea)) * 0.3;
                    ctx.strokeStyle = `rgba(${accentRgb}, ${opacityValue})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    // --- Animation Type 2: Gradient Waves (Calming, Flowing) ---
    function animateWaves() {
        animationFrameId = requestAnimationFrame(animateWaves);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
        waveTime += 0.01;
        
        // Draw multiple wave layers
        for (let layer = 0; layer < 3; layer++) {
            ctx.beginPath();
            const amplitude = 40 + layer * 20;
            const frequency = 0.01 - layer * 0.002;
            const yOffset = canvas.height * 0.3 + layer * 50;
            const opacity = 0.15 - layer * 0.04;
            
            for (let x = 0; x < canvas.width; x++) {
                const y = yOffset + Math.sin(x * frequency + waveTime + layer) * amplitude;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, `rgba(${accentRgb}, ${opacity})`);
            gradient.addColorStop(1, `rgba(${accentRgb}, 0)`);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    // --- Animation Type 3: Pulse Rings (Energy, Transformation) ---
    class PulseRing {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.radius = 0;
            this.maxRadius = Math.random() * 150 + 100;
            this.speed = Math.random() * 0.5 + 0.3;
            this.opacity = 1;
        }
        update() {
            this.radius += this.speed;
            this.opacity = 1 - (this.radius / this.maxRadius);
            
            if (this.radius >= this.maxRadius) {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.radius = 0;
                this.opacity = 1;
            }
        }
        draw() {
            const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${accentRgb}, ${this.opacity * 0.4})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function initPulseRings() {
        particles = [];
        const ringCount = Math.max(3, Math.floor((canvas.width * canvas.height) / 150000));
        for (let i = 0; i < ringCount; i++) {
            particles.push(new PulseRing());
        }
    }

    function animatePulseRings() {
        animationFrameId = requestAnimationFrame(animatePulseRings);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
    }

    // --- Animation Type 4: Rising Bubbles (Lightness, Ascension) ---
    class Bubble {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + Math.random() * 200;
            this.radius = Math.random() * 20 + 10;
            this.speed = Math.random() * 0.5 + 0.3;
            this.opacity = Math.random() * 0.3 + 0.2;
            this.wobble = Math.random() * 0.02 + 0.01;
            this.wobbleOffset = Math.random() * Math.PI * 2;
        }
        update() {
            this.y -= this.speed;
            this.wobbleOffset += this.wobble;
            
            if (this.y + this.radius < 0) {
                this.y = canvas.height + this.radius;
                this.x = Math.random() * canvas.width;
            }
        }
        draw() {
            const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
            const wobbleX = Math.sin(this.wobbleOffset) * 20;
            
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.arc(this.x + wobbleX, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${accentRgb}, 0.3)`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${accentRgb}, 0.6)`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    function initBubbles() {
        particles = [];
        const bubbleCount = Math.max(10, Math.floor((canvas.width * canvas.height) / 20000));
        for (let i = 0; i < bubbleCount; i++) {
            particles.push(new Bubble());
        }
    }

    function animateBubbles() {
        animationFrameId = requestAnimationFrame(animateBubbles);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
    }

    // --- Animation Type 5: Neuron Network (Classic) ---
    class Neuron {
        constructor(x, y, dirX, dirY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = dirX;
            this.directionY = dirY;
            this.size = size;
            this.color = color;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function initNeurons() {
        particles = [];
        const baseCount = Math.floor((canvas.width * canvas.height) / 12000);
        const particleCount = Math.max(10, Math.floor(baseCount * (window.innerWidth < 768 ? 0.6 : 1)));
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Neuron(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                (Math.random() * 0.4) - 0.2,
                (Math.random() * 0.4) - 0.2,
                Math.random() * 2 + 1,
                accentColor
            ));
        }
    }

    function animateNeurons() {
        animationFrameId = requestAnimationFrame(animateNeurons);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
        }
        
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
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    // --- Execution Logic ---
    resizeCanvas();
    
    switch (animationType) {
        case 'particles':
            if (particles.length === 0 || forceReinit) {
                initParticlesAnimation();
            }
            animateParticles();
            break;
        case 'waves':
            animateWaves();
            break;
        case 'pulseRings':
            if (particles.length === 0 || forceReinit) {
                initPulseRings();
            }
            animatePulseRings();
            break;
        case 'bubbles':
            if (particles.length === 0 || forceReinit) {
                initBubbles();
            }
            animateBubbles();
            break;
        case 'neuron':
        default:
            if (particles.length === 0 || forceReinit) {
                initNeurons();
            }
            animateNeurons();
            break;
    }

    const debouncedResize = debounce(() => {
        const prevWidth = lastWidth;
        const prevHeight = lastHeight;
        resizeCanvas();
        
        // Only reinitialize particles if canvas size actually changed
        if ((prevWidth !== lastWidth || prevHeight !== lastHeight) && 
            ['particles', 'pulseRings', 'bubbles', 'neuron'].includes(currentAnimationType)) {
            particles = [];
            // Reinitialize particles based on animation type
            switch(currentAnimationType) {
                case 'particles':
                    initParticlesAnimation();
                    break;
                case 'pulseRings':
                    initPulseRings();
                    break;
                case 'bubbles':
                    initBubbles();
                    break;
                case 'neuron':
                    initNeurons();
                    break;
            }
        }
    }, 100);
    window.addEventListener('resize', debouncedResize);
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

        DOM.mainContainer.innerHTML = ''; 
        
        renderHeader(data.settings, data.navigation);
        renderMainContent(data.page_content);
        renderFooter(data.settings, data.footer);
        
        DOM.mainContainer.classList.add('is-loaded');

        // Get animation type from settings, default to 'particles'
        const animationType = data.settings.background_animation || 'particles';
        initializePageInteractions(animationType);
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
