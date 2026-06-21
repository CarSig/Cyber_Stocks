# Improvement Plan (Claude's Version)

Based on actual codebase state — not aspirational. Every issue listed here is confirmed in the code.

Reference archive: `docs/review/` (original level1/level2 plans kept for comparison)

---

## Phase 1: Quick Wins & Real Bugs (this week)

Confirmed issues, all low-effort. Do these before anything else.

### Backend

| Task | File | Change | Effort |
|------|------|--------|--------|
| Pool has no max connections | `src/shared/core-db.service.ts:6` | Add `max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000` to Pool constructor | 10 min |
| historyCache Map breaks multi-instance | `src/shared/clients/YahooCompanyClient.ts:9` | Replace `historyCache` Map with `CacheService.getOrSet('history:${name}', 86400, ...)` — CacheService already exists | 2h |
| pearsonLag duplicated | `src/modules/stock/stock.service.ts:11-34` | Remove inline definition, import from `@/shared/utils/stockCorrelation` | 30 min |
| console.log in production paths | `src/main.ts`, `src/shared/mq/connection.ts` | Replace with `logger.info()` / Pino logger | 1h |
| require() + @ts-ignore in tracing | `src/tracing.ts:2-7` | Use dynamic `import()` or top-level conditional import | 1h |
| Pagination on news analysis | `src/modules/news/news-analysis.service.ts` | Add cursor-based pagination — risk of OOM on large datasets. Use `analyzed_at` as cursor | 4h |

### Frontend

| Task | File | Change | Effort |
|------|------|--------|--------|
| ngrok header on every request | `src/api/core.ts:14` | Remove `'ngrok-skip-browser-warning'` header entirely | 5 min |
| No ErrorBoundary | `src/App.tsx` | Add class-based ErrorBoundary wrapping each lazy-loaded route | 2h |
| lsCache + React Query double-caching | `src/utils/lsCache.ts`, `src/features/tickers/hooks/useStock.ts` | Remove `withLsCache` wrappers — React Query `gcTime` already handles persistence | 3h |

### Schema migrations (no ORM)

Problem: schema lives in `onApplicationBootstrap()` — no rollback, no drift tracking. Drizzle ORM is not the fix. SQL migration files are.

| Task | Change | Effort |
|------|--------|--------|
| Extract schema to SQL migration files | Create `src/db/migrations/001_initial.sql`, add `npm run migrate` script using node-postgres to run files in order | 1 day |
| Add missing indexes | Add `stock_quotes_date_idx`, `cybersecurity_news_analysis_ticker_idx` to migration file | 30 min |

**Skip Drizzle ORM.** Raw SQL is transparent, debuggable, and already works. The original plan's 3-4 week ORM migration brings risk without proportional benefit.

---

## Phase 2: Architecture & Test Coverage (2-6 weeks)

### Testing — enforce incrementally

Original plan targets 60% from ~10%. That's a sprint blocker before you ship anything. Start at 30%.

| Task | Change | Effort |
|------|--------|--------|
| GitHub Actions CI | lint → typecheck → test → build on every push. Real test DB for integration tests (pgvector image) | 1 day |
| Integration tests: core controllers | Priority: `stock`, `news`, `auth`, `threat-intel`. Use `@nestjs/testing` + supertest | 1 week |
| Unit tests: pure logic | Correlation functions, simulation calculations, sentiment utils — these are pure functions, easy wins | 3 days |
| Frontend component tests | `CorrelationMatrix`, `SignalsPanel`, `TickerCard` — Vitest + Testing Library | 3 days |
| Coverage threshold at 30% | Enforce in CI, raise quarterly | 1 day |

### Security — two real wins, skip CSRF

| Task | Change | Effort |
|------|--------|--------|
| HttpOnly cookies for auth | Add `/auth/refresh` endpoint with `httpOnly: true, sameSite: 'strict'` cookies. Update `apiFetch` to `credentials: 'include'` | 3 days |
| Per-user rate limiting | ThrottlerModule belongs in `AppModule`, not `AuthModule`. Use `req.user?.id ?? req.ip` as throttle key | 1 day |
| DOM feedback input sanitization | Strip HTML from `message` and `inner_text` before DB insert — use `sanitize-html` | 2h |

