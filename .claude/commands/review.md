---
name: review
description: Review the current diff / PR against this repo's conventions before merge.
---

# /review

Review the working diff (or a PR) as a skeptical senior engineer. Run `git diff` (or fetch the PR), then check against this list. Report concrete findings with `file:line`; if it's genuinely fine, say so — don't invent concerns.

## Universal
- [ ] Scope is coherent; no unrelated churn. Commit messages follow Conventional Commits.
- [ ] Tests added/updated for new behavior; **bug fixes include a regression test**. Suites pass.
- [ ] Docs updated when contracts changed (`docs/backend/{api,services}.md`, `docs/frontend/*.md`, `docs/data-flows.md`) — no silent rot.
- [ ] TS: `type` over `interface`; no manual `useMemo`/`useCallback` (React Compiler).

## Backend (`backend_nest/`)
- [ ] New routes correctly guarded — protected by default; `@Public()` only where intended; SSE uses `@AllowQueryToken()`.
- [ ] Errors thrown via `AppError` factories (`src/shared/errors.ts`), not raw `Error`; responses go through `HttpExceptionFilter`.
- [ ] DTOs use `class-validator`; no manual re-validation duplicating the global `ValidationPipe`.
- [ ] SQL is parameterized (raw `pg`, no ORM). Schema changes are a **new** numbered migration in `src/db/migrations/`, never an edit to an applied one.
- [ ] Cache invalidated when underlying rows change (`cache-keys.ts`); queue work uses RabbitMQ/`@nestjs/schedule` patterns (not ad-hoc).

## Frontend (`frontend/`)
- [ ] HTTP goes through `src/api/core.ts` — no direct `fetch()`, no bypassing the Bearer/401 handling. (Watch for stale `src/api.js` references.)
- [ ] Query keys come from the feature's `queryKeys.ts`; SSE-affected queries are invalidated.
- [ ] No cross-feature imports; shared code is in `components/common/`. shadcn primitives in `components/ui/` untouched.
- [ ] Dark-only styling; inline styles only for dynamic values.

## CI/CD (if touched)
- [ ] `ci.yml` jobs stay green and mirror local scripts. Docker/compose changes account for the not-yet-built `docker-compose.prod.yml` / `Caddyfile`.
