---
name: react-components
description: How React components are structured and styled in frontend/ — feature folders, shadcn, Tailwind v4, React Compiler.
---

# react-components

## Feature-folder architecture
Components live in `frontend/src/features/<name>/` — `charts`, `correlations`, `edgar`, `news`, `simulations`, `social`, `threat-intel`, `tickers`, `insiders`, `intelligence`. Each feature is self-contained:
```
features/<name>/
  components/  hooks/  api/  ui/  utils/
  types.ts  constants.ts  queryKeys.ts
```
- **No cross-feature imports.** A feature never imports another feature's `components/` or `hooks/`. Shared code is promoted to `src/components/common/`.
- Cross-feature shared UI: `src/components/common/{cards,data-display,feedback,filters,layout}/` — e.g. `BaseCard`, `SummaryCard`, `ErrorBoundary`, `LoadingSpinner`, `StateHandler`, `Pagination`, `DatePicker`.
- Route shell: `src/components/layout/` (Navbar, ProtectedRoute, AdminRoute, RouteBoundary). Routes defined (lazy) in `src/App.tsx`.

## shadcn / styling
- shadcn primitives in `src/components/ui/` — **do not modify**. Do NOT migrate chart controls or `DatePicker` to shadcn (intentionally native).
- Tailwind v4 (via `@tailwindcss/vite`) + CSS variables (design tokens) in `src/index.css`. **Dark-only — do not add a light theme.**
- Inline styles only for genuinely dynamic values; static spacing/color/display go in Tailwind classes or CSS.

## React Compiler
Enabled in `vite.config.ts` (`babel-plugin-react-compiler`). **Do not add manual `useMemo`/`useCallback`** — the compiler memoizes. Watch for "Existing memoization could not be preserved" warnings.

## Conventions
- File extensions `.tsx` (components) / `.ts` (logic). Tests colocated as `*.test.tsx`.
- Page composition: when a page needs >3 hooks, aggregate them in a `usePageName()` hook (e.g. `useCyberNewsPage`).
- See `docs/frontend/components.md`, `docs/frontend/ui.md`, `docs/frontend/migration_to_feature.md`.
