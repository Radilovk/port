# BIOCODE - Онлайн Магазин за пептиди

"BIOCODE" е примерен магазин, който визуализира продукти от `page_content.json` (запазен в KV под ключ `page_content`) и съхранява поръчките локално или в Cloudflare KV. Основните HTML страници се намират в корена на проекта.

## Стартиране на локален сървър
1. Инсталирайте зависимостите:
   ```bash
   npm install
   ```
2. Стартирайте `local-worker.js` (API):
   ```bash
   node local-worker.js
   ```
   Това стартира API-то на порт **3000**, което обслужва маршрути `/orders` и `/page_content.json`.
3. Обслужвайте статичните файлове, например с:
   ```bash
   npx serve .
   ```
   След стартиране на двата сървъра отваряйте **admin.html** през HTTP, напр. `http://localhost:3000/admin.html`, за да се запазват коректно промените.


За Cloudflare Worker версия може да използвате:
```bash
wrangler dev
```
или
```bash
npm start
```

## Страници
- **index.html** – основната витрина. Данните за продукти и навигация се взимат от ключа `page_content` в KV чрез `/page_content.json`.
- **checkout.html** – страница за завършване на поръчката. Изпраща кошницата към `/orders`.
- **admin.html** – администраторски панел за редакция на съдържанието и преглед на поръчки. Отваряйте го през HTTP (напр. `http://localhost:3000/admin.html`).
- **page_content.json** представлява JSON съдържание, записвано в KV под ключ `page_content`.
- **orders.json** пази направените поръчки при локално стартиране.
## Cloudflare Workers
Cloudflare Workers е безсървърна среда и се различава от Node изпълнението на `local-worker.js`.
Вместо Express и локална файлова система се използват `fetch` събития и KV хранилища.

Файлът `wrangler.toml` е част от проекта и се следи от Git. В него са зададени имената на KV пространствата и други настройки за Worker-а. Ако използвате собствен акаунт, редактирайте този файл, вместо да създавате нов.

### Локално тестване
- Стартирайте `local-worker.js` с:
  ```bash
  node local-worker.js
  ```
  Това осигурява локално API на порт **3000**.

### Копиране в Cloudflare Dashboard
1. Влезте в **Dashboard** и изберете **Workers**.
2. Създайте нов Worker и копирайте съдържанието на `worker.js` в онлайн редактора. Скриптът импортира `handler.js` и имате две опции:
- в редактора на Cloudflare да създадете втори модул `handler.js`;
- или да обедините двата файла чрез bundler (`wrangler build`/`wrangler deploy`).
3. Запишете и тествайте функцията.

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

### Деплой на `worker.js`
1. Инсталирайте `wrangler`.
2. Попълнете идентификаторите в `wrangler.toml`.
3. Публикувайте с:
   ```bash
   wrangler deploy
   ```
4. След преминаване към `worker.js` можете да премахнете или архивирате `local-worker.js`.

## Стари демо страници
В папка `src/` ще намерите по-ранни примери за клиентска и администраторска страница със смяна на тема и локално задаване на цена. Могат да се използват за справка или да бъдат премахнати при нужда.

## Принос
Изпращайте промени чрез Pull Request. Лицензът е MIT.
