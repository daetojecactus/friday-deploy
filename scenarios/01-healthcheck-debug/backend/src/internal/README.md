# internal/ — служебный код стенда

Участникам сюда заглядывать не нужно. Здесь имитация внешних систем и служебная
обвязка, а не то, что чинят на уроке. Структура:

```
internal/
├─ index.ts                     # публичная точка входа для checks.controller
├─ controllers/                 # имитации внешних систем + агрегатор дашборда
│  ├─ index.ts                  #   баррель со всеми тремя контроллерами
│  ├─ dashboard.controller.ts   #   агрегатор /api/checks (все 10 проверок разом)
│  ├─ vendor.controller.ts      #   внешний вендор на /vendor/api/v2/*
│  └─ externals.controller.ts   #   сервис отчетов, CORS-эндпоинт, лимитер
├─ checks/                      # строительные блоки результата проверки
│  ├─ results.ts                #   тип CheckResult, CHECK_NAMES, create*Result
│  └─ messages.ts               #   тексты всех сообщений (MESSAGES)
└─ lib/                         # низкоуровневая обвязка
   ├─ env.ts                    #   чтение .env на лету
   ├─ http.ts                   #   GET с таймаутом
   └─ net.ts                    #   TCP-проба порта (строгая типизация)
```

`checks.controller.ts` собирает 10 проверок только из `./internal` (барреля),
не заглядывая во внутреннее устройство. Внешний вендор живет на своем базовом
пути `/vendor/api/v2` (вне общего префикса `/api`) — проверки ходят к нему по
`VENDOR_API_URL` + метод.

Все баги чинятся на **вашей** стороне: в `.env` и в
`backend/src/checks.controller.ts`.
