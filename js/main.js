import { fetchPageContent } from './api.js';
import { addToCart, updateCartCount } from './cart.js';
import { generateHeroHTML } from './components/hero.js';
import { generateProductCategoryHTML } from './components/productCategory.js';
import { generateInfoCardHTML } from './components/infoCard.js';
import { trackPageView, trackAddToCart } from "./analytics.js";

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
    }
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

function initializePageInteractions() {
    document.body.addEventListener('click', e => {
        const toggleAccordion = header => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            header.setAttribute('aria-expanded', !isExpanded);
        };

        const categoryHeader = e.target.closest('.category-section:not(.not-collapsible) .category-header');
        if (categoryHeader) {
            toggleAccordion(categoryHeader);
            return;
        }

        const card = e.target.closest('.product-card');
        if (card && !e.target.closest('.add-to-cart-btn')) {
            window.location.href = `product.html?id=${card.dataset.productId}`;
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
            trackAddToCart({ id: addToCartBtn.dataset.id, name: addToCartBtn.dataset.name, price: Number(addToCartBtn.dataset.price) });
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

    initializeCanvasAnimation();
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

    function openQuestModal(url) {
        const iframe = document.getElementById('quest-modal-iframe');
        const backdrop = document.getElementById('quest-modal-backdrop');
        const container = document.getElementById('quest-modal-container');
        iframe.src = url || 'quest.html';
        container.classList.add('show');
        backdrop.classList.add('show');
        DOM.body.classList.add('modal-open');
    }
    function closeQuestModal() {
        const iframe = document.getElementById('quest-modal-iframe');
        const backdrop = document.getElementById('quest-modal-backdrop');
        const container = document.getElementById('quest-modal-container');
        container.classList.remove('show');
        backdrop.classList.remove('show');
        iframe.src = '';
        DOM.body.classList.remove('modal-open');
    }
    document.getElementById('quest-modal-backdrop').addEventListener('click', closeQuestModal);
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

let animationFrameId;
let canvas, ctx,
    particles = [],
    lastWidth = 0,
    lastHeight = 0;

function initializeCanvasAnimation(forceReinit = false) {
    canvas = document.getElementById('neuron-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    class Particle {
        constructor(x, y, dirX, dirY, size, color) { this.x = x; this.y = y; this.directionX = dirX; this.directionY = dirY; this.size = size; this.color = color; }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); }
        update() { if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX; if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY; this.x += this.directionX; this.y += this.directionY; this.draw(); }
    }

    function initParticles() {
        particles = [];
        const baseCount = Math.floor((canvas.width * canvas.height) / 12000);
        const particleCount = Math.max(10, Math.floor(baseCount * (window.innerWidth < 768 ? 0.6 : 1)));
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height, (Math.random() * 0.4) - 0.2, (Math.random() * 0.4) - 0.2, Math.random() * 2 + 1, accentColor));
        }
    }

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

    if (particles.length === 0 || forceReinit) {
        resizeCanvas();
        initParticles();
    }

    animate();

    const debouncedResize = debounce(resizeCanvas, 100);
    window.addEventListener('resize', debouncedResize);
}

async function main() {
    initializeGlobalScripts();

    try {
        const data = await fetchPageContent();

        DOM.mainContainer.innerHTML = '';

        renderHeader(data.settings, data.navigation);
        renderMainContent(data.page_content);
        renderFooter(data.settings, data.footer);

        DOM.mainContainer.classList.add('is-loaded');

        initializePageInteractions();
        initializeScrollSpy();
        trackPageView();

    } catch (error) {
        console.error('Fatal Error: Could not load or render page content.', error);
        DOM.mainContainer.innerHTML =
            `<div class="container" style="text-align: center; color: var(--text-secondary); padding: 5rem 1rem;">
                <h2>Грешка при зареждане на съдържанието</h2>
                <p>Не успяхме да се свържем със сървъра. Моля, опреснете страницата или опитайте по-късно.</p>
             </div>`;
    }
}

main();
