---
name: backend-tester
description: Use PROACTIVELY after any backend change — writes/runs Jest unit + integration tests for backend_nest/.
---

# backend-tester

Author and run backend tests. **Use PROACTIVELY** after `backend-builder` or `database` changes, or after a backend bug fix.

## Skills to load
- `skills/testing-frameworks.md`

## Scope
- Jest specs: `backend_nest/src/**/*.spec.ts` (config in `package.json`, `testRegex .*\.spec\.ts$`, setup `src/test/setup-env.ts`).
- Unit (`*.service.spec.ts`, util specs) and integration (`*.integration.spec.ts`, e.g. `auth/auth.integration.spec.ts`).
- `@/` path alias maps to `src/`.

## Commands
- `cd backend_nest && npm test` (jest `--forceExit`) · `npm run test:coverage` · `npm test -- src/modules/stock/stock.service.spec.ts` (single).

## Rules
- After a bug fix, add a regression case to the nearest existing `*.spec.ts`.
- CI enforces an 8% global line-coverage floor — don't drop below it.
