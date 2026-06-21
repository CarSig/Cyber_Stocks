---
name: cicd-pipeline
description: The CI/CD pipeline — GitHub Actions jobs, Dockerfiles, Oracle Cloud deploy, and the not-yet-built prod pieces.
---

# cicd-pipeline

## CI — `.github/workflows/ci.yml` (push to `master` + all PRs)
Three jobs (Node 25, Ubuntu):
- **backend** (`backend_nest/`): PostgreSQL 16 service → `npm ci` → typecheck (`tsc --noEmit`) → `npm test` with coverage (`--coverageThreshold` lines: **8**). Env: `NODE_ENV=test`, test `DATABASE_URL`, `JWT_SECRET`, Clerk secret, CORS origin.
- **frontend** (`frontend/`): `npm ci` → `format:check` → `lint` → `typecheck` → `test` (Vitest) → `build`. Sentry env vars for sourcemaps.
- **e2e** (`frontend/`): needs *frontend*; installs Chromium → `npx playwright test`. `continue-on-error: true` (won't block merge); uploads report on failure (7-day retention).

Reproduce CI locally: run those exact npm scripts in each package.

## Deploy — `.github/workflows/deploy.yml` (push to `master`)
- SSH to Oracle Cloud (`appleboy/ssh-action`, secrets `VM_HOST`/`VM_SSH_KEY`) → `git pull origin master` → `docker compose -f docker-compose.prod.yml up -d --build` → prune old images.

## Docker
- `backend_nest/Dockerfile` & `frontend/Dockerfile`: Node 20 Alpine, multi-stage (build shared + package; backend runtime `node dist/main` on 3000, frontend serves `dist/` via Nginx on 80).
- `docker-compose.yml` (repo root): **infra only** — prometheus, grafana, pgvector, rabbitmq, jaeger, redis.

## ⚠ Not yet built (referenced by deploy but missing)
- `docker-compose.prod.yml` (must add `backend`, `worker`, `content_analysis` services on top of infra).
- `Caddyfile` (SSL + reverse proxy). Also pending: `.env.production` on server, `prometheus.yml` target `backend:3000`, frontend `VITE_API_URL`.
- Strategy detail: `docs/plans/deployment.md` (Oracle Cloud ARM / Hetzner, Neon Postgres, Vercel for static FE).

## Commits
Conventional Commits (`feat(scope):`, `fix:`, `test:`, `chore:`, `refactor:`) — see `commands/commit.md`.
