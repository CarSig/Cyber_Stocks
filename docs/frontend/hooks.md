# Frontend Hooks

Custom hooks live in three places:

1. **`src/features/<name>/hooks/`** — feature-private (most hooks)
2. **`src/components/common/`** + **`src/components/feedback/`** — none currently; context hooks come from `src/context/`
3. **`src/hooks/`** — only cross-feature hooks live here (currently just `useCachedQuery`)

Convention: all data-fetching hooks use **TanStack React Query v5**. State is co-located in the same hook file. The **React Compiler is enabled** — do not add manual `useMemo` / `useCallback`.

Naming pattern: `useThing(args)` for queries, `useThingMutation()` for mutations, `useThingPage()` for page-composition hooks that aggregate multiple smaller hooks + UI state.

---

## Cross-feature

### `useCachedQuery` — [src/hooks/useCachedQuery.ts](../../frontend/src/hooks/useCachedQuery.ts)
Wraps React Query with `localStorage` persistence (TTL-based). Use when you want server data to survive a page refresh without a network round-trip. Returns `UseQueryResult<T>`.

### `useCorrelationMetrics` — [src/features/correlations/hooks/useCorrelationMetrics.ts](../../frontend/src/features/correlations/hooks/useCorrelationMetrics.ts)
Derives display metrics for a correlation + summary pair. Pure (no fetching). Returns `{ corrResult, hasCorrelation, strength, sentimentInfo }`. Used by `SummaryCard` and `SummaryListRow` in `components/common/data-display/`.

### `useCorrelationQuery` — [src/features/correlations/hooks/useCorrelationQuery.ts](../../frontend/src/features/correlations/hooks/useCorrelationQuery.ts)
Thin wrapper around `useQuery` for correlation endpoints: `enabled` gate, `retry: false`, preserves placeholder data on key change. Returns `UseQueryResult<T>`.

---

## Context hooks (`src/context/`)

| Hook | Returns | What it does |
|---|---|---|
| `useAuth` | `{ user, ready, logout }` | Auth state backed by Clerk + `localStorage`. Syncs Clerk session to backend JWT |
| `useNotifications` | `{ notifications, unread, markAllRead, dismiss, clearAll }` | In-app notifications list + SSE stream from `/notifications/stream?token=`. Persists to localStorage. Auto-reconnects |
| `useTheme` | `{ theme, toggle }` | Dark/light toggle. **Project is dark-only by design — do not use the toggle to ship a light mode.** See [ui.md](ui.md) |
| `useTimezone` | `{ timezone, setTimezone, fmtTime(isoUtc), toChartTime(isoUtc) }` | User timezone + chart time helpers |

---

## Feature: charts (`features/charts/hooks/` + `features/charts/`)

| Hook | Purpose |
|---|---|
| `useChart` | Core chart lifecycle: lightweight-charts instance, series creation/swap, plugin mount, data updates |
| `useChartShell` | Higher-level container setup for chart shells |
| `usePluginClickModal` | Manages modal state opened by plugin click events |
| `useChartRange` | Period selection (1D / 1W / 1M / …) + visible date range; anchors to last data point |
| `useChartResize` | Drag-to-resize + mouse-wheel resize. Returns `{ height, onHandleWheel, onHandleMouseDown }` |
| `useSyncRef` | Utility for syncing a ref across hook boundaries |

Legacy (`features/charts/hooks/legacy/`) — `useChartInstance`, `useOverlayRefs`. Replaced by `useChart` and the plugin system. Avoid in new code.

---

## Feature: tickers (`features/tickers/hooks/`)

| Hook | Endpoint(s) | Returns |
|---|---|---|
| `useStock(ticker, options?)` | `GET /ticker/:ticker` | `{ data, error, isPending, allQuotes, compareQuotes, periodAnalysis, news, summary, companies }`. Options: `compareTicker`, `period`. Analyses quotes for biggest same-day + next-day moves |
| `useCorrelation(tickerA, tickerB, lagDays?)` | `GET /correlation/:a/:b` | `CorrelationResult`. Enabled only when both tickers set |
| `useResearch(ticker)` | SSE `streamResearch()` | `{ sections, isPending, run() }`. Streams research sections; cancels previous on re-run |

---

## Feature: news (`features/news/hooks/`)

### Cyber-news queries (`useCyberNews.ts`)

| Hook | Endpoint |
|---|---|
| `useCyberNewsTickers(topic?)` | `GET /cyber-news/tickers` |
| `useCyberNewsSummary(ticker, topic?)` | `GET /cyber-news/:ticker/summary` |
| `useCyberNewsArticles(ticker, topic?)` | `GET /cyber-news/:ticker/articles` |
| `useCyberNewsTopics()` | `GET /cyber-news/topics` |
| `useCyberNewsRecent(limit = 50)` | `GET /cyber-news/recent` |
| `useCyberNewsCorrelations(lagDays = 1, topic?)` | `GET /cyber-news/correlations` |

### Page composition

`useCyberNewsPage()` — aggregates the six cyber-news queries + manages `selected`, `selectedTopic`, `lagDays`, `viewMode`. Returns all state + setters + indexed `correlationByTicker` map. Used by `pages/CyberNews/index.tsx`.

### News analysis

`useNewsAnalysis(ticker)` — combines a `useQuery` for stored sentiment scores with a `useMutation` to trigger analysis. Manages an `EventSource` stream to track per-article progress (`{ current, total }`). On stream completion, invalidates queries. Returns analysis data, mutation triggers, polling state, lag-days control, and optional correlation panel toggle.

---

## Feature: intelligence (`features/intelligence/hooks/`)

### Queries (`useIntelligence.ts`)

