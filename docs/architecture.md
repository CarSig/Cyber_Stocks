# Architecture Overview

**Cyber Stock Intelligence** is a full-stack platform that correlates stock prices with multiple async data sources — news, social posts (Truth Social, Reddit), threat intelligence (NVD, KEV, OTX, MISP), and SEC EDGAR filings — for a tracked set of cybersecurity tickers.

## High-level architecture

```
Browser (React 19 + Vite SPA)
   │  REST + SSE  (port 5173 → 3000)
   ▼
NestJS API   (backend_nest, port 3000)
   │
   ├─► Postgres "core"  (transactional data: users, news, quotes, audit, …)
   ├─► Postgres "pgvector"  (embeddings; separate instance for content-analysis)
   ├─► Redis  (HTTP cache layer)
   ├─► RabbitMQ  (news.articles → newsWorker → news.analyzed)
   └─► External APIs  (Yahoo, NewsAPI, SEC EDGAR, NVD, KEV, OTX, MISP, Reddit, Truth Social, Anthropic)

Workers (separate Node processes)
   ├─► newsWorker         (consumes news.articles, calls Anthropic, publishes news.analyzed)
   ├─► archiveIngester    (bulk SEC EDGAR backfill, one-shot)
   └─► security_news      (cyber-news pipeline)
```

External APIs:
- **Yahoo Finance** — stock quotes + per-ticker news (`YahooCompanyClient`)
- **NewsAPI** — broader company news (`NewsApiClient`)
- **SEC EDGAR** — filings archive (`SecEdgarClient`)
- **NVD / CISA KEV / AlienVault OTX / MISP** — threat intel (`NvdClient`, `KevClient`, `OtxClient`, `MispClient`)
- **Reddit / Truth Social** — social signals
- **Anthropic Claude** — news sentiment analysis, research, chat
- **Tavily** — web search for research
- **Sentry** — error tracking
- **Prometheus / Grafana / Jaeger** — metrics + tracing

## Directory layout

```
backend_nest/                 # Active NestJS API server
  src/
    main.ts                   # Bootstrap (compression, helmet, Sentry, CORS, v1 prefix, Swagger, port 3000)
    app.module.ts             # Root module — wires 20 feature modules, throttler, interceptors, global filter
    tracing.ts                # OpenTelemetry init (must import before NestJS)
    modules/                  # Feature modules (one folder per domain — see below)
    shared/                   # Cross-module utilities
      clients/                # External API clients (Yahoo, SEC, NVD, KEV, OTX, MISP, NewsAPI, …)
      mq/                     # RabbitMQ wiring: connection, producers, consumers
      utils/                  # Ticker resolution, anthropic analyzer, validators
      socials/                # Reddit + Truth Social clients
      core-db.service.ts      # Postgres pool (main "core" DB)
      cache.service.ts        # Redis wrapper
      errors.ts               # AppError + factory helpers (notFound, unprocessable, …)
      logger.ts               # Pino logger
      metrics.ts              # prom-client metric definitions
      paths.ts                # Storage paths anchored to backend_nest/
    common/                   # Cross-cutting infrastructure
      decorators/             # @Public, @AllowQueryToken, @Roles
      errors/                 # HttpExceptionFilter (global)
      guards/                 # JwtAuthGuard, RolesGuard, AdminGuard
      interceptors/           # Metrics, Logging, Timeout
      middleware/             # request-id
    workers/                  # Standalone Node processes (separate from API)
      newsWorker.ts           # Consumes news.articles, calls Anthropic, publishes news.analyzed
      archiveIngester.ts      # Bulk SEC EDGAR backfill
      archiveDryRun.ts        # Dry-run companion for ingester
      security_news/          # Cyber-news pipeline
    types/                    # Shared TS types
    data/                     # Tracked-companies map (ticker → name)
  storage/                    # Runtime data (gitignored)

frontend/                     # React + Vite SPA
  src/
    main.tsx                  # Entry
    App.tsx                   # Routes + provider tree
    api/                      # Fetch wrappers (core.ts attaches Bearer; auto-logs out on 401)
    pages/                    # Route-level components (see frontend/components.md)
    features/                 # Feature folders (see frontend/migration_to_feature.md)
    components/
      ui/                     # shadcn primitives — never modify
      common/                 # Cross-feature components (cards, data-display, filters, layout)
      layout/                 # Navbar, route boundaries
    context/                  # Auth, Notification, Theme, Timezone
    stores/                   # Zustand stores (per-page UI state)
    hooks/                    # Cross-feature hooks (only useCachedQuery currently)
    types/                    # Domain + store types
    utils/, lib/              # Shared helpers

shared/                       # @algo/shared — types shared between backend & frontend
data/                         # Companies list at repo root
backend/                      # Legacy Fastify server — DO NOT modify
docker-compose.yml            # Dev stack: Postgres (pgvector :5433), RabbitMQ, Redis, Prometheus, Grafana, Jaeger
docker-compose.prod.yml       # Production stack (backend + frontend + infra)
```

