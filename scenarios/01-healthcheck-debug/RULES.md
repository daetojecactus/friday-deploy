# Правила урока

## Цель

Сделать все 10 индикаторов на дашборде зелеными. Дашборд — http://localhost:8080

## Как работаем

1. Работаем по очереди.
2. Решения принимает Капитан.
3. Правим два места:
   - файлы в `backend/src/` (в основном `checks.controller.ts`, изредка `main.ts`);
   - `.env`.
4. Папку `backend/src/internal/` не трогаем — там имитация внешних систем.
5. Инфраструктуру (`docker-compose.yml`, `Dockerfile`, `package.json`) правим
   только с согласия команды.

## Пересборка

Пересборка контейнеров во время урока не нужна:

- правки в `backend/src/` применяются сами за пару секунд (`tsx watch`);
- правки в `.env` применяются сами за пару секунд.

Пересборка (`docker-compose up --build`) нужна только при изменении
инфраструктуры (п. 5).

## Диагностические команды

```bash
# Все проверки разом (то же, что показывает дашборд)
curl -s http://localhost:8080/api/checks

# Конкретная проверка
curl -s http://localhost:8080/api/checks/db
curl -s http://localhost:8080/api/checks/vendor-auth

# Имитации внешних систем
curl -i http://localhost:8080/api/report
curl -i http://localhost:8080/api/cors-check -H 'Origin: http://localhost:8080'

# Внешний вендор — на своем базовом пути /vendor/api/v2 (= VENDOR_API_URL)
curl -i http://localhost:8080/vendor/api/v2/status
curl -i -H 'Accept: application/json' http://localhost:8080/vendor/api/v2/data
curl -i -H 'Authorization: Bearer <VENDOR_API_TOKEN из .env>' \
        http://localhost:8080/vendor/api/v2/profile
curl -i http://localhost:8080/vendor/api/v2/balance

# Пинг зависимостей
docker-compose exec redis redis-cli -a <REDIS_PASSWORD> ping    # ждем PONG
docker-compose exec postgres pg_isready -U app                  # ждем accepting connections
docker-compose exec mongo mongosh -u <MONGO_USER> -p <MONGO_PASSWORD> \
        --authenticationDatabase admin --eval 'db.runCommand({ ping: 1 })'  # ждем ok: 1

# Логи и статус
docker-compose logs --tail=50 backend
docker-compose ps
```

## Ориентиры

- Красная карточка показывает текст ошибки — читайте его.
- Часть проверок чинится в `.env`, часть — в `backend/src/checks.controller.ts`.
- Проверки независимы — каждую можно чинить в любом порядке.
- Полный контекст стенда (архитектура, назначение каждой проверки) — в
  [CONTEXT.md](CONTEXT.md).
