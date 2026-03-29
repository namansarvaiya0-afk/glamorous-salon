FROM node:20-alpine

ENV PORT=8080

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./backend/
COPY public/ ./public/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

WORKDIR /app/backend
CMD ["npm", "start"]
