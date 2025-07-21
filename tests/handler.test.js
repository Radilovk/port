import { handleRequest } from '../local/handler.js';

function createOrdersEnv(initial = '[]') {
  let stored = initial;
  return {
    ORDERS: {
      async get(_key, type) {
        return type === 'json' ? JSON.parse(stored) : stored;
      },
      async put(_key, value) {
        stored = value;
      }
    },
    PAGE_CONTENT: {
      async get() { return '{}'; },
      async put() {}
    },
    getStored() { return stored; }
  };
}

describe('orders endpoint', () => {
  test('GET /orders returns list', async () => {
    const env = createOrdersEnv('[1]');
    const req = new Request('http://localhost/orders', { method: 'GET' });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('[1]');
  });

  test('POST /orders stores new order', async () => {
    const env = createOrdersEnv();
    const payload = { id: 1 };
    const req = new Request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(JSON.parse(env.getStored())).toEqual([{ ...payload, status: 'Нова' }]);
  });

  test('PUT /orders updates status', async () => {
    const env = createOrdersEnv('[{"id":1,"status":"Нова"}]');
    const req = new Request('http://localhost/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: 0, status: 'Изпратена' })
    });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(JSON.parse(env.getStored())).toEqual([{ id: 1, status: 'Изпратена' }]);
  });

  test('POST /orders with invalid JSON returns error', async () => {
    const env = createOrdersEnv();
    const req = new Request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid}'
    });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Invalid JSON' });
  });
});

describe('products endpoint', () => {
  test('GET /products.json returns data', async () => {
    const env = createContentEnv('{"product_categories":[]}');
    const req = new Request('http://localhost/products.json', { method: 'GET' });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"product_categories":[]}');
  });

  test('POST /products.json updates data', async () => {
    const env = createContentEnv();
    const payload = { product_categories: [{ id: 1 }] };
    const req = new Request('http://localhost/products.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(env.getStored()).toBe(JSON.stringify(payload));
  });

  test('POST /products.json with invalid JSON returns error', async () => {
    const env = createContentEnv();
    const req = new Request('http://localhost/products.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid}'
    });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Invalid JSON' });
  });
});
function createContentEnv(initial = '{}') {
  let stored = initial;
  return {
    PAGE_CONTENT: {
      async get(key) { return stored; },
      async put(_key, value) { stored = value; }
    },
    ORDERS: {
      async get() { return '[]'; },
      async put() {}
    },
    getStored() { return stored; }
  };
}

describe('site_content endpoint', () => {
  test('GET /site_content.json returns data', async () => {
    const env = createContentEnv('{"title":"Demo"}');
    const req = new Request('http://localhost/site_content.json', { method: 'GET' });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"title":"Demo"}');
  });

  test('POST /site_content.json updates data', async () => {
    const env = createContentEnv();
    const payload = { title: 'New' };
    const req = new Request('http://localhost/site_content.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(env.getStored()).toBe(JSON.stringify(payload));
  });

  test('POST /site_content.json with invalid JSON returns error', async () => {
    const env = createContentEnv();
    const req = new Request('http://localhost/site_content.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid}'
    });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: 'Invalid JSON' });
  });
});
