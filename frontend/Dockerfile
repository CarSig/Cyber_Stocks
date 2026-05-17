# Build stage
FROM node:20-alpine AS builder
WORKDIR /repo

# Copy shared package and build it
COPY shared/package*.json ./shared/
RUN cd shared && npm ci
COPY shared/ ./shared/
RUN cd shared && npm run build

# Install frontend deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Runtime stage
FROM nginx:alpine
COPY --from=builder /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
