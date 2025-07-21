// ==== ВЕРСИЯ 4.0: ФУНКЦИОНАЛЕН АДМИН ПАНЕЛ ====

class UserFacingError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'UserFacingError';
    this.status = status || 500;
  }
}

// --- ОСНОВЕН РУТЕР И ОБРАБОТКА НА ЗАЯВКИ ---

export default {
  /**
   * @param {Request} request
   * @param {object} env
   * @param {object} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', // Добавяме PUT
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    try {
      let response;
      // --- МОДИФИЦИРАН РУТЕР ---
      switch (url.pathname) {
        case '/quest-submit':
          response = await handleQuestSubmit(request, env, ctx);
          break;

        case '/site_content.json':
        case '/page_content.json': // съвместимост
          if (request.method === 'GET') {
              response = await handleGetSiteContent(request, env);
          } else if (request.method === 'POST') {
              response = await handleSaveSiteContent(request, env, ctx);
          } else {
              throw new UserFacingError('Method Not Allowed.', 405);
          }
          break;

        case '/products.json':
          if (request.method === 'GET') {
              response = await handleGetProducts(request, env);
          } else if (request.method === 'POST') {
              response = await handleSaveProducts(request, env, ctx);
          } else {
              throw new UserFacingError('Method Not Allowed.', 405);
          }
          break;
        
        case '/orders':
            // --- НОВ ЕНДПОЙНТ ЗА ПОРЪЧКИ ---
            if (request.method === 'GET') {
                response = await handleGetOrders(request, env);
            } else if (request.method === 'PUT') {
                response = await handleUpdateOrderStatus(request, env, ctx);
            } else {
                throw new UserFacingError('Method Not Allowed.', 405);
            }
            break;
          
        default:
          throw new UserFacingError('Not Found', 404);
      }

      // Добавяме CORS хедъри към всеки успешен отговор
      Object.keys(corsHeaders).forEach(key => {
        response.headers.set(key, corsHeaders[key]);
      });
      return response;

    } catch (e) {
      console.error("Top-level error:", e.stack);
      const statusCode = e instanceof UserFacingError ? e.status : 500;
      const userErrorMessage = (e instanceof UserFacingError) 
        ? e.message 
        : "An unexpected internal error occurred.";
        
      const errorResponse = new Response(JSON.stringify({ error: userErrorMessage }), { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      return errorResponse;
    }
  }
};


// --- СПЕЦИФИЧНИ ОБРАБОТЧИЦИ НА ЕНДПОЙНТИ ---

/**
 * Handles GET /site_content.json
 */
async function handleGetSiteContent(request, env) {
    const siteContent = await env.PAGE_CONTENT.get('site_content');
    if (siteContent === null) {
        throw new UserFacingError("Content not found.", 404);
    }
    return new Response(siteContent, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * Handles POST /site_content.json
 */
async function handleSaveSiteContent(request, env, ctx) {
    const contentToSave = await request.text();
    try {
        JSON.parse(contentToSave);
        ctx.waitUntil(env.PAGE_CONTENT.put('site_content', contentToSave));
        return new Response(JSON.stringify({ success: true, message: 'Content saved.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        throw new UserFacingError("Invalid JSON provided in the request body.", 400);
    }
}

/**
 * Handles GET /products.json
 */
async function handleGetProducts(request, env) {
    const products = await env.PAGE_CONTENT.get('products');
    if (products === null) {
        throw new UserFacingError("Content not found.", 404);
    }
    return new Response(products, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * Handles POST /products.json
 */
async function handleSaveProducts(request, env, ctx) {
    const contentToSave = await request.text();
    try {
        JSON.parse(contentToSave);
        ctx.waitUntil(env.PAGE_CONTENT.put('products', contentToSave));
        return new Response(JSON.stringify({ success: true, message: 'Content saved.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        throw new UserFacingError("Invalid JSON provided in the request body.", 400);
    }
}

/**
 * --- НОВА ФУНКЦИЯ ---
 * Handles GET /orders
 */
async function handleGetOrders(request, env) {
    // Връщаме съществуващите поръчки или празен масив
    const ordersJson = await env.PAGE_CONTENT.get('orders');
    const orders = ordersJson ? JSON.parse(ordersJson) : [];
    return new Response(JSON.stringify(orders), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * --- НОВА ФУНКЦИЯ ---
 * Handles PUT /orders (за промяна на статус)
 */
async function handleUpdateOrderStatus(request, env, ctx) {
    const updateData = await request.json();
    if (!updateData || !updateData.id || !updateData.status) {
        throw new UserFacingError("Липсват ID на поръчка или нов статус.", 400);
    }
    
    const ordersJson = await env.PAGE_CONTENT.get('orders');
    let orders = ordersJson ? JSON.parse(ordersJson) : [];
    
    const orderIndex = orders.findIndex(o => o.id === updateData.id);
    if (orderIndex === -1) {
        throw new UserFacingError(`Поръчка с ID ${updateData.id} не е намерена.`, 404);
    }
    
    orders[orderIndex].status = updateData.status;
    
    ctx.waitUntil(env.PAGE_CONTENT.put('orders', JSON.stringify(orders, null, 2)));
    
    return new Response(JSON.stringify({ success: true, updatedOrder: orders[orderIndex] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * Handles POST /quest-submit
 */
async function handleQuestSubmit(request, env, ctx) {
  const formData = await request.json();
  if (!formData || !formData.goals || !formData.age || !formData.name) {
    throw new UserFacingError("Липсват задължителни данни.", 400);
  }

  formData.id = `client-${Date.now()}`;
  formData.timestamp = new Date().toISOString();
  // Модификация: Запазваме данните на клиента в 'clients', а поръчката в 'orders'
  const orderData = {
      id: `order-${Date.now()}`,
      timestamp: formData.timestamp,
      customer: {
          firstName: formData.name,
          lastName: '', // Може да се добави по-късно
          phone: formData.phone || '',
          email: formData.email
      },
      products: [], // AI ще ги попълни
      status: 'Нова'
  };
  
  ctx.waitUntil(saveClientData(env, formData)); // Запазваме данните от въпросника

  const pageContentJSON = await env.PAGE_CONTENT.get('products');
  const mainPromptTemplate = await env.PAGE_CONTENT.get('bot_prompt');

  if (!pageContentJSON || !mainPromptTemplate) {
      throw new Error("Critical KV data missing: 'products' or 'bot_prompt' not found.");
  }
  
  const productsForAI = transformProductsForAI(JSON.parse(pageContentJSON));
  
  const recommendation = await getAIRecommendation(env, formData, productsForAI, mainPromptTemplate);
  
  // Добавяме препоръчаните продукти към поръчката
  orderData.products = recommendation.recommended_products.map(p => ({
      id: p.product_id,
      name: p.name,
      quantity: 1 // По подразбиране
  }));
  
  ctx.waitUntil(saveOrder(env, orderData)); // Запазваме новата поръчка
  ctx.waitUntil(saveAIResult(env, formData.id, recommendation));

  return new Response(JSON.stringify(recommendation), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ... останалата част от AI логиката и помощните функции остават същите ...

// --- AI И ЛОГИКА ЗА ДАННИ ---

function transformProductsForAI(data) {
  let categories = [];
  if (data && Array.isArray(data.product_categories)) {
    categories = data.product_categories;
  } else if (data && Array.isArray(data.page_content)) {
    categories = data.page_content.filter(c => c.type === 'product_category');
  } else {
    console.error("Invalid product data structure for transformation.");
    return [];
  }
  const allProducts = categories
    .filter(cat => Array.isArray(cat.products))
    .flatMap(cat => cat.products);
  return allProducts.map(product => ({
    product_id: product.product_id,
    name: product.public_data.name,
    description: product.public_data.description,
    system_data: product.system_data
  }));
}

async function getAIRecommendation(env, formData, productList, mainPromptTemplate) {
  if (!env.ACCOUNT_ID || !env.AI_TOKEN) {
    throw new Error("Cloudflare Account/AI credentials are not configured.");
  }
  const finalPrompt = mainPromptTemplate
    .replace('{{productList}}', JSON.stringify(productList, null, 2))
    .replace('{{clientData}}', JSON.stringify(formData, null, 2));
  const model = '@cf/meta/llama-3.1-70b-instruct';
  const cfEndpoint = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/ai/run/${model}`;
  const payload = {
    messages: [{ role: 'system', content: finalPrompt }],
    max_tokens: 2048,
    temperature: 0.2
  };
  const response = await fetch(cfEndpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.AI_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const resultText = await response.text();
  if (!response.ok) {
    console.error("AI API Request Failed. Status:", response.status, "Body:", resultText);
    throw new UserFacingError("AI сървърът върна грешка. Моля, свържете се с администратор.");
  }
  try {
    const aiEnvelope = JSON.parse(resultText);
    if (!aiEnvelope.result || !aiEnvelope.result.response) {
      throw new Error("AI response is missing the 'result.response' field.");
    }
    let recommendationData = aiEnvelope.result.response;
    if (typeof recommendationData === 'string') {
      const jsonMatch = recommendationData.match(/{[\s\S]*}/);
      if (!jsonMatch) {
          console.error("AI returned a string, but no JSON structure was found. String:", recommendationData);
          throw new UserFacingError('AI отговори с текст, в който не се открива JSON структура.');
      }
      try {
          recommendationData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
          console.error("Failed to parse extracted JSON from AI. String:", jsonMatch[0], parseError);
          throw new UserFacingError('AI отговори с низ, който не е валиден JSON дори след извличане.');
      }
    }
    if (typeof recommendationData !== 'object' || recommendationData === null || !recommendationData.recommended_products) {
        throw new UserFacingError('AI отговори с неочакван формат на данните.');
    }
    return recommendationData;
  } catch (e) {
    if (e instanceof UserFacingError) throw e; 
    console.error("The entire AI response was not valid JSON. Raw text:", resultText, e);
    throw new UserFacingError("Цялостният отговор от AI не беше валиден JSON.");
  }
}

// --- ПОМОЩНИ ФУНКЦИИ ЗА ЗАПИС В KV ---

async function saveClientData(env, formData) {
  try {
    const list = await env.PAGE_CONTENT.get('clients', { type: 'json' }) || [];
    list.push(formData);
    await env.PAGE_CONTENT.put('clients', JSON.stringify(list, null, 2));
  } catch (e) {
    console.error("Failed to save client data to KV:", e);
  }
}

// --- НОВА ФУНКЦИЯ ЗА ЗАПИС НА ПОРЪЧКИ ---
async function saveOrder(env, orderData) {
  try {
    const list = await env.PAGE_CONTENT.get('orders', { type: 'json' }) || [];
    list.push(orderData);
    await env.PAGE_CONTENT.put('orders', JSON.stringify(list, null, 2));
  } catch (e) {
    console.error("Failed to save order data to KV:", e);
  }
}

async function saveAIResult(env, clientId, recommendation) {
  try {
    const resultsList = await env.PAGE_CONTENT.get('results', { type: 'json' }) || [];
    resultsList.push({
      clientId: clientId,
      timestamp: new Date().toISOString(),
      recommendation: recommendation
    });
    await env.PAGE_CONTENT.put('results', JSON.stringify(resultsList, null, 2));
  } catch (e) {
    console.error("Failed to save AI result to KV:", e);
  }
}
