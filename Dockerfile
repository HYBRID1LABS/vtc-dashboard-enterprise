# VTC Dashboard Enterprise - Production Build
FROM node:18-alpine

WORKDIR /app

# Instalar SQLite
RUN apk add --no-cache sqlite

# Copiar e instalar backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Copiar todo el código
WORKDIR /app
COPY backend/ ./backend/
COPY database/ ./database/
COPY init-db.js .

# Inicializar base de datos
RUN node init-db.js && \
    sqlite3 backend/vtc.db < database/schema.sql

EXPOSE 3000

# Iniciar backend
WORKDIR /app/backend
CMD ["node", "server.js"]
