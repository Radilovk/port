addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { method } = request;
  const url = new URL(request.url);

    if (url.pathname === '/orders' && method === 'GET') {
      const data = await ORDERS.get('list');
      return new Response(data || '[]', {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/orders' && method === 'POST') {
      const body = await request.json();
      let list = await ORDERS.get('list', 'json');
      if (!Array.isArray(list)) list = [];
      list.push(body);
      await ORDERS.put('list', JSON.stringify(list, null, 2));
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/page_content.json' && method === 'GET') {
      const data = await PAGE_CONTENT.get('data');
      return new Response(data || '{}', {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/page_content.json' && method === 'POST') {
      const text = await request.text();
      await PAGE_CONTENT.put('data', text);
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  return new Response('Not Found', { status: 404 });
}

