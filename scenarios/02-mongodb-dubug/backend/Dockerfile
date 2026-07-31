# Контекст сборки — корень сценария (см. docker-compose.yml): в одном образе
# едут и собранный фронтенд, и бэкенд, который его отдает. Отдельного
# веб-сервера у стенда нет.

# --- фронтенд: React + antd, собирается Vite ---------------------------------
FROM node:20-alpine AS web
WORKDIR /web
# Локфайл едет в образ, если он есть: версии antd и vite фиксируются, и сборка
# у ведущего и у команды одинаковая.
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- бэкенд ------------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ .
# Собранная страница: platform.ts отдает ее как статику из /app/public.
COPY --from=web /web/dist /app/public
#src монтируется из хоста
#nodemon смотрит бэкенд
CMD ["npm", "run", "dev"]
