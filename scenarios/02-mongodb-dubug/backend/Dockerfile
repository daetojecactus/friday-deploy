FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
#src монтируется из хоста 
#nodemon смотрит бэкенд
CMD ["npm", "run", "dev"]
