# Backend API Reference

All routes except auth are protected by Bearer JWT. SSE routes accept `?token=<jwt>` instead of an Authorization header.

Base URL: `http://localhost:3000`

## Rate Limiting

Global throttling is enforced via `@nestjs/throttler` (NestJS `ThrottlerGuard` registered as a global `APP_GUARD`):

| Tier | Limit | Window | Applied to |
|------|-------|--------|------------|
| `default` | 100 req | 60 s per IP | All endpoints |
| `strict` | 5–10 req | 60 s per IP | AI-heavy endpoints: `GET /research/:ticker`, `POST /chat`, `POST /news-analyze/:ticker` |

Auth endpoints also have an independent in-memory sliding-window limiter: 10 attempts / 15 min per IP (`src/shared/utils/rateLimiter.ts`).

Exceeding a limit returns `429 Too Many Requests`.

---

## Authentication

### `POST /auth/login`
Public. Returns JWT + user on valid credentials.

**Body:** `{ username: string, password: string }`

**Response:** `{ token: string, user: User }`

---

### `POST /auth/register`
Public. Creates a new user with role `"user"`.

**Body:** `{ username: string, password: string }`

**Response:** `{ token: string, user: User }`

---

### `POST /auth/google`
Public. Verifies a Google OAuth ID token. Creates user on first login.

**Body:** `{ credential: string }` (Google JWT)

**Response:** `{ token: string, user: User }`

---

### `GET /auth/me`
Protected. Returns the authenticated user.

**Response:** `User`

---

## Stock Data

### `GET /`
Protected. Returns all companies.

**Response:** `{ [ticker: string]: string }` (ticker → company name)

---

### `GET /:ticker`
Protected. Full data for one ticker.

**Response:**
```json
{
  "history": { "quotes": Quote[] },
  "news": NewsArticle[],
  "summary": YahooSummary,
  "analysis": {
    "trend": string,
    "momentum": number,
    "volatility": number
  }
}
```

---

### `GET /sparklines`
Protected. Lightweight sparkline data for multiple tickers in a single request. Cached server-side with 24h TTL.

**Query params:**
- `tickers` — comma-separated list of ticker symbols (e.g. `CRWD,PANW,FTNT`)

**Response:** `{ [ticker: string]: { closes: number[]; dates: string[]; latestPrice: number | null; changePct: number | null } }`
- `closes` — last 30 adjusted-close prices
- `dates` — corresponding date strings (YYYY-MM-DD)
- `latestPrice` — most recent close price
- `changePct` — percentage change over the returned window

---

### `GET /correlation-matrix`
Protected. Full NxN Pearson correlation matrix for all companies (90-day log-returns). Cached server-side with 7-day TTL.

**Query params:**
- `lagDays` (optional, default 0) — shift each column ticker forward by N days

**Response:** `{ matrix: Record<name, Record<name, number | null>>, tickers: string[], names: string[], lagDays: number }`

---

### `GET /correlate/:tickerA/:tickerB`
Protected. Pearson correlation between two stocks.

**Query params:**
- `windowDays` (optional) — rolling window size in days
- `lagDays` (optional, default 0) — shift tickerB forward by N days

**Response:** `CorrelationResult`

---

### `GET /simulation-presets/:ticker`
Protected. Returns trading signal presets for the ticker.

**Response:** `{ [strategyName: string]: SimulationAction[] }`

Each action: `{ date: string (YYYY-MM-DD), number: number }`

---

### `POST /simulate/:ticker`
Protected. Runs a backtest simulation.

**Body:** `{ actions: SimulationAction[] }`

Each action: `{ date: string, type: "buy" | "sell", value: number }`

**Response:** `SimulationResult` (invested, shares, cash withdrawn, transactions)

---

## News Analysis

### `GET /news-analysis/:ticker`
Protected. Returns stored sentiment scores.

**Response:** `{ [articleLink: string]: ArticleScore }`

`ArticleScore`: `{ sentiment: number (-1 to 1), importance: number (1-10), relevance: number (1-10) }`

---

### `POST /news-analyze/:ticker`
Protected. Enqueues unanalyzed articles to RabbitMQ for Ollama processing.

**Response:** `{ queued: number, total: number }`

---

### `GET /ollama/status`
Protected. Checks if the local Ollama LLM is reachable.

**Response:** `{ running: boolean, model: string }`

---

### `GET /news-correlation/:ticker`
Protected. Correlates news sentiment events with stock price movement.

**Query params:** `lagDays` (optional, default 0)

**Response:** `{ correlation: CorrelationResult, lagImpact: LagImpactResult }`

---

## Trump Posts

### `GET /trump-posts`
Protected. All stored Trump posts.

**Response:** `TrumpPost[]`

---

### `GET /trump-posts/:ticker`
Protected. Posts that mention the given ticker in their analysis.

**Response:** `TrumpPost[]`

---

### `GET /correlate-trump/:ticker`
Protected. Correlates Trump post dates with stock price movement.

**Query params:** `lagDays` (optional, default 0)

