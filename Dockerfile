FROM node:20-alpine

ENV PORT=8080
ENV NODE_ENV=production

WORKDIR /app

COPY backend/package*.json ./backend/
COPY backend/.env.example ./backend/
COPY public/ ./public/

WORKDIR /app/backend
RUN npm install

EXPOSE 8080

CMD ["npm", "start"]
