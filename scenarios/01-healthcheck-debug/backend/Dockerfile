FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# src монтируется из хоста (docker-compose); nodemon (polling) перезапускает бэкенд на любой правке.
CMD ["npm", "run", "dev"]
