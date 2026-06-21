---
name: nest-architecture
description: NestJS module/controller/provider structure in backend_nest/ — DI, global providers, validation, versioning, throttling.
---

# nest-architecture

## Module pattern
22 feature modules under `backend_nest/src/modules/` (auth, stock, news, research, scheduler, mq, context, edgar, threat-intel, intelligence, content-analysis, admin, audit, health, metrics, notifications, …). Each:
```
<name>.module.ts      // imports, providers, exports, controllers
<name>.controller.ts  // @Controller routes
<name>.service.ts     // @Injectable business logic
<name>.dto.ts         // class-validator DTOs (when needed)
```
- Services are `@Injectable()`, named `<Feature>Service`, injected via constructor DI.
- `@Global()` modules — `CoreDbModule`, `CacheModule`, `MqModule` — auto-export their providers; inject `CoreDbService`/`CacheService`/`MqService` anywhere without re-importing.

## Bootstrap (`src/main.ts`)
- Global prefix `api` (excludes `health`, `metrics`); URI versioning, default `v1` → routes are `/api/v1/...`.
- Global `ValidationPipe({ whitelist: true, transform: true })`.
- `helmet` (CSP/COEP off), `compression`, CORS from `ALLOWED_ORIGIN` (default `http://localhost:5173`), port `3000`, Swagger, shutdown hooks.

## App-level providers (`src/app.module.ts`)
- `APP_GUARD` = `JwtAuthGuard` (everything protected by default — see `skills/authentication.md`).
- `APP_FILTER` = `HttpExceptionFilter` (see `skills/error-handling.md`).
- `APP_INTERCEPTOR` = Metrics, Logging, Timeout (`src/common/interceptors/`).
- `RequestIdMiddleware` on all routes (`X-Request-ID`).
- `ThrottlerModule`: `default` 100/min, `strict` 20/min. Not globally registered — apply per-endpoint: `@UseGuards(ThrottlerGuard) @Throttle({ strict: {...} })` (AI/research endpoints use `strict`).

Cross-cutting code: guards/decorators/interceptors/middleware in `src/common/`; shared services/clients/errors in `src/shared/`. See `docs/backend/services.md`, `docs/architecture.md`.
