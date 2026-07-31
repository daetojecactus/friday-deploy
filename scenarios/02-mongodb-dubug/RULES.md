# Правила урока

## Цель

Довести продакшен CRM до рабочего состояния: все семь плашек в Production Status
зеленые, в чате `#incidents` — финальное сообщение от тимлида.
Страница — http://localhost:8080

Автоматических проверок нет и быть не может: индикатор зеленеет, когда робот
успешно выполняет реальную бизнес-операцию.

## Как работаем

1. Работаем по очереди.
2. Решения принимает Капитан.
3. **Правим только базу.** Файлы репозитория — эталон: бэкенд, фронтенд, `.env`,
   `docker-compose.yml` не трогаем. Все семь проблем лежат внутри MongoDB.
4. Инструменты: `mongosh` (или GUI-клиент), браузер + DevTools,
   `docker compose logs`, документация MongoDB.
5. Папку `backend/src/internal/` не открываем — там установщик стенда и список
   поломок открытым текстом.
6. Кнопка «Пересобрать стенд» на вкладке «Система» (она же
   `POST /api/stand/reset`) возвращает стенд в исходное сломанное состояние.
   Стирает и данные, и починки — жмем только по решению команды. Поэтому она и
   спрятана за подтверждением словом.

## Пересборка

Не нужна. Починки — это операции над базой, приложение читает базу как есть.
Индикаторы обновляются на следующем цикле проверки (5 секунд); индикатор
«Сессии» — до 70 секунд, он ждет TTL-монитор MongoDB.

`docker compose down` данные сохраняет (именованный том `mongo_data`), полный
снос — `docker compose down -v`.

## Доступ к базе

```bash
# снаружи (порт 27017 проброшен на все интерфейсы машины)
mongosh "mongodb://engineer:engineer_secret@localhost:27017/crm"

# через контейнер
docker compose exec mongo mongosh -u engineer -p engineer_secret \
        --authenticationDatabase crm crm
```

Готовые строки — на вкладке «Система» и в `GET /api/stand/connection`. Адрес в
них тот, по которому открыта страница, поэтому строку можно скопировать и отдать
коллеге в той же сети.

Права `engineer`: `readWrite` (документы, `createIndex`, `dropIndex`) плюс
`dbAdmin` (`collMod` для валидаторов и опций TTL-индекса, статистика).

Приложение ходит под другим пользователем — `crm_app`, только `readWrite`.
Чинить базу оно не умеет и не должно.

## Диагностические команды

### База — главный инструмент

```js
// что вообще есть
db.getCollectionNames()
db.customers.findOne()                       // поля и, главное, ТИПЫ значений

// индексы: какие есть, с какими опциями, сколько весят
db.sessions.getIndexes()                     // в том числе expireAfterSeconds у TTL
db.orders.getIndexes()                       // в том числе partialFilterExpression
db.messages.aggregate([{ $collStats: { storageStats: {} } }])[0].storageStats.indexSizes

// правила коллекции
db.getCollectionInfos({ name: "incidents" })[0].options.validator
db.getCollectionInfos({ name: "tickets" })[0].options.validator

// сверка «что показывает экран» с «что лежит в базе»
db.orders.countDocuments({ status: { $in: ["Open", "Pending"] } })
db.customers.countDocuments({ age: { $type: "string" } })
db.orders.find({ status: "Open" }).sort({ createdAt: -1 }).explain("executionStats")

// операции починки
db.<coll>.dropIndex("<имя>")
db.<coll>.createIndex({ ... }, { name: "<имя>", ... })
db.runCommand({ collMod: "<coll>", index: { name: "<имя>", expireAfterSeconds: N } })
db.runCommand({ collMod: "<coll>", validator: { $jsonSchema: { ... } } })
db.<coll>.updateMany({ ... }, [{ $set: { ... } }])
```

### Приложение

```bash
curl -s http://localhost:8080/api/stand/status        # то же, что правая панель
curl -s http://localhost:8080/api/stand/connection   # строка подключения к базе
curl -s http://localhost:8080/api/customers
curl -s http://localhost:8080/api/customers/<id>
curl -s http://localhost:8080/api/orders
curl -s http://localhost:8080/api/incidents
curl -s http://localhost:8080/api/storage/report

curl -s -X POST http://localhost:8080/api/customers -H 'Content-Type: application/json' \
     -d '{"firstName":"Винсент","lastName":"Бэггинс","email":"t1@example.com"}'
curl -s -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' \
     -d '{"customerId":"<id>"}'
curl -s 'http://localhost:8080/api/auth/me?token=<token>'
curl -s -X POST http://localhost:8080/api/tickets -H 'Content-Type: application/json' \
     -d '{"subject":"Не приходит счет","body":"Клиент ждет документы"}'
curl -s -X POST http://localhost:8080/api/incidents/<id>/status \
     -H 'Content-Type: application/json' -d '{"status":"Active"}'

docker compose logs --tail=50 backend
docker compose ps
```

## Ориентиры

- Ответ API показывает **настоящую** ошибку MongoDB. Читайте ее целиком: код,
  `codeName`, текст и блок `errInfo` — в нем для ошибок валидации написано, какое
  правило схемы не прошло.
- Одинаковый заголовок ошибки не означает одинаковую причину. Две разные проблемы
  могут одинаково называться `Document failed validation`.
- **Отсутствие ошибки — тоже симптом.** Пустой список при живых данных значит,
  что запрос идет не туда, куда вы думаете. Ловится сверкой с `countDocuments` и
  `explain()`.
- Смотрите на объекты базы, а не только на документы: индексы, их опции и
  валидаторы коллекций — там живут пять проблем из семи.
- Жалоба в чате — это контракт: «сессия у нас живет час», «поле необязательное».
  Если поведение базы противоречит контракту, чинить нужно базу.
- Полный контекст стенда — в [CONTEXT.md](CONTEXT.md).
