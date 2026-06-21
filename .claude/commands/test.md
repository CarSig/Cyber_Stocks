---
name: test
description: Run the right test suite for the area you changed.
---

# /test

Pick the suite by what changed and run it from the correct package directory.

## Backend (`backend_nest/`) — Jest, `src/**/*.spec.ts`
- All: `npm test` (`jest --forceExit`)
- Coverage: `npm run test:coverage` (CI floor is 8% global lines)
- Single: `npm test -- src/modules/stock/stock.service.spec.ts`
- Watch: `npm run test:watch`

## Frontend (`frontend/`) — Vitest, `src/**/*.test.ts(x)`
- All: `npm test` (`vitest run`)
- Single: `npx vitest run src/path/to/file.test.tsx`
- Watch: `npm run test:watch`

## E2E (`frontend/`) — Playwright, `e2e/`
- `npm run test:e2e` (Chromium; auto-starts the dev server)

## Workflow
1. Identify the changed area → choose backend / frontend / e2e (or both for full-stack changes).
2. Prefer the **single-file** form while iterating; run the full package suite before committing.
3. **After a bug fix**, add a regression case to the nearest existing spec/test, then re-run it.
4. Don't leave throwaway `node -e`/scratch scripts — put coverage in a real `*.spec.ts` / `*.test.tsx` (a Stop hook warns otherwise).
