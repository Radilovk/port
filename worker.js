// ==== ФИНАЛНА, ПЪЛНА И КОРЕГИРАНА ВЕРСИЯ НА worker.js ====

export default {
  // Добавен е 'ctx' като трети параметър за достъп до waitUntil
  async fetch(request, env, ctx) {

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

    // ==========================================================
    // ### НОВ МАРШРУТ: /quest-submit ###
    // Логика за обработка на въпросника и AI
    // ==========================================================
    if (url.pathname === '/quest-submit') {
      if (method !== 'POST') {
        return new Response('Method Not Allowed. Please use POST.', { status: 405, headers: corsHeaders });
      }

      try {
        const formData = await request.json();
        formData.id = `client-${Date.now()}`;
        formData.timestamp = new Date().toISOString();

        // Запис на клиента в KV (във фонов режим)
        const clientsListPromise = env.PAGE_CONTENT.get('clients', { type: 'json' }).then(list => {
          const updatedList = list || [];
          updatedList.push(formData);
          return env.PAGE_CONTENT.put('clients', JSON.stringify(updatedList, null, 2));
        });
        ctx.waitUntil(clientsListPromise);
        
        const mainPrompt = await env.PAGE_CONTENT.get('bot_prompt');
        const productListJSON = await env.PAGE_CONTENT.get('products');

        if (!mainPrompt || !productListJSON) {
          throw new Error("AI prompt or product list not configured in KV (PAGE_CONTENT).");
        }
        if (!env.ACCOUNT_ID || !env.AI_TOKEN) {
          throw new Error("ACCOUNT_ID or AI_TOKEN is not configured in worker secrets.");
        }

        const finalPrompt = mainPrompt
            .replace('{{productList}}', productListJSON)
            .replace('{{clientData}}', JSON.stringify(formData, null, 2));

        const model = '@cf/meta/llama-3-8b-instruct';
        const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/ai/run/${model}`;
        
        const payload = {
            messages: [{ role: 'system', content: finalPrompt }]
        };

        const response = await fetch(cfEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.AI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const resultText = await response.text();

        if (!response.ok) {
            throw new Error(`AI API request failed: ${resultText}`);
        }
        
        // Запис на резултата от AI във фонов режим
        try {
            const resultData = JSON.parse(resultText);
            const resultsListPromise = env.PAGE_CONTENT.get('results', { type: 'json' }).then(list => {
                const updatedList = list || [];
                updatedList.push({
                    clientId: formData.id,
                    timestamp: new Date().toISOString(),
                    recommendation: resultData
                });
                return env.PAGE_CONTENT.put('results', JSON.stringify(updatedList, null, 2));
            });
            ctx.waitUntil(resultsListPromise);
        } catch (e) {
            console.error("Could not save non-JSON AI result to KV:", e.message);
        }

        // Връщаме СУРОВИЯ отговор към фронтенда
        return new Response(resultText, {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (e) {
        console.error("Error in /quest-submit:", e.message);
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // ==========================================================
    // ### СЪЩЕСТВУВАЩА ЛОГИКА (НАПЪЛНО ЗАПАЗЕНА) ###
    // ==========================================================

    // --- Route: /orders ---
    else if (url.pathname === '/orders') {
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
          if (!body.status) body.status = 'Нова';
          let list = await env.ORDERS.get('list', 'json');
          if (!Array.isArray(list)) list = [];
          list.push(body);
          await env.ORDERS.put('list', JSON.stringify(list, null, 2));
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        case 'PUT': {
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
          const { index, status } = body;
          if (typeof index !== 'number' || !list[index]) {
            return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          list[index].status = status;
          await env.ORDERS.put('list', JSON.stringify(list, null, 2));
          return new Response(JSON.stringify({ status: 'ok' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
