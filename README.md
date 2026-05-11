# Cyber Stock Intelligence

A full-stack financial analysis platform that correlates cybersecurity stock prices with external signals — news sentiment, social media posts, and live threat intelligence feeds. Built to explore whether events in the cybersecurity domain (CVEs, ransomware campaigns, vendor disclosures) move prices in predictable ways.

---

## What it does

**Per-ticker analysis** — candlestick chart with event overlays, company KPIs, news feed with AI-scored sentiment, backtest simulation, and streaming market research.

**Correlation engine** — computes Pearson r, p-values, 95% confidence intervals, and lag-bucketed average price changes for four signal types:
- Stock ↔ stock (rolling window)
- News sentiment ↔ price
- Trump Truth Social posts ↔ price
- Threat intel events (CVE/KEV/OTX/MISP) ↔ price

**Threat intelligence** — aggregates four feeds (CISA KEV, NVD, AlienVault OTX, MISP), maps each event to affected vendors, and runs correlation against their stock history.

**AI research** — streaming market research sections (latest news, analyst outlook, competitive landscape) via Anthropic Claude + Tavily web search. In-app chat with context injection.

**Async news pipeline** — articles are enqueued to RabbitMQ, processed by a separate worker using Claude (haiku), and results streamed back to the UI via SSE.

---

## Architecture

```
Browser (React 19 SPA)
    │  REST + SSE
    ▼
NestJS API  ──── PostgreSQL/pgvector
    │               (users, news_analysis, embeddings)
    │  RabbitMQ
    ▼
newsWorker.ts (separate Node process)
    │  Anthropic Claude API
    ▼
news_analysis table → SSE broadcast → browser
```

**Observability stack (Docker Compose):**
- Prometheus → scrapes `/metrics` from the API
- Grafana → dashboards over Prometheus data
- Jaeger → distributed tracing via OpenTelemetry
- Pino → structured JSON logs to `logs/app.log`
- Sentry → error tracking (frontend + backend)

---

## Tech stack

| Layer | Stack |
|-------|-------|
| API | NestJS 11, TypeScript, Zod validation, Pino logging |
| Auth | Clerk (SSO) → backend issues signed JWT for all subsequent calls |
| Database | PostgreSQL 16 + pgvector extension |
| Queue | RabbitMQ 3 (AMQP) |
| Stats | `@stdlib/stats-pcorrtest` (Pearson r, p-value, CI) |
| External APIs | Yahoo Finance, Anthropic Claude, Tavily, CISA KEV, NVD, AlienVault OTX |
| Frontend | React 19 + React Compiler, React Router v7, TanStack Query v5 |
| Charts | Lightweight Charts v5 (OHLCV candlestick + event overlays) |
| UI | shadcn/ui, Tailwind CSS v4 |
| Rate limiting | `@nestjs/throttler` — 100 req/min global, 5–10 req/min on AI endpoints |
| Testing | Jest + ts-jest (backend), Vitest + React Testing Library (frontend) |

---

## Project structure

```
backend_nest/          # NestJS API
  src/
    modules/           # auth, stock, news, trump, threat-intel,
                       # research, intelligence, admin, scheduler, …
    shared/
      utils/
        correlations/  # Pearson engine + strategy pattern per signal type
        rateLimiter.ts # Sliding-window in-memory limiter (auth endpoint)
      clients/         # Yahoo Finance, KEV, NVD, OTX, MISP
    workers/
      newsWorker.ts    # Standalone RabbitMQ consumer → Claude → PostgreSQL
    common/            # Guards, interceptors, filters, decorators

frontend/              # React SPA
  src/
    pages/             # Route-level components (Home, Ticker, ThreatIntel, …)
    components/
      organisms/       # StockChart, CorrelationBox, NewsSection, Chat, …
    hooks/             # React Query hooks (useStock, useCorrelation, …)
    context/           # AuthContext (Clerk), NotificationContext (SSE)
    api.js             # All fetch calls, Bearer token injection

docker-compose.yml     # Prometheus, Grafana, PostgreSQL/pgvector, RabbitMQ, Jaeger
```

---

## Running locally

### Prerequisites

- Node.js 20+
- Docker (for the infra stack)
- Clerk account (free tier is fine)
- Anthropic API key
- Tavily API key (for research/chat)

### 1. Start infrastructure

```bash
cp .env.example .env        # fill in POSTGRES_PASSWORD, RABBITMQ_USER/PASSWORD, GRAFANA_PASSWORD
docker compose up -d
```

### 2. Backend

```bash
cd backend_nest
cp .env.example .env        # fill in JWT_SECRET, CLERK_SECRET_KEY, ANTHROPIC_API_KEY, TAVILY_API_KEY, DATABASE_URL
npm install
npm run start:dev           # API on http://localhost:3000
npm run worker:dev          # news analysis worker (separate terminal)
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env        # fill in VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev                 # http://localhost:5173
```

### Observability

| Service | URL |
|---------|-----|
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| Jaeger | http://localhost:16686 |
| RabbitMQ management | http://localhost:15672 |

---

## Tests

```bash
# Backend — Jest + ts-jest (34 tests)
cd backend_nest && npm test

# Frontend — Vitest + React Testing Library (39 tests)
cd frontend && npm test
```

Key test coverage:
- **Correlation math** — known-input Pearson r values (`r ≈ 1.0` for perfectly correlated data), `nearestPrice` boundary cases, exact bucket counts for lag impact grouping
- **Rate limiter** — quota enforcement, per-IP isolation, window reset, `limit=0` edge case
- **CorrelationBox** — all render states (loading, error, grouped/single lag impact, `r=0`, input clamping)
- **NewsSection** — sentiment pipeline UI states (idle, queuing, processing, analyzed)

---

## Auth flow

Clerk handles sign-in (social login, email magic link). On successful Clerk authentication the frontend exchanges the Clerk session token for a backend-issued JWT (`POST /auth/clerk`). That JWT is stored in `localStorage` and sent as `Bearer <token>` on every API request. SSE endpoints accept `?token=` as a query param since browser `EventSource` cannot set headers.

---

## Rate limiting

Two tiers via `@nestjs/throttler`, enforced globally by `ThrottlerGuard`:

| Tier | Limit | Applied to |
|------|-------|------------|
| default | 100 req / 60 s per IP | all endpoints |
| strict | 5–10 req / 60 s per IP | `GET /research/:ticker`, `POST /chat`, `POST /news-analyze/:ticker` |

Auth endpoint additionally has an in-memory sliding-window limiter (10 attempts / 15 min per IP).
