# Плейбук ведущего

Как сломать каждую проверку перед стендапом, как починить и как проверить.
Все правки применяются на лету — без пересборки и docker-команд:

- правка в `backend/src/*` применяется за пару секунд (`tsx watch`);
- правка в `.env` применяется за пару секунд (конфиг перечитывается на лету).

Проверка — на дашборде (http://localhost:8080) или командой
`curl -s http://localhost:8080/api/checks`.

## Подготовка

```bash
cp .env.example .env
docker-compose up --build   # убедиться, что все 10 проверок зеленые
```

Затем примените нужные поломки из списка ниже (можно все, можно часть).

Формат: **Симптом -> Сломать -> Починить -> Проверить**.

---

### 1. `db_connection` — `.env`

- **Симптом:** нет коннекта к БД.
- **Сломать:** `POSTGRES_HOST=postgres` -> `POSTGRES_HOST=localhost`.
- **Починить:** вернуть `POSTGRES_HOST=postgres`.
- **Проверить:** `curl -s http://localhost:8080/api/checks/db` -> `green`.
- **Суть:** внутри docker-сети сервисы ходят по имени контейнера, а не по localhost.

### 2. `redis_ping` — `.env`

- **Симптом:** Redis не отвечает (ошибка авторизации).
- **Сломать:** `REDIS_PASSWORD=secret` -> `REDIS_PASSWORD=` (пусто).
- **Починить:** вернуть `REDIS_PASSWORD=secret`.
- **Проверить:** `docker-compose exec redis redis-cli -a secret ping` -> `PONG`.
- **Суть:** сервер поднят с паролем — клиент обязан его передавать.

### 3. `vendor_api_headers` — `backend/src/checks.controller.ts` (метод `vendorFormat`)

- **Симптом:** ответ вендора не разобрать как JSON (`Unexpected token`).
- **Сломать:** убрать заголовок `Accept: application/json` из запроса:
  `httpGet(\`${vendorApiUrl}/data\`, { Accept: 'application/json' })` ->
  `httpGet(\`${vendorApiUrl}/data\`)`.
- **Починить:** вернуть заголовок `Accept: application/json`.
- **Проверить:** `curl -i -H 'Accept: application/json' http://localhost:8080/vendor/api/v2/data` -> JSON.
- **Суть:** без заголовка `Accept` вендор отдает текст, а мы парсим его как JSON.

### 4. `vendor_auth_scheme` — `backend/src/checks.controller.ts` (метод `vendorAuth`)

- **Симптом:** вендор отвечает 401.
- **Сломать:** убрать префикс `Bearer`:
  `Authorization: \`Bearer ${token}\`` -> `Authorization: token`.
- **Починить:** вернуть `Authorization: \`Bearer ${token}\``.
- **Проверить:** `curl -i -H 'Authorization: Bearer <VENDOR_API_TOKEN>' http://localhost:8080/vendor/api/v2/profile` -> 200;
  без `Bearer` эндпоинт отдает `invalid token format: expected 'Authorization: Bearer <token>'`.
- **Суть:** вендор принимает токен только в схеме `Bearer`.

### 5. `api_routing` — `backend/src/checks.controller.ts` (метод `vendorStatus`)

- **Симптом:** вендор отвечает 404.
- **Сломать:** захардкодить в чеке ссылку со старой версией вместо `\`${vendorApiUrl}/status\``:
  `const url = \`${vendorApiUrl}/status\`;` ->
  `const url = 'http://127.0.0.1:3000/vendor/api/v1/status';`.
- **Починить:** вернуть `const url = \`${vendorApiUrl}/status\`;`.
- **Проверить:** `curl -i http://localhost:8080/vendor/api/v2/status` -> 200;
  `.../v1/status` -> 404.
- **Суть:** актуальная версия пути вендора (`v2`) зашита в `VENDOR_API_URL`, и все
  вызовы вендора идут через него. Захардкоженная ссылка обходит конфиг и бьет в
  несуществующий `v1` — классический баг «прибили URL гвоздями мимо настроек».

### 6. `response_format` — `backend/src/checks.controller.ts` (метод `report`)

- **Симптом:** сервис отчетов вернул 404 / неожиданный ответ.
- **Сломать:** внести опечатку в путь — например, регистр символов:
  `httpGet(\`${apiUrl}/report\`)` -> `httpGet(\`${apiUrl}/Report\`)`
  (или пропустить букву: `/repot`).
- **Починить:** вернуть корректный путь `/api/report`.
- **Проверить:** `curl -i http://localhost:8080/api/report` -> 200 и JSON
  `{ "status": "ok" }`; `curl -i http://localhost:8080/api/Report` -> 404.
- **Суть:** в `main.ts` включен case sensitive routing — `/api/report` и
  `/api/Report` это разные маршруты. Опечатка в пути дает 404 вместо рабочего
  JSON. Обычная ошибка при ручном наборе URL.

### 7. `cors_headers` — `backend/src/main.ts`

- **Симптом:** в ответе нет `Access-Control-Allow-Origin`.
- **Сломать:** закомментировать включение CORS:
  ```ts
  // TODO: раскомментировать перед запуском
  // app.enableCors();
  ```
- **Починить:** вернуть `app.enableCors();`.
- **Проверить:** `curl -i -H 'Origin: http://localhost:8080' http://localhost:8080/api/cors-check` —
  в ответе есть `Access-Control-Allow-Origin`.
- **Суть:** сервер не отдает CORS-заголовки фронтенду.

### 8. `tcp_connect` — `backend/src/checks.controller.ts` (метод `tcpConnect`)

- **Симптом:** попытка TCP-соединения падает с `TypeError` — порт пришел строкой.
- **Сломать:** убрать приведение порта к числу:
  `const port = Number(env('PORT'));` -> `const port = env('PORT');`.
  (Альтернатива через `.env`: задать нечисловой `PORT`, например `PORT=web`.)
- **Починить:** вернуть `Number(...)` и числовой `PORT` в `.env`.
- **Проверить:** `curl -s http://localhost:8080/api/checks/tcp-connect` -> `green`;
  при поломке карточка краснеет с текстом
  `port configuration has the wrong type: expected number, received string`, а в
  логах backend виден `TypeError` со стек-трейсом.
- **Суть:** значение `PORT` из `.env` — строка. Проверка приводит его к числу и
  делает TCP-подключение к собственному порту приложения (`127.0.0.1:PORT`).
  `probeTcpPort` (`internal/lib/net.ts`) строго ждет `number` и падает с понятным
  `TypeError`, если приведение забыли. Никаких внешних зависимостей — только
  разбор конфигурации и проверка типа порта.

### 9. `mongo_connection` — `.env` (метод `mongo`)

- **Симптом:** нет коннекта к MongoDB (ошибка авторизации или недоступный хост).
- **Сломать (креды):** `MONGO_PASSWORD=secret` -> `MONGO_PASSWORD=` (пусто) или неверное значение.
- **Сломать (хост):** `MONGO_HOST=mongo` -> `MONGO_HOST=localhost`.
- **Починить:** вернуть `MONGO_PASSWORD=secret` и `MONGO_HOST=mongo`.
- **Проверить:** `curl -s http://localhost:8080/api/checks/mongo` -> `green`;
  прямая проверка:
  `docker-compose exec mongo mongosh -u app -p secret --authenticationDatabase admin --eval 'db.runCommand({ ping: 1 })'` -> `{ ok: 1 }`.
- **Суть:** MongoDB поднята с root-пользователем (`MONGO_INITDB_ROOT_*`),
  авторизация идет по базе `admin` (`authSource=admin`). При неверных кредах драйвер
  отдает `Authentication failed`, при неверном хосте — ошибку выбора сервера
  (внутри docker-сети сервисы ходят по имени контейнера, а не по localhost).

### 10. `type_mismatch` — `backend/src/checks.controller.ts` (метод `vendorAmount`)

- **Симптом:** баланс вендора не число (приходит строкой).
- **Сломать:** убрать приведение к числу:
  `const amount = Number(data.balance);` -> `const amount = data.balance;`.
- **Починить:** вернуть `Number(data.balance)`.
- **Проверить:** `curl -s http://localhost:8080/vendor/api/v2/balance` -> `{"balance":"1000"}`
  (строка); после фикса карточка `type_mismatch` зеленая.
- **Суть:** вендор всегда отдает `balance` строкой, а приложение считает его
  числом — строку нужно привести через `Number()`.

---

## Рекомендованный порядок (~25 минут)

1. Разминка (ошибка видна в тексте карточки): №1, №4, №3.
2. Сложнее: №5, №6, №7, №8, №10.
3. Зависимости через `.env`: №2 (Redis) и №9 (MongoDB) — коннект по имени
   контейнера и учетным данным.
