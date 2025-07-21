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

function createContentEnv(initial = '{}') {
  let stored = initial;
  return {
    PAGE_CONTENT: {
      async get() { return stored; },
      async put(_key, value) { stored = value; }
    },
    ORDERS: {
      async get() { return '[]'; },
      async put() {}
    },
    getStored() { return stored; }
  };
}

describe('page_content endpoint', () => {
  test('GET /page_content.json returns data', async () => {
    const env = createContentEnv('{"title":"Demo"}');
    const req = new Request('http://localhost/page_content.json', { method: 'GET' });
    const res = await handleRequest(req, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"title":"Demo"}');
  });

  test('POST /page_content.json updates data', async () => {
    const env = createContentEnv();
    const payload = { title: 'New' };
    const req = new Request('http://localhost/page_content.json', {
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

  test('POST /page_content.json with invalid JSON returns error', async () => {
    const env = createContentEnv();
    const req = new Request('http://localhost/page_content.json', {
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
