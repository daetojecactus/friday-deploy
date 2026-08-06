# Один образ на все три роли стенда, роль выбирается через APP_ROLE.
# Контекст сборки — корень сценария (см. docker-compose.yml).

# Дашборд собирается отдельным бандлом в отдельный каталог: попади он в сборку
# лендинга, команда нашла бы список ответов прямо в Sources.
FROM node:20-alpine AS host-web
WORKDIR /web
COPY frontend/host/package.json frontend/host/package-lock.json* ./
RUN npm install
COPY frontend/host/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ .
# Исходники лендинга: бандлы собираются esbuild'ом при старте процесса.
COPY frontend/site /app/site
COPY --from=host-web /web/dist /app/public-host
CMD ["npm", "run", "dev"]