| Hook | Endpoint |
|---|---|
| `useEntityIntelligence(entityId, signal?)` | `GET /intelligence/entities/:entityId/articles` + `GET /intelligence/entities/:entityId/summary` |
| `useGlobalSignals()` | `GET /intelligence/signals` (filtered to count ≥ 5) |
| `useBackendEntities()` | `GET /intelligence/entities` |
| `useAllSentimentCorrelations(lagDays = 1, signal?)` | `GET /intelligence/sentiment-correlations` |
| `useUrgencyFilter(...)` | Local filter helper for urgency-tagged content |

### Page composition

`useIntelligencePage()` — aggregates the above + manages `selected` entity, `selectedSignal`, `lagDays`, `viewMode`, `signalsExpanded`. Deduplicates entities and filters signals by minimum count. Used by `pages/Intelligence/index.tsx`.

---

## Feature: threat-intel (`features/threat-intel/hooks/`)

| Hook | Purpose |
|---|---|
| `useThreatIntel(ticker)` | Per-ticker correlation for KEV + NVD + OTX. Returns `{ nvd, kev, otx, lagDays, setLagDays }` |
| `usePaginatedThreatIntel(source, filters)` | Paginated list (page size 50) with URL-synced filters (search, ransomware, severity, company). Returns `{ page, setPage, data, isPending, error, totalPages, companiesData }` |
| `useTickerThreatData(ticker)` | Aggregated threat data for a single ticker (used inside chart overlays) |
| `useFilterWithPageReset` | Utility — resets pagination to page 0 when filters change |

---

## Feature: social (`features/social/hooks/`)

`useTrump(ticker)` — fetches Trump posts + per-ticker correlation + lag impact. Returns `{ posts, correlation, correlationFetching, lagImpact, hasData, lagDays, setLagDays }`. Endpoints: `GET /trump/posts/:ticker`, `GET /trump/correlations/:ticker`.

(Reddit hooks live in `features/social/hooks/` similarly — see the folder.)

---

## Feature: edgar (`features/edgar/hooks/`)

| Hook | Endpoint |
|---|---|
| `useSecTickers()` | `GET /sec/tickers` |
| `useSecFiles(ticker)` | `GET /sec/files/:ticker` |
| `useSecCoverage(ticker)` | `GET /sec/coverage/:ticker` |
| `useSecSync()` | Mutation: `POST /sec/sync` with `{ ticker, dateFrom, dateTo, formTypes, force }`. Invalidates `sec-*` queries on success |
| `useSecFilingImpact(filingId)` | Computes price impact around a filing date |

---

## Feature: simulations (`features/simulations/hooks/`)

This feature has the largest hook surface — backtesting touches state, charting, P&L computation, and AI-driven entry/exit. Group below by role.

### Result + state

| Hook | Purpose |
|---|---|
| `useSimulation()` | Holds the latest backtest result. `{ result, onResult }` |
| `useIntradaySimState()` | All intraday sim UI state: date, timeframe, ticker, actions, side, value, shares, entry time, chart type, trade mode, selected event, peers display |
| `useSimResult(bars, actions, mode)` | Memoised P&L from inputs. Uses `runLongSimulation` / `runShortSimulation`. Returns `SimResult \| null` |

### Strategy + AI

| Hook | Purpose |
|---|---|
| `useApplyPreset()` | Apply a saved preset strategy to the current sim |
| `useAiSim()` | AI-driven entry/exit. Fetches bars, detects direction, applies strategy rules, dispatches actions. Exits resolve to one or more legs via `resolveExitLegs` — multi-day vol strategies (`vol-trail`, `vol-staged`) can scale out across several bars |
| `useSimulateAll()` | Batch run across multiple tickers/strategies. Returns results table |
| `useCombinationsAll()` | Generates entry/exit strategy combinations for batch testing |

### Chart integration

| Hook | Purpose |
|---|---|
| `useSimRefs()` | Refs for the sim chart + UI elements |
| `usePriceChart()` / `useDailyChart()` / `useIntradayChart()` | Render different bar types on the sim chart |
| `useSimChartClick()` | Adds a manual trade action from a chart click |
| `useCrosshairTracker()` | Crosshair position for time/price picking |
| `useChartPopover()` | Popover shown on chart interactions |
| `useActionMarkers()` / `useActionPopovers()` | Render and pop-over trade-action markers |
| `usePortfolioMarkers()` | Show portfolio state (position size, cash) as markers |
| `useEventFilters()` | Filter overlaid events (news / threat / Trump) on the chart |

### Misc

| Hook | Purpose |
|---|---|
| `useAddManualAction()` | UI handler for adding a manual action |
| `useRowSelect()` | Row selection in the sim result table |
| `useTextChange()` | Text input change handler (for parameter inputs) |
| `useExportSimPdf()` | Exports simulation results as PDF |

---

## Patterns

- **Query keys** are defined in each feature's `queryKeys.ts`. Don't inline them in hook bodies — keep them factory-based so invalidations stay consistent.
- **Page composition hooks** (`useCyberNewsPage`, `useIntelligencePage`, etc.) own page-level UI state and call the smaller per-resource hooks. Use this pattern when a page needs > 3 hooks.
- **Hooks reach for `src/api/core.ts`** indirectly via their feature's `api/` folder. Don't `fetch` directly — the Bearer + 401-logout behavior depends on going through `core.ts`.
- **No global hooks for navigation or routing helpers.** Use `react-router-dom`'s primitives directly inside components.
- **No `useMemo` / `useCallback`** — the React Compiler handles memoization. If you see "Existing memoization could not be preserved" warnings in lint, the manual hook is fighting the compiler — remove it.
