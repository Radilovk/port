# BIOCODE - Онлайн Магазин за пептиди

"BIOCODE" е примерен магазин, който визуализира продукти от `page_content.json` и съхранява поръчките локално или в Cloudflare KV. Основните HTML страници се намират в корена на проекта.

## Стартиране на локален сървър
1. Инсталирайте зависимостите:
   ```bash
   npm install
   ```
2. Стартирайте `worker.js`:
   ```bash
   node worker.js
   ```
   Сървърът слуша на порт **3000** и обслужва маршрути `/orders` и `/page_content.json`.

За Cloudflare Worker версия може да използвате:
```bash
wrangler dev
```
или
```bash
npm start
```

## Страници
- **index.html** – основната витрина. Данните за продукти и навигация се зареждат от `page_content.json`.
- **checkout.html** – страница за завършване на поръчката. Изпраща кошницата към `/orders`.
- **admin.html** – администраторски панел за редакция на съдържанието и преглед на поръчки.

## JSON файлове
- **page_content.json** съдържа настройките на сайта (име, навигация, продукти).
- **orders.json** пази направените поръчки при локално стартиране.

## Cloudflare Workers
Cloudflare Workers е безсървърна среда и се различава от Node изпълнението на `worker.js`.
Вместо Express и локална файлова система се използват `fetch` събития и KV хранилища.
За коректни типови проверки инсталирайте dev-зависимостта `@cloudflare/workers-types`:
```bash
npm install --save-dev @cloudflare/workers-types
```

### KV пространства
1. Създайте `ORDERS` и `PAGE_CONTENT` с:
   ```bash
   wrangler kv:namespace create ORDERS
   wrangler kv:namespace create PAGE_CONTENT
   ```
   (или през Dashboard > Workers > KV)
2. Добавете binding към worker-а в `wrangler.toml` или чрез Dashboard:
   ```toml
   [[kv_namespaces]]
   binding = "ORDERS"
   id = "<id>"
   preview_id = "<id>"

   [[kv_namespaces]]
   binding = "PAGE_CONTENT"
   id = "<id>"
   preview_id = "<id>"
   ```
   Без локалните `globals.d.ts` и пакета `@cloudflare/workers-types` Dashboard често
   отчита типови грешки.

### Деплой на `cf-worker.js`
1. Инсталирайте `wrangler`.
2. Попълнете идентификаторите в `wrangler.toml`.
3. Публикувайте с:
   ```bash
   wrangler deploy
   ```
4. След преминаване към `cf-worker.js` можете да премахнете или архивирате `worker.js`.

## Стари демо страници
В папка `src/` ще намерите по-ранни примери за клиентска и администраторска страница със смяна на тема и локално задаване на цена. Могат да се използват за справка или да бъдат премахнати при нужда.

## Принос
Изпращайте промени чрез Pull Request. Лицензът е MIT.
