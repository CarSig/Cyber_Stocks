# Plan: Production Deployment (VPS — Oracle Cloud Free / Hetzner)

## Context
App runs locally on Docker Desktop. Goal: deploy to a VPS (Oracle Cloud free ARM tier preferred, Hetzner €4.49/mo as fallback). Main DB is already on Neon. The `docker-compose.yml` exists but only covers infrastructure containers — need to add Dockerfiles for `backend_nest`, `content_analysis`, and the `newsWorker`, then update `docker-compose.yml` for production. A `Caddyfile` handles SSL + reverse proxy. Frontend is a static build deployed to Vercel (free).

---

## What Needs to Be Created/Changed

### 1. `backend_nest/Dockerfile` (new)
Multi-stage Node 22 Alpine build. Copies `src/`, `package*.json`, `nest-cli.json`, `tsconfig*.json`. Runs `npm ci && npm run build`. Final stage runs `node dist/main.js`. Must define a volume for `storage/` and `logs/`.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json nest-cli.json tsconfig*.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
```

**Note:** `backend_nest` writes to `storage/` (threat intel JSON files, Reddit posts) and `logs/`. These need a Docker volume so data survives container restarts.

### 2. `content_analysis/Dockerfile` (new)
Same pattern. Runs `node dist/server.js` on port 3001. Uses ESNext modules — needs `"type": "module"` check or `--experimental-vm-modules`. The `tsconfig.json` uses `moduleResolution: Bundler` + `module: ESNext` — verify the build produces valid CJS or ESM output.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json .
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### 3. `docker-compose.prod.yml` (new, alongside existing `docker-compose.yml`)
Extends the existing infra containers and adds the app services. Uses `env_file` to inject secrets. Adds named volumes for `backend_nest` runtime writes.

```yaml
services:
  backend:
    build: ./backend_nest
    restart: unless-stopped
    env_file: ./backend_nest/.env.production
    ports:
      - "3000:3000"
    volumes:
      - backend_storage:/app/storage
      - backend_logs:/app/logs
    depends_on:
      - rabbitmq
      - pgvector

  worker:
    build: ./backend_nest
    restart: unless-stopped
    command: ["node", "dist/workers/newsWorker.js"]
    env_file: ./backend_nest/.env.production
    depends_on:
      - rabbitmq
      - pgvector

  content_analysis:
    build: ./content_analysis
    restart: unless-stopped
    env_file: ./content_analysis/.env.production
    ports:
      - "3001:3001"
    depends_on:
      - pgvector

  pgvector:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: content_analysis
    volumes:
      - pgvector_data:/var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:3-management
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

  jaeger:
    image: jaegertracing/all-in-one:latest
    restart: unless-stopped
    ports:
      - "16686:16686"
      - "4318:4318"

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

volumes:
  pgvector_data:
  rabbitmq_data:
  grafana_data:
  prometheus_data:
  backend_storage:
  backend_logs:
  caddy_data:
  caddy_config:
```

### 4. `Caddyfile` (new, at repo root)
SSL termination + reverse proxy. Caddy auto-provisions Let's Encrypt certs.

```
api.yourdomain.com {
    reverse_proxy backend:3000
}

analysis.yourdomain.com {
    reverse_proxy content_analysis:3001
}

grafana.yourdomain.com {
    reverse_proxy grafana:3002
}
```

Replace `yourdomain.com` with your actual domain. Grafana and Jaeger can be left out initially (access via SSH tunnel instead).

### 5. `prometheus.yml` update
Change `host.docker.internal:3000` → `backend:3000` (Docker service name resolution works inside Compose network).

```yaml
scrape_configs:
  - job_name: algo-trading-backend
    static_configs:
      - targets:
          - backend:3000
```

### 6. `.env.production` files (not in git — created on server)
**`backend_nest/.env.production`** — same as `.env` but with:
- `AMQP_URL=amqp://guest:guest@rabbitmq:5672`
- `CONTENT_ANALYSIS_DATABASE_URL=postgresql://postgres:<pw>@pgvector:5432/content_analysis`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces`
- `ALLOWED_ORIGIN=https://yourfrontend.vercel.app`
- `NODE_ENV=production`

**`content_analysis/.env.production`** — same as `.env` but:
- `DATABASE_URL=postgresql://postgres:<pw>@pgvector:5432/content_analysis`

### 7. Frontend — no Dockerfile needed
Static SPA → deploy to **Vercel** for free:
- Set `VITE_API_URL=https://api.yourdomain.com` in Vercel env vars
- `npm run build` → Vercel deploys `dist/` automatically on push

**Requires one frontend code change:** `frontend/src/api/core.ts` hardcodes `http://localhost:3000` (the `BASE` constant) — change to `import.meta.env.VITE_API_URL` with a fallback to `http://localhost:3000`.

---

## Server Setup Steps (done once on the VPS)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repo
git clone <your-repo> ~/app
cd ~/app

# Create .env.production files (copy and edit)
cp backend_nest/.env backend_nest/.env.production
cp content_analysis/.env content_analysis/.env.production
# Edit both files with production values

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Files Changed Summary

| File | Action |
|------|--------|
| `backend_nest/Dockerfile` | Create |
| `content_analysis/Dockerfile` | Create |
| `docker-compose.prod.yml` | Create |
| `Caddyfile` | Create |
| `prometheus.yml` | Update target from `host.docker.internal:3000` → `backend:3000` |
| `frontend/src/api/core.ts` | Update base URL to use `VITE_API_URL` env var |

---

## Verification
1. SSH into server → `docker compose -f docker-compose.prod.yml ps` → all services `Up`
2. `curl https://api.yourdomain.com/` → returns company list JSON
3. Open frontend on Vercel → login works, ticker page loads charts
4. `curl https://api.yourdomain.com/CRWD` → returns history + analysis
5. Click "Analyze" on a ticker → news queues → worker consumes → analysis appears
6. Open `https://grafana.yourdomain.com` → dashboards load with metrics from backend
