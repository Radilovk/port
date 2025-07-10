// ==== ПОСТАВИ ЦЕЛИЯ ТОЗИ КОД В worker.js ====

export default {
  async fetch(request, env) {

    // --- CORS Headers ---
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    const { method } = request;
    const url = new URL(request.url);

    // --- Handle OPTIONS request for CORS ---
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- Route: /orders ---
    if (url.pathname === '/orders') {
      switch (method) {
        case 'GET': {
          if (!env.ORDERS) {
            return new Response(JSON.stringify({ error: "ORDERS KV namespace is not bound." }), { status: 500, headers: corsHeaders });
          }
          let data = await env.ORDERS.get('list');
          if (data === null) {
            data = '[]';
            await env.ORDERS.put('list', data);
          }
          return new Response(data, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        case 'POST': {
          if (!env.ORDERS) {
            return new Response(JSON.stringify({ error: "ORDERS KV namespace is not bound." }), { status: 500, headers: corsHeaders });
          }
          let body;
          try {
            body = await request.json();
          } catch (e) {
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
    }

    // --- Route: /page_content.json ---
    else if (url.pathname === '/page_content.json') {
      switch (method) {
        case 'GET': {
          if (!env.PAGE_CONTENT) {
            return new Response(JSON.stringify({ error: "PAGE_CONTENT KV namespace is not bound." }), { status: 500, headers: corsHeaders });
          }
          let data = await env.PAGE_CONTENT.get('page_content');
          if (data === null) {
            data = '{}';
            await env.PAGE_CONTENT.put('page_content', data);
          }
          return new Response(data, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        case 'POST': {
          if (!env.PAGE_CONTENT) {
            return new Response(JSON.stringify({ error: "PAGE_CONTENT KV namespace is not bound." }), { status: 500, headers: corsHeaders });
          }
          let text;
          try {
            text = await request.text();
            JSON.parse(text); // за валидация
          } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          await env.PAGE_CONTENT.put('page_content', text);
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

    // --- Fallback: Not Found ---
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
