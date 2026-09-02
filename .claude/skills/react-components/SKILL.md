---
name: react-components
description: How React components are structured and styled in frontend/ — feature folders, shadcn, Tailwind v4, React Compiler.
---

# react-components

## Feature-folder architecture
Components live in `frontend/src/features/<name>/` — `charts`, `correlations`, `edgar`, `news`, `simulations`, `social`, `threat-intel`, `tickers`, `insiders`, `intelligence`. A feature's internal layout is roughly:
```
features/<name>/
  components/  hooks/  api/  utils/
  types.ts  constants.ts  queryKeys.ts   // ← not all present in every feature
```
- **Internal layout varies by feature** — `charts` and `correlations` are the fullest examples (they also have `ui/`, `queryKeys.ts`, `types.ts`, `constants.ts`). Most other features have only a subset (e.g. just `api.ts`/`hooks.ts`, keys inlined). Match the conventions already present in the feature you're editing rather than forcing the full template.
- **Avoid cross-feature imports** — promote shared code to `src/components/common/`. This is the intended rule but **not fully enforced**: a couple exist today (e.g. `features/news` imports `CorrelationBox` + `useCorrelationQuery` from `features/correlations`). Don't add new ones; prefer promotion.
- Cross-feature shared UI: `src/components/common/{cards,data-display,feedback,filters,layout}/` — e.g. `BaseCard`, `SummaryCard`, `ErrorBoundary`, `LoadingSpinner`, `StateHandler`, `Pagination`, `DatePicker`.
- Route shell: `src/components/layout/` (Navbar, ProtectedRoute, AdminRoute, RouteBoundary). Routes defined (lazy) in `src/App.tsx`.

## Pages layer (`src/pages/`)
Route-level pages compose features; they are NOT features themselves and may import feature components/hooks. Examples: `Home`, `Ticker`, `CyberNews`, `EdgarArchive`, `EdgarIncidents`, `Research`, `Socials`, `ThreatIntel`, `Intelligence`, `Insiders`, `InsiderIntel`, `Events`, `Intel`, and `Admin*` (Dashboard/Audit/Feedback). Page-aggregation hooks (e.g. `useCyberNewsPage`) bundle several feature hooks + UI state for one page. Rule of thumb: pages → features (one-way); features never import pages.

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
