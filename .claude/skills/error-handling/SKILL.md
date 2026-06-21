---
name: error-handling
description: Error conventions in backend_nest/ — AppError + factories, the global HttpExceptionFilter, error envelope, Sentry.
---

# error-handling

## Throw `AppError`, never raw `Error`
`src/shared/errors.ts` defines:
```ts
class AppError extends Error { status: number; code: string }
```
Use the factory helpers instead of constructing manually:
- `notFound(msg, code?)` → 404 · `badRequest(...)` → 400 · `unauthorized(...)` → 401 · `unprocessable(...)` → 422 · `unavailable(...)` → 503.

## Global filter (`src/common/errors/http-exception.filter.ts`)
- Registered as `APP_FILTER`. Catches `AppError`, Nest `HttpException`, and native `Error`.
- Response envelope: `{ error: { code, message, requestId } }` with the right HTTP status. `requestId` comes from `RequestIdMiddleware` (`X-Request-ID`).
- 5xx are reported to **Sentry** (if `SENTRY_DSN` set). `HealthCheckError` (`@nestjs/terminus`) → 503.

## Rules
- Services throw domain errors; the filter formats them — don't hand-build error responses in controllers.
- Pick the factory that matches intent so the status/code are correct and consistent.
- Validation errors are produced automatically by the global `ValidationPipe` — don't re-validate manually.
- Frontend mirrors this: `src/api/core.ts` throws on 401 and reports 5xx to Sentry; UI shows errors via `ErrorBoundary` / `StateHandler`.
