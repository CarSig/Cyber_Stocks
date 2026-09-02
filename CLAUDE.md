# CLAUDE.md

Universal guidance for this repo. Domain detail lives in `.claude/skills/`; pick the agent in `.claude/agents/` that matches the work. Code is the source of truth; `/docs/` holds specs.

## Stack
React 19 + Vite (TS) frontend · NestJS + raw `pg` backend · Postgres (core + pgvector) · RabbitMQ · Redis · GitHub Actions CI → Oracle Cloud (Docker).

## Repo structure
| Path | Role |
|---|---|
| `backend_nest/` | **Active** NestJS API. All backend work here. |
| `frontend/` | React + Vite SPA. |
| `shared/` | Cross-package types (`@algo/shared`). |
| `data/` | Companies list (ticker → name). |
| `backend/` | **Legacy Fastify. DO NOT modify.** |
| `storage/` | Runtime data (ignored); lives in `backend_nest/storage/`. |

## Working rules
1. **Consult `/docs` first** before writing code (api, services, components, hooks, ui, data-flows, architecture).
2. **After fixing a bug, add a regression test** in the nearest `*.spec.ts` (backend) / `*.test.tsx` (frontend).
3. **Verify with real tests, not throwaways.** Prefer adding to an existing test file over scratch `node -e` scripts. (Stop hook warns when skipped.)
4. **Update docs after changing code.** API → `docs/backend/api.md`, service → `docs/backend/services.md`, component/hook → `docs/frontend/*.md`, data flow → `docs/data-flows.md`. Fix or mark `⚠ stale`; never leave silent rot.

## TypeScript
- Prefer `type` over `interface`; intersection (`A & B`) over `extends`. (`interface` inside `declare module` is fine.)

## Commands
- Backend (`backend_nest/`): `npm run start:dev` · `npm run build` · `npm test`
- Frontend (`frontend/`): `npm run dev` (5173) · `npm run build` · `npm run lint` · `npm test`
- Backend API: `http://localhost:3000/api/v1`. Copy `.env.example` → `.env` in both packages.

## Behavior expectations
Act as a skeptical senior engineer. Challenge weak design, surface edge cases / failure modes / security risks, ask when ambiguous, push back on overengineering (three similar lines beats a premature abstraction). Don't manufacture concerns to seem thorough — if it's fine, say so. Tone: direct, technical, no filler.

## Docs index
Full annotated index in `CLAUDE.old.md` (pre-restructure backup). Backend: `docs/backend/{api,services,environment}.md`. Frontend: `docs/frontend/{components,hooks,ui,migration_to_feature,research-page}.md`. System: `docs/{architecture,data-flows}.md`. Deploy: `docs/plans/deployment.md`.
