# Cyber Stock Intelligence

A full-stack financial analysis platform that correlates cybersecurity stock prices with external signals — news sentiment, social media posts, SEC EDGAR filings, and live threat intelligence feeds. Built to explore whether events in the cybersecurity domain (CVEs, ransomware campaigns, vendor disclosures, SEC filings) move prices in predictable ways.

---

## What it does

**Per-ticker analysis** — candlestick chart with event overlays, company KPIs, news feed with AI-scored sentiment, backtest simulation, and streaming market research.

**Correlation engine** — computes Pearson r, p-values, 95% confidence intervals, and lag-bucketed average price changes for five signal types:

- Stock ↔ stock (rolling window)
- News sentiment ↔ price
- Social media posts ↔ price
- SEC EDGAR filing impact ↔ price
- Threat intel events (CVE/KEV/OTX/MISP) ↔ price

**SEC EDGAR Archive** — download, browse, and analyze SEC filings directly from EDGAR. Track coverage gaps, overlay filing events on price charts, and measure price impact grouped by form type (8-K, 10-K, 10-Q, proxy statements, insider forms, and more).

**Threat intelligence** — aggregates four feeds (CISA KEV, NVD, AlienVault OTX, MISP), maps each event to affected vendors, and runs correlation against their stock history.

**AI research** — streaming market research sections (latest news, analyst outlook, competitive landscape) via Anthropic Claude + Tavily web search. In-app chat with context injection.

**Async news pipeline** — articles are enqueued to RabbitMQ, processed by a separate worker using Claude (haiku), and results streamed back to the UI via SSE.

---

## SEC EDGAR Archive

A dedicated page (`/sec-archive`) for downloading, browsing, and analyzing SEC filings. The pipeline fetches filings from the SEC's EDGAR system and stores them locally for offline analysis.

### Download pipeline

Select a ticker, date range, and optionally filter by form type. The backend fetches filing metadata from EDGAR, downloads the associated files (HTML, XML, XBRL, PDF), and stores them on disk. A coverage index tracks which date ranges have been downloaded, making incremental syncs efficient.

```
Browser (date range + form type)
    │  POST /sec/sync
    ▼
NestJS API  ──── SecEdgarClient ──── EDGAR (sec.gov)
    │
    ▼
Local filesystem (filings stored by ticker/accession)
```

### Coverage timeline

A visual timeline shows exactly which date ranges have been downloaded (green) and where gaps exist (transparent). Filing events are color-coded by form type — 10-K (blue), 10-Q (purple), 8-K (orange), proxy statements (cyan), insider forms (pink), ownership disclosures (green/red), and more. Hover for details, click to zoom the chart to that range.

### Price impact analysis

Every downloaded filing is automatically measured against historical price data:

