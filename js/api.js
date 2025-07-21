import { API_URL } from '../config.js';

async function tryFetch(url) {
    try {
        const res = await fetch(url);
        if (res.ok) return res;
    } catch (_) {}
    return null;
}

async function fetchWithFallback(endpoint) {
    const primary = await tryFetch(`${API_URL}${endpoint}`);
    if (primary) return primary;
    const secondary = await tryFetch(endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
    if (secondary) return secondary;
    throw new Error('Failed to fetch ' + endpoint);
}

export async function fetchSiteContent() {
    const response = await fetchWithFallback(`/site_content.json?v=${Date.now()}`);
    return response.json();
}

export async function saveSiteContent(data) {
    const response = await fetch(`${API_URL}/site_content.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}

export async function fetchProducts() {
    const response = await fetchWithFallback(`/products.json?v=${Date.now()}`);
    return response.json();
}

export async function saveProducts(data) {
    const response = await fetch(`${API_URL}/products.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}

export async function fetchOrders() {
    const response = await fetchWithFallback(`/orders?v=${Date.now()}`);
    return response.json();
}

export async function updateOrderStatus(id, status) {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}

export async function createOrder(order) {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}
