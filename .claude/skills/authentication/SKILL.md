---
name: authentication
description: Auth across the stack — Clerk + home-grown JWT, NestJS guards/decorators, and the SSE ?token= fallback.
---

# authentication

## Model
Clerk OAuth on the client → backend exchanges the Clerk session for a **home-grown JWT** (not Passport). `POST /auth/clerk` issues the JWT (`JWT_SECRET`, ≥32 chars, 7-day expiry); `GET /auth/me` returns the current user.

## Backend (NestJS)
- **Global** `APP_GUARD` = `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`) — every route is protected by default. Verifies `Authorization: Bearer <jwt>` via `AuthService.verifyToken()`, sets `req.user`.
- Decorators (`src/common/decorators/`):
  - `@Public()` — skip auth entirely.
  - `@AllowQueryToken()` — also accept `?token=<jwt>` (for SSE; see below).
  - `@CurrentUser()` — inject `req.user` into a handler param.
  - `@Roles(role)` — used with `RolesGuard`; `AdminGuard` checks `req.user.role === "admin"`.

## SSE `?token=` fallback
Browser `EventSource` can't set headers, so SSE routes are decorated `@Sse() @AllowQueryToken()` and `JwtAuthGuard` reads the JWT from the `?token=` query param. Lives in `jwt-auth.guard.ts`. Routes: `/api/v1/research/:ticker?token=`, `/api/v1/notifications/stream?token=`.

## Frontend
- JWT stored in localStorage (`auth_token`); `src/api/core.ts` attaches it as a Bearer header and throws on 401.
- For SSE, `EventSource` is opened with `?token=${encodeURIComponent(token)}` (see `NotificationContext`, `useResearch`).
- Auth surface: `AuthContext` → `useAuth()`; exchange endpoints in `src/api/auth.ts`. See `docs/backend/api.md` (auth tiers).