- **Baseline** — last close before the filing date (market hadn't seen it yet)
- **Lag window** — configurable N-day window after filing (default 1 day)
- **Metrics per filing** — absolute swing (|Δ|%) and signed gain/loss (Δ%)
- **Grouped by form type** — average swing and gain/loss across all filings of the same type

Results are displayed in an expandable table: group rows show aggregate stats, individual rows show per-filing data, and each filing can be expanded to reveal the actual EDGAR file list with direct links to sec.gov.

### Filing overlay on price chart

Toggle filing markers on the price chart to see exactly when each filing occurred relative to price action. A legend modal explains all tracked form types across categories:

| Category      | Forms                                       |
| ------------- | ------------------------------------------- |
| **Periodic**  | 10-K, 10-Q, 20-F, 40-F, NT 10-K/Q, 11-K     |
| **Events**    | 8-K, 8-K/A, 6-K, 1-U, 15-12G, 25            |
| **Proxy**     | DEF 14A, DEFA14A, PRE 14A, DEFM14A, PX14A6G |
| **Insider**   | Form 3, Form 4, Form 5, SC 13D/A, SC TO-T/I |
| **Holdings**  | 13F-HR, 13F-HR/A, 13H                       |
| **M&A**       | 425, SC TO-T/I, S-4, SC 13D, DEFM14A        |
| **Offerings** | S-1, S-3, S-4, 424B4, FWP, POS AM           |
| **Admin**     | CORRESP, UPLOAD, EFFECT, SD                 |

### 8-K item parsing

8-K filings use standardized item numbers (Regulation S-K Item 1–9 series) to indicate the type of material event. The platform includes a reference page documenting all items with signal priority:

| Priority    | Items                                                                                                                                                                         | Signal                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Highest** | 4.02 (non-reliance), 5.02 (exec change)                                                                                                                                       | Near-certain price impact |
| **High**    | 1.01 (material agreement), 2.03 (new debt), 2.04 (default), 3.01 (delisting), 4.01 (auditor change), 8.01 (other events)                                                      | Strong directional signal |
| **Medium**  | 1.02 (termination), 2.01 (M&A closed), 2.02 (earnings), 2.05 (restructuring), 2.06 (impairments), 3.02 (dilution), 5.07 (vote results), 7.01 (FD disclosure), 9.01 (exhibits) | Contextual signal         |
| **Low**     | 3.03, 5.03–5.06, Section 6 (ABS)                                                                                                                                              | Rarely actionable         |

---

## Events & Signals

The platform ingests and correlates multiple event types against price data:

### SEC filing events

- **Trigger** — new filing downloaded from EDGAR (8-K, 10-K, 10-Q, proxy, insider forms, etc.)
- **Signal** — price impact measured as swing and gain/loss over configurable lag window
- **Granularity** — per-form-type aggregation, per-filing drill-down, direct EDGAR links

### News sentiment events

- **Trigger** — article enqueued via news pipeline, scored by Claude (haiku)
- **Signal** — sentiment score (−1 to +1) mapped to price movement
- **Granularity** — per-article sentiment with AI-generated summary

### Social media events

- **Trigger** — posts from social networks relevant to covered tickers
- **Signal** — correlation with intraday and daily price changes
- **Granularity** — per-post sentiment and engagement metrics

### Threat intel events

- **Trigger** — new CVE, KEV entry, OTX pulse, or MISP event
- **Signal** — mapped to affected vendors via CPE-to-ticker resolution
- **Granularity** — per-event with CVSS score, exploitability, and vendor mapping

### Correlation engine

All event types feed into a unified correlation engine that computes:

- **Pearson r** — linear correlation between event signal and price change
- **p-value** — statistical significance of the correlation
- **95% confidence interval** — range of plausible r values
- **Lag-bucketed averages** — average price change at N days before/after each event

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

| Layer         | Stack                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| API           | NestJS 11, TypeScript, Zod validation, Pino logging                               |
| Auth          | Clerk (SSO) → backend issues signed JWT for all subsequent calls                  |
| Database      | PostgreSQL 16 + pgvector extension                                                |
| Queue         | RabbitMQ 3 (AMQP)                                                                 |
| Stats         | `@stdlib/stats-pcorrtest` (Pearson r, p-value, CI)                                |
| External APIs | Yahoo Finance, SEC EDGAR, Anthropic Claude, Tavily, CISA KEV, NVD, AlienVault OTX |
| Frontend      | React 19 + React Compiler, React Router v7, TanStack Query v5                     |
| Charts        | Lightweight Charts v5 (OHLCV candlestick + event overlays)                        |
| UI            | shadcn/ui, Tailwind CSS v4                                                        |
| Rate limiting | `@nestjs/throttler` — 100 req/min global, 5–10 req/min on AI endpoints            |
| Testing       | Jest + ts-jest (backend), Vitest + React Testing Library (frontend)               |

---

## Project structure

```
backend_nest/          # NestJS API
  src/
    modules/           # auth, stock, news, sec, trump, threat-intel,
                       # research, intelligence, admin, scheduler, …
    shared/
      utils/
        correlations/  # Pearson engine + strategy pattern per signal type
        rateLimiter.ts # Sliding-window in-memory limiter (auth endpoint)
      clients/         # Yahoo Finance, SEC EDGAR, KEV, NVD, OTX, MISP
    workers/
      newsWorker.ts    # Standalone RabbitMQ consumer → Claude → PostgreSQL
    common/            # Guards, interceptors, filters, decorators

frontend/              # React SPA
  src/
    pages/             # Route-level components (Home, Ticker, ThreatIntel,
                       #   SecArchive, Research, …)
    features/
      sec/             # EDGAR download form, price chart, timeline,
                       #   filing impact table, file list, coverage bar
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

| Service             | URL                    |
| ------------------- | ---------------------- |
| Grafana             | http://localhost:3001  |
| Prometheus          | http://localhost:9090  |
| Jaeger              | http://localhost:16686 |
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

| Tier    | Limit                  | Applied to                                                          |
| ------- | ---------------------- | ------------------------------------------------------------------- |
| default | 100 req / 60 s per IP  | all endpoints                                                       |
| strict  | 5–10 req / 60 s per IP | `GET /research/:ticker`, `POST /chat`, `POST /news-analyze/:ticker` |

Auth endpoint additionally has an in-memory sliding-window limiter (10 attempts / 15 min per IP).
