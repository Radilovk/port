const express = require('express');
const fs = require('fs/promises');

const app = express();
app.use(express.json());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

async function handleRequest(request, env) {
  const { method } = request;
  const url = new URL(request.url);

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname === '/orders') {
    switch (method) {
      case 'GET': {
        const data = await env.ORDERS.get('list');
        return new Response(data || '[]', {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      case 'POST': {
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        let list = await env.ORDERS.get('list', 'json');
        if (!Array.isArray(list)) list = [];
        list.push(body);
        await env.ORDERS.put('list', JSON.stringify(list, null, 2));
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      default:
        return new Response('Method Not Allowed', {
          status: 405,
          headers: corsHeaders
        });
    }
  } else if (url.pathname === '/page_content.json') {
    switch (method) {
      case 'GET': {
        const data = await env.PAGE_CONTENT.get('data');
        return new Response(data || '{}', {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      case 'POST': {
        try {
          await request.clone().json();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const text = await request.text();
        await env.PAGE_CONTENT.put('data', text);
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      default:
        return new Response('Method Not Allowed', {
          status: 405,
          headers: corsHeaders
        });
    }
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

const env = {
  ORDERS: {
    async get(key, type) {
      try {
        const text = await fs.readFile('./orders.json', 'utf8');
        return type === 'json' ? JSON.parse(text) : text;
      } catch {
        return type === 'json' ? null : null;
      }
    },
    async put(key, value) {
      await fs.writeFile('./orders.json', value);
    }
  },
  PAGE_CONTENT: {
    async get(key) {
      try {
        return await fs.readFile('./page_content.json', 'utf8');
      } catch {
        return null;
      }
    },
    async put(key, value) {
      await fs.writeFile('./page_content.json', value);
    }
  }
};

app.all('*', async (req, res) => {
  const request = new Request(`http://localhost:3000${req.originalUrl}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : JSON.stringify(req.body)
  });
  const response = await handleRequest(request, env);
  const text = await response.text();
  res.status(response.status);
  response.headers.forEach((v, k) => res.setHeader(k, v));
  res.send(text);
});

app.listen(3000, () => console.log('Local worker listening on port 3000'));