**Skip `csurf`** — archived package, last maintained 2021. HttpOnly + SameSite=Strict cookies mitigate CSRF. A dead dependency is worse than the risk.

### Frontend: split by responsibility, not by file count

The original plan creates one large `useTickerData` hook to replace one large component. That moves complexity, doesn't reduce it.

| Task | Change | Effort |
|------|--------|--------|
| Split TickerContent by tab | Each tab component fetches its own data via its own hooks. Page orchestrator just renders the active tab. No mega-hook. | 3 days |
| Remove AnyRecord casts | Define proper types per feature in `src/features/*/types.ts`. Don't consolidate into one types file. | 1 week |
| Bundle analysis | Add `rollup-plugin-visualizer` to `vite.config.ts`, run once, identify large deps | 2h |

### Scalability fixes

| Task | File | Change | Effort |
|------|------|--------|--------|
| Batch cron jobs | `src/modules/scheduler/data-sync.service.ts` | Wrap `runPopulate` in `Promise.allSettled` batches of 5, not sequential | 2h |
| Pagination on remaining endpoints | threat-intel, intelligence articles, cyber-news, audit log | Cursor-based, same pattern as news | 3 days |
| Pre-compute correlation matrix | `src/modules/scheduler/cron.service.ts` | Nightly cron that computes all pairs and stores in Redis via CacheService | 1 day |

---

## Phase 3: Operational Readiness (ongoing, low priority)

### Observability (infrastructure already exists — just needs dashboards)

| Task | Change | Effort |
|------|--------|--------|
| Grafana dashboards | HTTP p95 latency, LLM token spend by model, RabbitMQ queue depth, cron job success rate | 1 week |
| Alerting rules | Error rate >5%, queue depth >500, cron failure | 2 days |
| Distributed tracing spans | Manual spans for Anthropic, Yahoo Finance, Alpaca calls | 2 days |

### Deployment

| Task | Change | Effort |
|------|--------|--------|
| Health checks | `@nestjs/terminus` for DB, Redis, RabbitMQ — add to docker-compose healthcheck | 2 days |
| Deploy stage in CI | GitHub Actions deploy on merge to main — target depends on hosting (Fly.io, ECS, VPS) | 1 week |

### Not worth doing at this stage

- **pgBouncer** — you have 22 tickers, low traffic. Pool max=20 is enough.
- **Blue-green deployment** — over-engineered for a solo project.
- **Terraform/Pulumi** — only if you go multi-environment on cloud infra.
- **Feature flags (LaunchDarkly)** — env vars already do this job.
- **GraphQL/tRPC** — not worth rewriting the API contract.
- **Drizzle/Prisma ORM** — raw SQL is fine. Migrations fix the real gap.

---

## Execution order

```
This week:
  1. Pool max connections           (10 min)
  2. ngrok header removal           (5 min)
  3. console.log → logger           (1h)
  4. pearsonLag dedup               (30 min)
  5. ErrorBoundary                  (2h)
  6. historyCache → CacheService    (2h)
  7. lsCache removal                (3h)

Next 2 weeks:
  8. SQL migration files            (1 day)
  9. Pagination on news endpoint    (4h)
  10. GitHub Actions CI             (1 day)

Next month:
  11. Integration tests: stock, news, auth
  12. HttpOnly cookies
  13. TickerContent tab-split
  14. Batch cron jobs
  15. Pagination on remaining endpoints
```

---

## Metrics

| Metric | Now | Phase 1 target | Phase 2 target |
|--------|-----|----------------|----------------|
| Test coverage | ~10% | 30% | 60% |
| CI build time | none | <8 min | <5 min |
| API p95 latency | unknown | measured | <1s |
| DB pool max | unlimited | 20 | 20 + monitored |
| ErrorBoundary | none | all routes | all routes + Sentry |
