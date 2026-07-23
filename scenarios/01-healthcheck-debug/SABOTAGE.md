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

Формат: **Симптом → Сломать → Починить → Проверить**.

---

### 1. `db_connection` — `.env`

- **Симптом:** нет коннекта к БД.
- **Сломать:** `POSTGRES_HOST=postgres` → `POSTGRES_HOST=localhost`.
- **Починить:** вернуть `POSTGRES_HOST=postgres`.
- **Проверить:** `curl -s http://localhost:8080/api/checks/db` → `green`.
- **Суть:** внутри docker-сети сервисы ходят по имени контейнера, а не по localhost.

### 2. `redis_ping` — `.env`

- **Симптом:** Redis не отвечает (ошибка авторизации).
- **Сломать:** `REDIS_PASSWORD=secret` → `REDIS_PASSWORD=` (пусто).
- **Починить:** вернуть `REDIS_PASSWORD=secret`.
- **Проверить:** `docker-compose exec redis redis-cli -a secret ping` → `PONG`.
- **Суть:** сервер поднят с паролем — клиент обязан его передавать.
- ⚠️ Пока №2 красный, №9 остается зеленым — это заготовка домино (см. №9).

### 3. `vendor_api_headers` — `backend/src/checks.controller.ts` (метод `vendorFormat`)

- **Симптом:** ответ вендора не разобрать как JSON (`Unexpected token`).
- **Сломать:** убрать заголовок `Accept: application/json` из запроса:
  `httpGet(vendorUrl('/data'), { Accept: 'application/json' })` →
  `httpGet(vendorUrl('/data'))`.
- **Починить:** вернуть заголовок `Accept: application/json`.
- **Проверить:** `curl -i -H 'Accept: application/json' http://localhost:8080/vendor/api/v2/data` → JSON.
- **Суть:** без заголовка `Accept` вендор отдает текст, а мы парсим его как JSON.

### 4. `vendor_auth_scheme` — `backend/src/checks.controller.ts` (метод `vendorAuth`)

- **Симптом:** вендор отвечает 401.
- **Сломать:** убрать префикс `Bearer`:
  `Authorization: \`Bearer ${token}\`` → `Authorization: token`.
- **Починить:** вернуть `Authorization: \`Bearer ${token}\``.
- **Проверить:** `curl -i -H 'Authorization: Bearer <VENDOR_API_TOKEN>' http://localhost:8080/vendor/api/v2/profile` → 200;
  без `Bearer` эндпоинт отдает `invalid token format: expected 'Authorization: Bearer <token>'`.
- **Суть:** вендор принимает токен только в схеме `Bearer`.

### 5. `api_routing` — `backend/src/checks.controller.ts` (метод `vendorStatus`)

- **Симптом:** вендор отвечает 404.
- **Сломать:** захардкодить в чеке ссылку со старой версией вместо `vendorUrl('/status')`:
  `const url = vendorUrl('/status');` →
  `const url = 'http://127.0.0.1:3000/vendor/api/v1/status';`.
- **Починить:** вернуть `const url = vendorUrl('/status');`.
- **Проверить:** `curl -i http://localhost:8080/vendor/api/v2/status` → 200;
  `.../v1/status` → 404.
- **Суть:** актуальная версия пути вендора (`v2`) зашита в `VENDOR_API_URL`, и все
  вызовы вендора идут через него. Захардкоженная ссылка обходит конфиг и бьет в
  несуществующий `v1` — классический баг «прибили URL гвоздями мимо настроек».

### 6. `response_format` — `backend/src/checks.controller.ts` (метод `report`)

- **Симптом:** сервис отчетов вернул 404 / неожиданный ответ.
- **Сломать:** внести опечатку в путь — например, регистр символов:
  `httpGet(\`${HOST_URL}/api/report\`)` → `httpGet(\`${HOST_URL}/api/Report\`)`
  (или пропустить букву: `/api/repot`).
- **Починить:** вернуть корректный путь `/api/report`.
- **Проверить:** `curl -i http://localhost:8080/api/report` → 200 и JSON
  `{ "status": "ok" }`; `curl -i http://localhost:8080/api/Report` → 404.
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

### 8. `config_parsing` — `backend/src/checks.controller.ts` (метод `probePort`)

- **Симптом:** сокет-проба падает с `TypeError` — порт пришел строкой.
- **Сломать:** убрать приведение порта к числу:
  `const port = Number(env('REDIS_PORT') ?? 6379);` →
  `const port = env('REDIS_PORT') ?? 6379;`.
- **Починить:** вернуть `Number(...)`.
- **Проверить:** `curl -s http://localhost:8080/api/checks/probe-port` → `green`;
  в логах бэкенда при поломке виден `TypeError` со стек-трейсом.
- **Суть:** значение порта из `.env` — строка. `probeTcpPort` (в
  `internal/lib/net.ts`) строго ждет `number` и падает с понятным `TypeError`,
  если приведение забыли. Нужен `Number()`.

### 9. `rate_limiter` — `.env` (домино с №2)

- **Симптом:** пока Redis сломан (№2) — зеленый; чинят Redis — краснеет.
- **Сломать:** `REDIS_RATE_LIMIT_MAX=100` → `REDIS_RATE_LIMIT_MAX=1`.
- **Починить:** вернуть `REDIS_RATE_LIMIT_MAX=100`.
- **Проверить:** после починки Redis карточка `rate_limiter` через несколько
  секунд краснеет; после подъема лимита — зеленеет.
- **Суть (домино):** при сломанном Redis лимитер «падает открытым» и все
  пропускает. Команда чинит Redis (№2) — и оживает лимитер с заниженным лимитом,
  который рубит частые запросы №9. Лечится поднятием `REDIS_RATE_LIMIT_MAX`.

### 10. `type_mismatch` — `backend/src/checks.controller.ts` (метод `vendorAmount`)

- **Симптом:** баланс вендора не число (приходит строкой).
- **Сломать:** убрать приведение к числу:
  `const amount = Number(data.balance);` → `const amount = data.balance;`.
- **Починить:** вернуть `Number(data.balance)`.
- **Проверить:** `curl -s http://localhost:8080/vendor/api/v2/balance` → `{"balance":"1000"}`
  (строка); после фикса карточка `type_mismatch` зеленая.
- **Суть:** вендор всегда отдает `balance` строкой, а приложение считает его
  числом — строку нужно привести через `Number()`.

---

## Рекомендованный порядок (~25 минут)

1. Разминка (ошибка видна в тексте карточки): №1, №4, №3.
2. Сложнее: №5, №6, №7, №8, №10.
3. Redis: №2 — и сразу после починки ловят домино №9.
