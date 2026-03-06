# VTC Dashboard Enterprise - Multi-stage build
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .

FROM node:18-alpine AS backend-runtime
WORKDIR /app
COPY --from=backend-builder /app/backend /app
EXPOSE 3000
CMD ["node", "server.js"]