## Backend feature modules

Each lives in `backend_nest/src/modules/<name>/` with at least a `<name>.module.ts`, `<name>.controller.ts`, and `<name>.service.ts`. Read the folder when you need contract details.

| Module | Purpose |
|--------|---------|
| `auth` | JWT issuance + verification; Clerk OAuth integration; role enforcement |
| `admin` | Admin-only endpoints, user management |
| `audit` | Audit log of user actions |
| `health` | Liveness/readiness checks |
| `metrics` | Prometheus `/metrics` endpoint |
| `stock` | Stock price sync (Yahoo), company metadata, stock-to-stock correlation |
| `news` | Company news fetch + analysis trigger |
| `cyber-news` | Cybersecurity news archive matched to tracked companies (topic-filtered) |
| `intelligence` | NLP-extracted entities (companies, regions, sectors) with per-entity sentiment + signals |
| `content-analysis` | Embeddings + entity extraction + sentiment scoring (separate pgvector DB) |
| `threat-intel` | KEV / NVD / OTX / MISP aggregation + per-ticker correlation |
| `edgar` | SEC EDGAR filings download + storage |
| `trump` | Truth Social post fetch + per-ticker tag correlation |
| `reddit` | Reddit post fetch |
| `research` | Anthropic-driven research SSE stream + chat |
| `alpaca` | Alpaca trading API client (currently used for intraday bars) |
| `scheduler` | Cron jobs (see below) |
| `notifications` | Real-time event SSE stream to frontend |
| `inspect-dom-capture` | DOM-feedback capture from the inspect overlay |
| `mq` | RabbitMQ connection module |

## Storage

Three persistence layers:

1. **Postgres "core"** — main transactional DB. Tables include `users`, `audit_log`, `stock_meta`, `stock_quotes`, `company_news`, `company_summary`, `news_analysis`, `news_analysis_queue`, `cybersecurity_news`, `cybersecurity_news_analysis`, `trump_posts`, `trump_post_tickers`, `sec_download_sessions`, `dom_feedback`. Access via `CoreDbService` (`src/shared/core-db.service.ts`).
2. **Postgres + pgvector** — separate instance (port 5433 in dev) used **only** by `content-analysis` for embeddings.
3. **Redis** — HTTP cache layer (port 6379). Wrapped by `CacheService`.
4. **Filesystem** — `backend_nest/storage/<Company Name>/` for historical artifacts (e.g., SEC archive files). Anchored via `paths.ts` so it works regardless of CWD.

## Request flow

`Controller → Guard (JwtAuthGuard / RolesGuard) → Service → shared/clients or core-db or RabbitMQ producer → external API or DB → response`

- **Auth tiers:** `public` (`@Public()`), `protected` (`JwtAuthGuard`, the default), `admin` (`JwtAuthGuard` + `@Roles('admin')` + `RolesGuard`).
- **SSE token fallback:** routes decorated with `@AllowQueryToken()` accept `?token=` because browser `EventSource` cannot set headers.
- **Errors:** throw `new AppError(message, status)` or use factory helpers from `src/shared/errors.ts`. The global `HttpExceptionFilter` (in `src/common/errors/`) returns `{ error: message }` with the right status; 5xx are logged + sent to Sentry.
- **Validation:** Zod, inline in controllers — `schema.safeParse(...)`, throw `new AppError(parsed.error.issues[0].message, 400)` on failure.

## Async pipelines

### News analysis (RabbitMQ + Anthropic)

