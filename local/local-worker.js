import express from 'express';
import fs from 'fs/promises';
import { handleRequest } from './handler.js';

const app = express();
app.use(express.json());

const env = {
  ORDERS: {
    async get(key, type) {
      try {
        const text = await fs.readFile('./orders.json', 'utf8');
        return type === 'json' ? JSON.parse(text) : text;
      } catch {
        const init = '[]';
        await fs.writeFile('./orders.json', init);
        return type === 'json' ? JSON.parse(init) : init;
      }
    },
    async put(key, value) {
      await fs.writeFile('./orders.json', value);
    }
  },
  PAGE_CONTENT: {
    async get(key) {
      const fileMap = {
        'page_content': './site_content.json',
        'products': './products.json'
      };
      const file = fileMap[key] || './page_content.json';
      try {
        return await fs.readFile(file, 'utf8');
      } catch {
        const init = key === 'products' ? '{}' : '{}';
        await fs.writeFile(file, init);
        return init;
      }
    },
    async put(key, value) {
      const fileMap = {
        'page_content': './site_content.json',
        'products': './products.json'
      };
      const file = fileMap[key] || './page_content.json';
      await fs.writeFile(file, value);
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
