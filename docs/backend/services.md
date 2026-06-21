# Backend Services

> Source of truth: `backend_nest/src/modules/`.
>
> Each feature module is a self-contained NestJS unit (`<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, plus any helpers). Modules are small enough that the code itself is the most reliable description — read the module folder you're working in rather than relying on a cached summary here.

## Where things live

- **Feature modules:** `backend_nest/src/modules/<name>/`
- **Shared utilities** (errors, validation, rate limiter, ticker resolution, correlation engines, external API clients): `backend_nest/src/shared/`
- **Cross-cutting infrastructure** (global filters, guards, interceptors): `backend_nest/src/common/`
- **Background workers** (RabbitMQ consumers): `backend_nest/src/workers/`
- **Bootstrap:** `backend_nest/src/main.ts`, `backend_nest/src/app.module.ts`

## Service conventions

- Services are NestJS providers — registered via the owning module, injected with the constructor.
- Throw `AppError` (from `src/shared/errors.ts`) or its factory helpers (`notFound`, `unprocessable`, etc.). The global `HttpExceptionFilter` in `src/common/errors/` converts to `{ error: message }` with the right status.
- Validate inputs in the controller with `schema.safeParse(...)` (Zod). On failure, throw `new AppError(parsed.error.issues[0].message, 400)`.
- Real-time output uses NestJS `@Sse()`. Async pipelines use RabbitMQ via `amqplib` — producer in the feature module, consumer in `src/workers/`.

## API contracts

See [api.md](api.md) for HTTP routes, auth tiers, request/response shapes, and rate limits.

## Why this file is short

A previous version of this file enumerated services for the legacy `backend/` Fastify server. That code is no longer the active backend and the file would have rotted within a release. The NestJS modules are small and well-named — read the module folder when you need to know a service's contract.
