FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./backend/
COPY public/ ./public/

EXPOSE 10000

WORKDIR /app/backend
CMD ["npm", "start"]
