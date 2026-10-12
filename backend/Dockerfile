# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions for npm workspace
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend/ ./backend/

# Compile TypeScript
WORKDIR /app/backend
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for container health check
RUN apk add --no-cache curl

# Copy dependencies and build artifacts
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci --omit=dev --workspace=backend

COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/src/db ./backend/src/db

WORKDIR /app/backend

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "dist/src/index.js"]
