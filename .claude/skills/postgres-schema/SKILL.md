---
name: postgres-schema
description: Postgres schema in backend_nest/ — raw pg (no ORM), two databases, the core-db service, real tables.
---

# postgres-schema

## No ORM — raw `pg`
The backend uses the native `pg` driver directly. **There is no TypeORM/Prisma/Drizzle.** Write parameterized SQL (`$1, $2…`); never string-concatenate user input.

## Connection (`src/shared/core-db.service.ts`)
- `CoreDbService` manages a `pg.Pool` (max 20, idle 30s, conn timeout 10s, query timeout 30s) and **runs migrations on boot** (unless `SKIP_MIGRATIONS=true`).
- `@Global()` `CoreDbModule` — inject `CoreDbService` anywhere; use its pool/query helper for SQL.
- **Two databases**:
  - `core` (`DATABASE_URL`) — transactional data: users, audit_log, stock_meta, stock_quotes, company_news, news_analysis, etc.
  - `pgvector` (`:5433` in dev) — embeddings only, used by the `content-analysis` module.

## Tables (defined in migrations, see `skills/migrations.md`)
- `001_initial.sql` — core tables (users, audit_log, stock_meta, stock_quotes, company_news, …).
- `002_indexes.sql` — performance indexes.
- `003_sec_archive.sql`, `004_sec_filings.sql`, `005_edgar_poll_state.sql`, `005_filing_scans.sql`, `006_filing_scan_ai.sql` — EDGAR/filing tables.
- `schema_migrations` — bookkeeping (which files have run).

## Rules
- Schema/index changes go through a **new** numbered migration — never alter applied SQL or hand-mutate prod tables.
- Add indexes for new query patterns in the same migration that introduces them.
- Cache keys (`skills/caching.md`) are invalidated when `stock_quotes`/`company_news` change — keep that in mind when writing rows.
