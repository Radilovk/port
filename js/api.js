import { API_URL } from '../config.js';

export async function fetchPageContent() {
    const response = await fetch(`${API_URL}/page_content.json?v=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}

export async function savePageContent(data) {
    const response = await fetch(`${API_URL}/page_content.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}

export async function fetchOrders() {
    const response = await fetch(`${API_URL}/orders?v=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
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
