# Build stage
FROM node:20-alpine AS builder
WORKDIR /repo

# Copy shared package and build it
COPY shared/package*.json ./shared/
RUN cd shared && npm ci
COPY shared/ ./shared/
RUN cd shared && npm run build

# Install backend deps
COPY backend_nest/package*.json ./backend_nest/
RUN cd backend_nest && npm ci

# Copy backend source and build
COPY backend_nest/ ./backend_nest/
RUN cd backend_nest && npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /repo/shared ./shared
COPY --from=builder /repo/backend_nest/dist ./dist
COPY --from=builder /repo/backend_nest/node_modules ./node_modules
COPY --from=builder /repo/backend_nest/package.json ./

EXPOSE 3000
CMD ["node", "dist/main"]
