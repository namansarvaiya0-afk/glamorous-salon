FROM node:20-alpine

ENV PORT=8080

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./backend/
COPY public/ ./public/

EXPOSE 8080

WORKDIR /app/backend
CMD ["npm", "start"]
