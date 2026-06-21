---
name: migrations
description: How Postgres migrations work in backend_nest/ — numbered raw-SQL files, schema_migrations, auto-run on boot.
---

# migrations

## Format & location
- Plain SQL files in `backend_nest/src/db/migrations/`, **numbered and run in order**:
  `001_initial.sql`, `002_indexes.sql`, `003_sec_archive.sql`, `004_sec_filings.sql`, `005_edgar_poll_state.sql`, `005_filing_scans.sql`, `006_filing_scan_ai.sql`.
- Naming: `NNN_short_snake_case.sql`. Use the next free number; keep one logical change per file.
- Applied files are tracked in the `schema_migrations` table — the runner skips anything already recorded.

## Running
- **Auto-runs on app boot** via `CoreDbService` (skip with `SKIP_MIGRATIONS=true`).
- Manual: `cd backend_nest && npm run migrate` (runner `src/db/migrate.ts`).

## Rules
- **Never edit a migration that has already run** — it won't re-apply and prod/dev will diverge. Add a new numbered file to change schema.
- Migrations should be safe to run against an existing DB: prefer `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- Bundle the indexes a new table needs in the same migration (or the next), matching the pattern in `002_indexes.sql`.
- After a schema change, update affected SQL in services and add a regression spec (`backend-tester`). Document in `docs/backend/*` if it changes a contract.
