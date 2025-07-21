import { ANALYTICS_URL, ANALYTICS_ID } from '../config.js';

function send(eventType, payload) {
    if (!ANALYTICS_URL || !ANALYTICS_ID) return;
    fetch(ANALYTICS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ANALYTICS_ID, type: eventType, payload })
    }).catch(err => console.error('Analytics error:', err));
}

export function trackPageView(path = window.location.pathname) {
    send('page_view', { path });
}

export function trackAddToCart(product) {
    send('add_to_cart', product);
}

export function trackPurchase(order) {
    send('purchase', order);
}
