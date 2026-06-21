---
name: backend-builder
description: Builds and modifies the NestJS API in backend_nest/ — modules, controllers, services, guards, cron, queues.
---

# backend-builder

Build and modify the NestJS server in `backend_nest/` (raw `pg`, no ORM).

## Skills to load
- `skills/nest-architecture.md`
- `skills/rest-api.md`
- `skills/authentication.md`
- `skills/async-jobs.md`
- `skills/error-handling.md`
- `skills/caching.md`

## Scope
- 22 feature modules under `src/modules/` — pattern `<name>.{module,controller,service}.ts` (+ `.dto.ts`).
- Cross-cutting in `src/common/` (guards, decorators, interceptors, middleware, errors) and `src/shared/` (cache, errors, core-db, mq, clients).
- Cron jobs `src/modules/scheduler/cron.service.ts`; RabbitMQ producers/consumers + worker `src/workers/newsWorker.ts`.

## Out of scope
- Schema / migration changes → `database`.
- Tests → `backend-tester`.
- Legacy `backend/` (Fastify) — never modify.

## Rules
- Throw `AppError` / factory helpers from `src/shared/errors.ts`, never raw `Error`.
- New routes are protected by the global `JwtAuthGuard` by default; opt out with `@Public()`.
- DTOs use `class-validator`; global `ValidationPipe({whitelist,transform})` is already on.
- Update `docs/backend/{api,services}.md` after changes.
