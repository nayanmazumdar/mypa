# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production backend
FROM node:20-alpine AS production
WORKDIR /app

# Copy backend
COPY shopkeeper-backend/package*.json ./shopkeeper-backend/
RUN cd shopkeeper-backend && npm ci --omit=dev

COPY shopkeeper-backend/ ./shopkeeper-backend/

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create uploads directory
RUN mkdir -p shopkeeper-backend/uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "shopkeeper-backend/src/server.js"]
