# CONTEXT — Healthcheck Debug

Единый контекст стенда: архитектура, назначение проверок, цепочки зависимостей,
правила разработки и порядок запуска/отладки. Документ рассчитан и на человека,
и на ИИ-ассистента, который помогает с этим проектом.

---

## 1. Цель приложения

Это командный тренажер по траблшутингу для тех-стендапа. На дашборде — 10
healthcheck'ов, каждый горит зеленым (норма) или красным (сбой) с текстом ошибки.

- Ведущий заранее «ломает» часть проверок (см. [SABOTAGE.md](SABOTAGE.md)).
- Команда по очереди диагностирует и чинит их на живом стенде.
- Задача — вернуть все 10 индикаторов в зеленое состояние.

Ошибки намеренно реалистичны и не дают готовых решений: текст карточки называет
класс проблемы (тип данных, разбор ответа, сетевой доступ, маршрут, заголовок),
но не диктует конкретную правку. Причину участник восстанавливает сам — по
симптому, логам и данным.

---

## 2. Архитектура стенда

Четыре контейнера Docker Compose (см. [docker-compose.yml](docker-compose.yml)):

| Сервис     | Роль                                                             |
| ---------- | ---------------------------------------------------------------- |
| `backend`  | NestJS (TypeScript, `tsx watch`). Отдает дашборд, API и проверки. |
| `postgres` | PostgreSQL 16 — реальная зависимость для проверки №1.            |
| `redis`    | Redis 7 (поднят с паролем) — зависимость для проверки №2.        |
| `mongo`    | MongoDB 7 (поднята с root-пользователем) — зависимость для проверки №9. |

Внешний доступ — только `http://localhost:8080` (порт `8080:3000` у backend).
PostgreSQL, Redis и MongoDB наружу не публикуются — они живут внутри docker-сети.

### Что делает backend

1. **Отдает статику дашборда** (`frontend/index.html`) — одна страница на чистом
   JS, которая раз в 3 секунды опрашивает `/api/checks`.
2. **Держит 10 проверок** (`checks.controller.ts`) под префиксом
   `/api/checks/*`. Это и есть то, что чинят участники.
3. **Имитирует внешние системы** (`internal/controllers/`): «внешнего вендора» на
   своем базовом пути `/vendor/api/v2/*` и прочие сервисы (отчеты, CORS-эндпоинт)
   под `/api/*`. Эти сервисы ведут себя предсказуемо и **не чинятся**.

### Поток запроса

```
frontend (poll /api/checks)
      -> DashboardController (агрегатор)
            -> 10 x ChecksController  (/api/checks/<slug>)
                  -> реальные зависимости (postgres, redis, mongo)
                  -> имитации внешних систем (vendor, report, cors)
```

### Конфигурация читается на лету

`internal/lib/env.ts` перечитывает смонтированный `.env` при каждом обращении
`env('KEY')`. Поэтому правки в `.env` применяются за пару секунд без пересборки.
Правки в `backend/src/` подхватывает `tsx watch` (nodemon, polling) — тоже без
пересборки.

### Карта каталога

```
scenarios/01-healthcheck-debug/
├─ docker-compose.yml            # 4 сервиса: backend, postgres, redis, mongo
├─ .env / .env.example           # конфиг (эталон = все зеленые)
├─ frontend/index.html           # дашборд (vanilla JS, поллинг раз в 3с)
├─ backend/src/
│  ├─ main.ts                    # bootstrap, CORS, отдача статики
│  ├─ checks.controller.ts       # 10 проверок — ЧИНЯТ ЭТО
│  ├─ app.module.ts              # регистрация контроллеров
│  └─ internal/                  # служебный код — НЕ ЧИНЯТ
│     ├─ controllers/            # имитации внешних систем + агрегатор
│     ├─ checks/                 # CheckResult, CHECK_NAMES, MESSAGES
│     └─ lib/                    # env, http, net (TCP-проба)
├─ GUIDE.md / README.md / RULES.md / SABOTAGE.md / CONTEXT.md
```

---

## 3. Правила разработки

**Можно править (это «наша сторона»):**

- `.env` — конфигурация стенда.
- `backend/src/` — в основном `checks.controller.ts`, изредка `main.ts`.

**Нельзя править (это «чужие» системы и служебная обвязка):**

- `backend/src/internal/` — имитация внешних сервисов и низкоуровневая обвязка.
  Все баги, которые видны на дашборде, живут на нашей стороне, а не здесь.
- Инфраструктуру (`docker-compose.yml`, `Dockerfile`, `package.json`) — только с
  согласия команды.

**Пересборка** во время урока не нужна: `backend/src/` подхватывает `tsx watch`,
`.env` перечитывается на лету. `docker-compose up --build` требуется только при
изменении инфраструктуры.

---

## 4. Описание 10 проверок

