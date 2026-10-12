# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions for npm workspace
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./frontend/

# Build production bundle
WORKDIR /app/frontend
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
