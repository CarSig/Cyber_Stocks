---
name: rest-api
description: REST conventions across the stack — NestJS routes/DTOs in backend_nest/ and the frontend client in src/api/core.ts.
---

# rest-api

## Backend routes (`backend_nest/`)
- Base path `/api/v1` (global prefix `api` + URI version `v1`); `health`/`metrics` are unprefixed.
- Controllers are thin: validate → call service → return. Throw `AppError` factories on failure (see `skills/error-handling.md`).
- **Validation**: DTOs with `class-validator` (`@IsString`, `@IsInt`, `@Min`…) + `class-transformer` `@Type()`; global `ValidationPipe({whitelist,transform})` strips unknown fields. Shared DTOs in `src/shared/dto.ts` (e.g. `PaginationDto`, `CorrelationQueryDto`), module-specific in `<name>.dto.ts`.

### Representative endpoints
- Auth: `POST /auth/clerk`, `GET /auth/me` (`auth.controller.ts`).
- Stock: `GET /stocks`, `/stocks/sparklines`, `/stocks/correlation-matrix`, `/stocks/correlate/:a/:b`, `POST /stocks/simulate/:ticker` (`stock.controller.ts`).
- Research (SSE): `@Sse("research/:ticker")`, `POST /research/chat` (`research.controller.ts`).
- Notifications (SSE): `@Sse("notifications/stream")`.
- Admin (role-guarded): `GET /admin/audit`, `POST /admin/trigger/...`.

## Frontend client (`frontend/src/api/core.ts`)
- **All HTTP goes through `core.ts` — never `fetch()` directly.**
  - `apiFetch<T>(path, opts)` — Bearer token from localStorage, 30s timeout, throws on 401, 5xx → Sentry, `AbortSignal` support.
  - `postJson<T>(path, body, opts)`, `qs(params)` query-string helper.
  - `BASE` = `http://localhost:3000/api/v1` locally.
- Feature `api/` folders wrap `core.ts` and are consumed by `useQuery`/`useMutation`.
- Generated types: `src/api/schema.d.ts` via `npm run codegen` (openapi-typescript against `/api-docs-json`).

> ⚠ The root `CLAUDE.md` / `docs/plans/deployment.md` mention `src/api.js` — that's **stale**; the real client is `src/api/core.ts`.