```
News fetch (cron or on-demand)
   ↓
NewsApiClient / YahooCompanyClient
   ↓
newsProducer.publish() → queue:  news.articles  (durable)
   ↓                                          (5 retries → news.articles.dlx → news.articles.dead)
newsWorker (separate process: src/workers/newsWorker.ts)
   ↓  calls Anthropic Claude with the article body
   ↓
Writes scores to news_analysis table
   ↓
Publishes to queue: news.analyzed
   ↓
newsAnalyzedConsumer → emits notification → SSE → frontend
```

### Stock + intel sync (cron, no MQ)

Cron jobs in `src/modules/scheduler/cron.service.ts`:

| Schedule (UTC) | Method | What it does |
|---|---|---|
| `0 23 * * *` (daily, 23:00) | `runPopulate` | Sync stock quotes for all tracked companies via Yahoo; emits `stocks.updated` |
| `0 * * * *` (hourly) | `runNews` | Sync company news; emits `news.updated` |
| `0 * * * *` (hourly) | `runFetchTrump` | Fetch Truth Social posts; emits `trump.updated` |
| `0 * * * *` (hourly) | `runFetchReddit` | Fetch Reddit posts |
| `0 6 * * *` (daily, 06:00) | `runThreatIntelSync` | Sync NVD, KEV, OTX, MISP feeds |

## RabbitMQ queues

| Queue | Durable | Producer | Consumer | Notes |
|---|---|---|---|---|
| `news.articles` | yes | `NewsApiClient`, `YahooCompanyClient` | `newsWorker` | Articles awaiting analysis. After 5 failed attempts → DLX |
| `news.articles.dlx` | yes (exchange) | (auto from retries) | (auto-routed) | Dead-letter exchange |
| `news.articles.dead` | yes | (auto from DLX) | manual | Failed analyses for inspection |
| `news.analyzed` | no | `newsWorker` | `newsAnalyzedConsumer` | Triggers notifications |

## Rate limiting

Global config in `app.module.ts`:

```ts
ThrottlerModule.forRoot([
  { name: "default", ttl: 60_000, limit: 100 },  // 100 req/min per IP
  { name: "strict",  ttl: 60_000, limit: 20  },  // 20 req/min — applied per-endpoint via @Throttle({ strict: ... })
])
```

`ThrottlerGuard` is **not** registered globally — opt in per endpoint with `@UseGuards(ThrottlerGuard)` + `@Throttle(...)`. Auth endpoints also have an independent in-memory sliding-window limiter (`src/shared/utils/rateLimiter.ts`) for brute-force protection.

## Observability

- **Logs:** Pino (`src/shared/logger.ts`). Optional `LOG_FILE` env writes to disk.
- **Metrics:** prom-client via `MetricsInterceptor`. Exposed at `/metrics`. Defined in `src/shared/metrics.ts`.
- **Tracing:** OpenTelemetry → Jaeger (port 16686). Init in `src/tracing.ts` — imported before NestJS so instrumentation patches `http` early.
- **Error reporting:** Sentry. DSN via `SENTRY_DSN`; only initialized if set.

## Frontend overview

- **Stack:** React 19, Vite, React Router v7, TanStack React Query v5, lightweight-charts v5, shadcn/ui (Tailwind v4), Zustand (per-page UI state), Sentry.
- **React Compiler enabled** in `vite.config.js` — manual `useMemo` / `useCallback` are not needed.
- **API client:** `frontend/src/api/core.ts` attaches the JWT from `localStorage` and auto-logs out on 401. All feature `api/` folders use it.
- **Routing:** `App.tsx`. Provider chain: `BrowserRouter → ThemeProvider → TimezoneProvider → AuthProvider → NotificationProvider`. Routes are lazy-loaded; `RouteBoundary` / `AdminRouteBoundary` enforce auth.
- **State:** server state → React Query feature hooks; per-page UI state → Zustand (`src/stores/tickerStore.ts`); global UI → Context (`AuthContext`, `NotificationContext`, `ThemeContext`, `TimezoneContext`).
- **Component layout:** feature folders under `src/features/` (see [frontend/migration_to_feature.md](frontend/migration_to_feature.md)); cross-feature components in `src/components/common/`; shadcn primitives in `src/components/ui/`.

For deeper detail see [frontend/components.md](frontend/components.md), [frontend/hooks.md](frontend/hooks.md), [frontend/ui.md](frontend/ui.md), [data-flows.md](data-flows.md), [backend/api.md](backend/api.md).
