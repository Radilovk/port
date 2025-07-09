export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function handleRequest(request, env) {
  const { method } = request;
  const url = new URL(request.url);

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname === '/orders') {
    switch (method) {
      case 'GET': {
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
  } else if (url.pathname === '/page_content.json') {
    switch (method) {
      case 'GET': {
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
        try {
          await request.clone().json();
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const text = await request.text();
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

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

