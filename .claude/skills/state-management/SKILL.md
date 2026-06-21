---
name: state-management
description: Client state in frontend/ — TanStack Query v5 for server data, Zustand for ticker UI state, React Context for global concerns.
---

# state-management

Three layers, each with a clear job:

## 1. Server state — TanStack Query v5
- Client config: `frontend/src/api/queryClient.ts` — defaults `staleTime: 5min`, `gcTime: 30min`, `retry: failureCount < 2` (skip retry on 400/401/404).
- **Query keys live in each feature's `queryKeys.ts`, never inlined** — enables consistent invalidation.
- All fetching via `useQuery`/`useMutation` over feature `api/` wrappers (which call `src/api/core.ts`). See `docs/frontend/hooks.md`.
- Representative hooks: `useStock(ticker)`, `useResearch(ticker)` (SSE), `useNewsAnalysis(ticker)`, `useCorrelationQuery()`, `useSimulation()`. Cross-feature wrapper: `src/hooks/useCachedQuery.ts` (see `skills/caching.md`).
- SSE events invalidate queries: `NotificationContext` invalidates `['ticker', ticker]` on stock updates.

## 2. UI state — Zustand
- Single store: `src/stores/tickerStore.ts` (type `TickerStore`). Holds per-page UI state for `/:ticker`: active tab, overlays, sidebar visibility, period, visible range, compare ticker.
- Use Zustand only for cross-component UI state; keep purely local state in `useState`.

## 3. Global concerns — React Context (`src/context/`)
- `AuthContext` → `useAuth()` returns `{ user, ready, logout }` (Clerk + localStorage JWT).
- `NotificationContext` → `useNotifications()` (SSE stream, auto-reconnect, localStorage persistence).
- `ThemeContext` (dark-only) · `TimezoneContext` (`fmtTime()`, `toChartTime()`).
- Provider chain in `src/App.tsx`: BrowserRouter → Theme → Timezone → Auth → Notification.