**Response:** `{ correlation: CorrelationResult, lagImpact: LagImpactResult }`

---

### `GET /trump-lag-impact/:ticker`
Protected. Lag-bucketed average stock changes after Trump posts.

**Query params:** `lagDays` (optional)

**Response:** `LagImpactResult`

---

## Threat Intelligence

### `GET /threat-intel/status`
Protected. Count and last-sync timestamps for all sources.

**Response:** `{ kev: ThreatIntelStatus, nvd: ThreatIntelStatus, otx: ThreatIntelStatus, misp: ThreatIntelStatus }`

---

### `GET /threat-intel/list/:source`
Protected. Paginated entries for a single source. `:source` must be `kev`, `nvd`, `otx`, or `misp`. Returns `404` for unknown sources.

**Query params (per source):**
| Source | Params |
|--------|--------|
| `kev`  | `limit`, `offset`, `search`, `ransomware` (boolean), `company` (company name) |
| `nvd`  | `limit`, `offset`, `search`, `severity` (LOW\|MEDIUM\|HIGH\|CRITICAL), `company` |
| `otx`  | `limit`, `offset`, `company` |
| `misp` | `limit`, `offset` |

**Response:** `{ total: number, items: SourceEntry[], syncedAt: string \| null }`. For `otx`/`misp`, response also includes `configured: boolean` and is `{ configured: false }` when the source isn't set up.

---

### `GET /threat-intel/correlate/:source/:ticker`
Protected. Correlates threat events with stock price movement.

`:source` must be `nvd`, `kev`, or `otx`. Requires ≥ 4 threat events to calculate correlation.

**Query params:** `lagDays` (optional, default 0)

**Response:** `{ correlation: CorrelationResult, lagImpact: LagImpactResult }`

---

## Research & Chat (SSE)

### `GET /research/:ticker?token=`
Protected (token in query). Streams market research in SSE.

**Events emitted:**
```json
{ "section": "Latest News", "text": "...", "sectionDone": false, "done": false }
{ "section": "Latest News", "sectionDone": true, "done": false }
{ "done": true }
```

Three sections: `Latest News`, `Analyst Outlook`, `Competitive Landscape`.

---

### `POST /chat`
Protected. SSE stream of conversational AI response.

**Body:**
```json
{
  "message": "string",
  "history": [{ "role": "user"|"assistant", "content": "string" }],
  "context": "string"
}
```

**Events emitted:**
```json
{ "text": "...", "done": false }
{ "done": true, "messages": [{ "role": "assistant", "content": "..." }] }
```

The `messages` array in the final event contains the updated history (append to existing history on the frontend).

---

## Notifications (SSE)

### `GET /notifications/stream?token=`
Protected (token in query). Persistent SSE stream for all domain events.

**Event types:**
- `news.analyzed` — `{ ticker, title, sentiment, link }`
- `stocks.updated` — `{ tickers: [{ ticker, changePct }] }`
- `trump.updated` — `{ count: number }`
- `threatintel.updated` — `{ kev, nvd, otx, misp: { added, total } }`

---

## Admin

### `GET /admin/audit`
Admin only. Paginated audit log, newest first.

**Query params:** `limit` (default 100), `offset` (default 0), `userId` (optional), `action` (optional)

**Response:** `{ total: number, items: AuditEntry[] }`

`AuditEntry`: `{ id, userId, username, action, meta, timestamp }`

---

## Simulation Context

### `GET /context/:ticker`
Auth required (Bearer). Returns market / industry / company context layers plus a prediction timeline for the ticker, used by the intraday simulation's Context & Predictions panel to explain results and compare actual vs predicted event timelines.

Data is served from static dummy JSON under `storage/context/` (`market.json`, `sectors.json`, `companies.json`, `ticker-sector.json`) — see `modules/context`. Unseeded tickers return valid empty layers (no 404).

**Response:** `SimContext`

```typescript
SimContext {
  ticker: string
  market: LayerData       // layer:'market', key:'MARKET'
  industry: LayerData     // resolved via ticker-sector map
  company: LayerData      // layer:'company', key:ticker
  prediction: PredictionData
}
LayerData { layer, key, current: string, events: GradedEvent[] }
PredictionData { key, current: string, events: GradedEvent[] }
GradedEvent { date: 'YYYY-MM-DD', category: string, grade: number /*1–10*/, description: string }
```

---

## Shared Types

```typescript
User {
  id: string        // UUID
  username: string
  role: "user" | "admin"
  email?: string
  googleId?: string
}

Quote {
  date: string      // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  adjclose?: number
  volume?: number
}

CorrelationResult {
  r: number         // Pearson -1 to 1
  pValue: number
  significant: boolean  // p < 0.05
  ci: [number, number]  // 95% CI
  n: number
  lagDays: number
  interpretation: string
  rolling?: { r: number, date: string }[]
}

LagImpactResult {
  windowDays: number
  positive: { n: number, avgChangePct: number | null }
  negative: { n: number, avgChangePct: number | null }
  neutral:  { n: number, avgChangePct: number | null }
}
```
