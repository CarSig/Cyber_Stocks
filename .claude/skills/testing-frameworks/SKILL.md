---
name: testing-frameworks
description: Test stack per package — Jest (backend), Vitest (frontend), Playwright (e2e). File locations and run commands.
---

# testing-frameworks

Three runners; pick by what you're testing.

## Backend — Jest (`backend_nest/`)
- Files: `src/**/*.spec.ts` (config in `package.json`: `testRegex .*\.spec\.ts$`, `rootDir src`, `ts-jest`, alias `^@/(.*)$ → src`, setup `src/test/setup-env.ts`).
- Unit: `*.service.spec.ts` + util specs (e.g. `shared/errors.spec.ts`, `modules/stock/stock.service.spec.ts`). Integration: `*.integration.spec.ts` (e.g. `auth/auth.integration.spec.ts`).
- Run: `npm test` (`jest --forceExit`) · `npm run test:coverage` · single file `npm test -- src/modules/stock/stock.service.spec.ts`.

## Frontend — Vitest (`frontend/`)
- Files: `src/**/*.test.ts(x)`, colocated. jsdom env, globals on (no importing `describe`/`it`/`expect`), setup `src/test/setup.ts` (`@testing-library/jest-dom`), pool `vmThreads`.
- Libraries: `@testing-library/react`, `user-event`. Mock with `vi.fn()` / `vi.stubGlobal()` (fetch/EventSource) — see `src/api/core.test.ts`, `src/context/NotificationContext.test.ts`.
- Run: `npm test` (`vitest run`) · `npm run test:watch` · single file `npx vitest run src/path/to/file.test.tsx`.

## E2E — Playwright (`frontend/`)
- Tests in `e2e/`, Chromium only, base URL `http://localhost:5173` (auto-starts `npm run dev`). Config `playwright.config.ts`.
- Run: `npm run test:e2e`. In CI it's `continue-on-error` (non-blocking).

## Rules
- **After any bug fix, add a regression test** to the nearest existing spec/test file before creating a new one.
- Don't leave throwaway `node -e` / scratch scripts — a Stop hook warns about this.