| #   | Проверка (slug)               | Что делает                                                                                       | Где фикс |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| 1   | `postgres_connection` (`postgres`) | Коннект к PostgreSQL и `SELECT 1` по `POSTGRES_*` из `.env`.                                | `.env`   |
| 2   | `redis_ping` (`redis`)        | Коннект к Redis и `PING` (ждет `PONG`). Redis поднят с паролем.                                   | `.env`   |
| 3   | `vendor_api_headers` (`vendor-format`) | GET вендора `/data` с `Accept: application/json` и разбор JSON. Без заголовка вендор отдает текст. | `src`    |
| 4   | `vendor_auth_scheme` (`vendor-auth`)   | GET вендора `/profile` с `Authorization: Bearer <token>`. Вендор принимает только схему `Bearer`. | `src`    |
| 5   | `api_routing` (`vendor-routing`)       | GET вендора `${VENDOR_API_URL}/status` (база с версией `v2` из `.env`). Захардкоженный URL с `v1` дает 404. | `src` |
| 6   | `response_format` (`report`)  | GET своего `/api/report`, ждет `{ status: "ok" }`. Роутинг регистрозависимый — опечатка дает 404. | `src`    |
| 7   | `cors_headers` (`cors`)       | GET своего `/api/cors-check` с `Origin`, ждет `Access-Control-Allow-Origin` (включается в `main.ts`). | `src` |
| 8   | `tcp_connect` (`tcp-connect`) | Читает `PORT` из `.env`, приводит к числу и делает TCP-подключение к порту самого приложения (`127.0.0.1:PORT`). Без `Number()` порт остается строкой → `TypeError` (проверка типа порта). | `src` |
| 9   | `mongo_connection` (`mongo`)  | Коннект к MongoDB по `MONGO_*` из `.env` и `ping` базы `admin` (`authSource=admin`). Перепутанные логин/пароль → ошибка авторизации, неверный хост → нет соединения. | `.env` |
| 10  | `type_mismatch` (`vendor-amount`)      | GET вендора `/balance`; поле `balance` приходит строкой, приложение ждет число — нужен `Number()`. | `src`    |

Полный HTTP-путь проверки: `/api/checks/<slug>` (например,
`/api/checks/vendor-format`).

Чему учит каждый чек и чем похожие симптомы отличаются друг от друга (контент
против типа, заголовок запроса против ответа, версия против пути, сеть против
авторизации) — разобрано в [SABOTAGE.md](SABOTAGE.md#чему-учит-каждый-чек-шпаргалка-для-ведущего).

---

## 5. Зависимости проверок

Каждая проверка привязана к своей зависимости и **независима от остальных** —
чинить их можно в любом порядке, скрытых цепочек-домино между проверками нет:

- Внешние зависимости-контейнеры: PostgreSQL (№1), Redis (№2), MongoDB (№9).
- Имитации на нашей стороне: вендор (№3, №4, №5, №10), сервис отчетов (№6),
  CORS-эндпоинт (№7).
- Внутренняя конфигурация: разбор порта приложения (№8).

Каждая красная карточка указывает ровно на одну причину — по тексту ошибки видно,
в какой класс проблемы (сеть/доступ, разбор, тип, маршрут, заголовок) смотреть.

---

## 6. Запуск и отладка

### Запуск

```bash
cp .env.example .env
docker-compose up --build
```

Дашборд — `http://localhost:8080`. При эталонном `.env` все 10 проверок зеленые.

### Диагностика

```bash
# Все проверки разом (то же, что показывает дашборд)
curl -s http://localhost:8080/api/checks

# Конкретная проверка
curl -s http://localhost:8080/api/checks/postgres
curl -s http://localhost:8080/api/checks/mongo

# Имитации внешних систем (не чинятся)
curl -i http://localhost:8080/api/report
curl -i http://localhost:8080/api/cors-check -H 'Origin: http://localhost:8080'

# Внешний вендор — на своем базовом пути /vendor/api/v2 (= VENDOR_API_URL)
curl -i http://localhost:8080/vendor/api/v2/status
curl -i -H 'Accept: application/json' http://localhost:8080/vendor/api/v2/data
curl -i -H 'Authorization: Bearer <VENDOR_API_TOKEN>' \
        http://localhost:8080/vendor/api/v2/profile
curl -i http://localhost:8080/vendor/api/v2/balance

# Прямой пинг зависимостей
docker-compose exec redis redis-cli -a <REDIS_PASSWORD> ping    # ждем PONG
docker-compose exec postgres pg_isready -U app                  # accepting connections
docker-compose exec mongo mongosh -u <MONGO_USER> -p <MONGO_PASSWORD> \
        --authenticationDatabase admin --eval 'db.runCommand({ ping: 1 })'  # ждем ok: 1

# Логи и статус
docker-compose logs --tail=50 backend
docker-compose ps
```

### Как читать сбой

1. Открой красную карточку — текст ошибки называет класс проблемы.
2. Определи, где живет фикс (`.env` или `backend/src/`) по таблице из раздела 4.
3. Проверь гипотезу конкретной проверкой через `curl` и загляни в логи backend.
4. Правь `.env` или `checks.controller.ts` — изменения применяются на лету.
