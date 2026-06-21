# Frontend Components

The codebase is organised into **feature folders** under `src/features/`, **route-level pages** under `src/pages/`, and a small set of **cross-cutting components** under `src/components/`. The legacy atomic-design split (`atoms/`/`molecules/`/`organisms/`) is fully removed — see [migration_to_feature.md](migration_to_feature.md) for the migration history and the rules for what goes where.

For styling rules and shadcn usage see [ui.md](ui.md). For hook contracts see [hooks.md](hooks.md).

---

## Layout layers

```
src/
  pages/                # Route-level entry points. Thin wrappers that compose feature components.
  features/<name>/      # Domain code: components, hooks, api, types. Owned by one feature.
    components/         # Feature-private React components
    hooks/              # Feature-private hooks (data fetching + composition)
    api/                # Feature-private fetch wrappers
    ui/                 # Feature-scoped UI controls (not the global shadcn primitives)
    utils/              # Pure helpers owned by this feature
    types.ts, constants.ts, queryKeys.ts
  components/
    ui/                 # shadcn/ui primitives. Do not modify.
    common/             # Cross-feature presentational components (used by 2+ features)
    layout/             # Navbar + route boundaries (auth/admin guards)
  context/              # Auth, Notification, Theme, Timezone
  stores/               # Zustand stores for per-page UI state
  api/                  # Core fetch wrapper (Bearer + 401 auto-logout) + auth/admin endpoints
  hooks/                # Only cross-feature hooks (currently: useCachedQuery)
  types/                # Domain + store types
  utils/, lib/          # Cross-feature helpers (date, price, sentiment, lsCache)
```

The non-negotiable rule: **if a component is used by 2+ features, it lives in `src/components/common/`, not in either feature's folder.** A feature must not import from another feature's `components/`. See [migration_to_feature.md](migration_to_feature.md) > "Cross-feature components belong in `components/common/`".

---

## Pages and routes

All routes are defined in [src/App.tsx](../../frontend/src/App.tsx). Provider chain: `BrowserRouter → ThemeProvider → TimezoneProvider → AuthProvider → NotificationProvider`. Pages are lazy-loaded. `RouteBoundary` wraps protected routes; `AdminRouteBoundary` wraps admin-only routes; `ErrorBoundary` wraps all route content.

| Route | Page file | Auth | Description |
|---|---|---|---|
| `/` | `pages/Home.tsx` | protected | Landing dashboard with company list, multi-select chart, and `CorrelationMatrix` |
| `/:ticker` | `pages/Ticker/index.tsx` | protected | Per-ticker analysis page — 6 tabs (see below) + AI chat sidebar |
| `/intel` | `pages/Intel.tsx` | protected | Hub: 4 cards linking to threat-intel, socials, cyber-news, intelligence |
| `/threat-intel` | `pages/ThreatIntel/index.tsx` | protected | Threat-intel hub |
| `/threat-intel/list/kev` | `pages/ThreatIntel/ThreatIntelKev.tsx` | protected | KEV (Known Exploited Vulnerabilities) list |
| `/threat-intel/list/nvd` | `pages/ThreatIntel/ThreatIntelNvd.tsx` | protected | NVD list with filters |
| `/threat-intel/list/otx` | `pages/ThreatIntel/ThreatIntelOtx.tsx` | protected | OTX pulses |
| `/threat-intel/list/misp` | `pages/ThreatIntel/ThreatIntelMisp.tsx` | protected | MISP events |
| `/socials` | `pages/Socials/index.tsx` | protected | Socials hub |
| `/socials/truth-social` | `pages/Socials/SocialsTruthSocial.tsx` | protected | Truth Social posts list |
| `/socials/reddit` | `pages/Socials/SocialsReddit/index.tsx` | protected | Reddit posts list |
| `/intelligence` | `pages/Intelligence/index.tsx` | protected | NLP-extracted entities + per-entity sentiment + macro signals |
| `/cyber-news` | `pages/CyberNews/index.tsx` | protected | Cybersecurity news archive matched to tracked companies (topic filter) |
| `/events` | `pages/Events.tsx` | protected | Market events calendar |
| `/edgar-archive` | `pages/EdgarArchive/index.tsx` | protected | SEC EDGAR filings archive |
| `/research` | `pages/Research/index.tsx` | admin | Research hub — see [research-page.md](research-page.md) |
| `/research/insider-intel` | `pages/InsiderIntel/index.tsx` | admin | Insider trading data |
| `/research/edgar-uses` | `pages/Research/EdgarUses.tsx` | admin | EDGAR uses deep-dive |
| `/research/edgar-deeper` | `pages/Research/EdgarDeeper.tsx` | admin | EDGAR deeper analysis |
| `/research/edgar-entities` | `pages/Research/EdgarEntities.tsx` | admin | EDGAR entity extraction |
| `/research/edgar-8k-items` | `pages/Research/Edgar8kItems.tsx` | admin | 8-K item categorisation |
| `/research/gov-contracts` | `pages/Research/GovContracts.tsx` | admin | Government contracts |
| `/research/usa-spending` | `pages/Research/UsaSpending.tsx` | admin | USA spending data |
| `/admin` | `pages/AdminDashboard.tsx` | admin | Admin dashboard |
| `/admin/audit` | `pages/AdminAudit.tsx` | admin | Audit log |
| `/admin/feedback` | `pages/AdminFeedback.tsx` | admin | DOM-feedback dashboard |

### Ticker page tabs

The ticker page (`/:ticker`) is the most complex page. Six tabs in `pages/Ticker/tabs/`:

| Tab | File | Shows |
|---|---|---|
| Charts | `ChartsTab.tsx` | Stock chart with overlays (Trump posts, threat events, news sentiment, compare ticker, simulation actions) |
| Info | `InfoTab.tsx` | Yahoo Finance summary, biggest price-swing analysis, news section |
| Articles | `ArticlesTab.tsx` | News articles with per-article sentiment and "Analyze" trigger |
| Correlations | `CorrelationsTab.tsx` | Stock-to-stock + Trump + threat-intel + news correlation panels |
| Day Trade | `DayTradeTab.tsx` | Intraday strategy simulation |
| Simulation | `SimulationTab.tsx` | Long-term backtest with preset strategies + manual action editor |

Right sidebar: AI Chat (chat hook) with ticker context + simulation result injected. Page state is held in a Zustand store ([src/stores/tickerStore.ts](../../frontend/src/stores/tickerStore.ts)) — active tab, overlays, sidebar toggles, period, visible range.

---

## Feature folders

Each feature is self-contained. The folder is the source of truth — read the `components/` and `hooks/` indexes when you need the contract.

| Feature | Folder | Purpose |
|---|---|---|
| `charts` | `features/charts/` | lightweight-charts v5 wrapper with manual + auto modes, plugin architecture (sentiment, Trump overlay, threat-intel overlay, news, analysis markers, HV, ATR, compare, simulation actions, line series) |
| `correlations` | `features/correlations/` | Stock-to-stock, news, Trump, threat-intel correlation heatmaps + metrics. Hosts `useCorrelationMetrics` used by `SummaryCard` and `SummaryListRow` |
| `edgar` | `features/edgar/` | SEC EDGAR visualisation and 8-K item / entities / uses deep-dives |
| `intelligence` | `features/intelligence/` | Per-entity sentiment view + signal filter + sentiment-to-price correlation |
| `news` | `features/news/` | Per-ticker news rendering + cyber-news archive view + sentiment analysis trigger (SSE progress) |
| `simulations` | `features/simulations/` | Backtesting engine (long + intraday). Preset strategies, action editor, AI-driven entry/exit, chart popovers, batch simulation. Intraday event mode also renders `components/intraday/ContextPanel` (market/industry/company snapshots + actual-vs-predicted timeline from `GET /context/:ticker`; matching logic in `utils/contextCompare.ts`) |
| `social` | `features/social/` | Truth Social + Reddit post aggregation per ticker |
| `threat-intel` | `features/threat-intel/` | KEV / NVD / OTX / MISP tables with pagination + per-ticker correlation panels |
| `tickers` | `features/tickers/` | Ticker resolution, stock data hooks, research SSE, chat, summary |

Convention: a feature folder has any of `components/`, `hooks/`, `api/`, `ui/`, `utils/` it needs, plus `types.ts` / `constants.ts` / `queryKeys.ts` at the root. Some features have `model/` for reducers or strategy objects (e.g. `simulations/reducers/`).

---

## Common components (cross-feature)

Live in `src/components/common/` — used by 2+ features. Do not move these into a feature folder.

### `common/cards/`

| Component | Purpose |
|---|---|
| `BaseCard` | Variant-aware card container (`interactive`, `stats`, `default`) |
| `CardHeader` | Title + optional right slot, with `titleClassName` override |

### `common/data-display/`

| Component | Purpose |
|---|---|
| `SummaryCard` | Interactive sentiment-summary card. Used by `TickerCard` (news) and `EntityCard` (intelligence). Renders `StatRowSummary` + `SentimentCorrelationMetrics`, hooks into `useCorrelationMetrics` |
| `SummaryListRow` | List-row variant of `SummaryCard`. Renders `SummaryStats` (full stats grid + sentiment + correlation breakdown) |
| `SummaryStats` | Full stats block: `StatsGrid` + `StatSection`s for sentiment and correlation. Exports the `SummaryData` type |
| `SentimentCorrelationMetrics` | Compact two-metric row (Sentiment, Correlation) used inside `SummaryCard` |
| `StatRowSummary` | Article-count breakdown row (total / pos / neg / neutral) used by `SummaryCard` and `EntityDetailPanel` |
| `StatsGrid` | Generic `{label, value, tone}` grid. Distinct from the simulations `StatsGrid` under `features/simulations/components/entry-panel/` |
| `StatSection` | Labelled stat block with value, optional subtitle, optional children |
| `Stat` | Single labelled value with optional inline color |
| `SentimentBar` | Horizontal bar mapped from a `[-1, 1]` sentiment value |
| `CountBadge` | Numeric badge used in sidebars |
| `TagBadge` | Small categorical badge (topic / signal) |
| `Pagination` | Generic page navigation control |

### `common/feedback/`

| Component | Purpose |
|---|---|
| `ErrorBoundary` | React error boundary wrapping all route content |
| `LoadingSpinner` | Indeterminate spinner |
| `StateHandler` | Generic `{ isPending, error, data }` switcher |
| `NotificationBell` | Header bell + dropdown driven by `NotificationContext` SSE stream. Has a **List / By company** toggle; "By company" rolls up held notifications into one row per ticker (`MSFT: 2 news · 1 filing · +1.2%`) via `groupByCompany` |

### `common/filters/`

| Component | Purpose |
|---|---|
| `DatePicker` | Native date input. Intentionally NOT shadcn — see [ui.md](ui.md) "Rules of thumb" |
| `FilterBanner` | Active-filter banner shown above grids (e.g. "Filtered by topic: X — clear") |
| `FilterSelect` | Generic filter select wrapping shadcn `Select` |
| `ExpandableFilterSection` | Collapsible sidebar group with toggle + loading state |

### `common/layout/`

| Component | Purpose |
|---|---|
| `Page` | Standard page wrapper with title + description |
| `PageWithSidebar` | Two-column layout: left sidebar + main content |
| `LeftSidebar` | Standard left sidebar shell |
| `ItemListPage` | Generic shell shared by `Intelligence`, `CyberNews`, and other list pages. Composes `PageWithSidebar` + `LeftSidebar` + `FilterBanner` + `CorrelationSelector` + `ViewToggle` + grid/list rendering. Callers supply `sidebarContent`, `items`, `renderCard(item)`, `renderRow(item)`, `getItemKey(item)`, optional `rightPanel` and `detailPanel` |
| `DetailPanelOverlay` | Right-side drawer with title, close, scrollable body |
| `InspectHighlight` | DOM-feedback inspect overlay rendering |

### `components/layout/` (route shell)

| Component | Purpose |
|---|---|
| `Navbar` | Top nav with home link, ticker search, notification bell, user menu (logout, admin link if admin) |
| `ProtectedRoute` | Redirects to `/login` if no token |
| `AdminRoute` | Redirects to `/` if user is not admin |
| `RouteBoundary` | Suspense + ErrorBoundary wrapper for protected routes |
| `AdminRouteBoundary` | Same, plus admin role check |

---

## Context

| Context | Purpose |
|---|---|
| `AuthContext` | User + JWT, backed by Clerk + `localStorage`. Exposes `{ user, ready, logout }` |
| `NotificationContext` | SSE stream from `/notifications/stream?token=`. Exposes `{ notifications, byCompany, unread, markAllRead, dismiss, clearAll }`. `byCompany` is a per-ticker rollup derived from `notifications` (pure helper in `context/groupByCompany.ts`). Auto-reconnects |
| `ThemeContext` | Dark-only theme (do not add light mode — see [ui.md](ui.md)) |
| `TimezoneContext` | User timezone + `fmtTime` / `toChartTime` helpers for chart display |

---

## Stores (Zustand)

| Store | Purpose |
|---|---|
| `stores/tickerStore.ts` | Per-page UI state for `/:ticker`: active tab, overlay toggles, sidebar visibility, selected period, visible date range, compare ticker |

---

## Root-level shared

| Path | Purpose |
|---|---|
| `src/api/core.ts` | Base fetch wrapper. Attaches `Authorization: Bearer <token>` from `localStorage`. Auto-logs out on 401. **All feature API calls must go through this — don't fetch directly.** |
| `src/api/auth.ts` | Login / register / Clerk OAuth endpoints |
| `src/api/admin.ts` | Admin audit + feedback endpoints |
| `src/api/queryClient.ts` | TanStack React Query client configuration |
| `src/api/schema.d.ts`, `schema-client.ts` | Generated typed-API schemas |
| `src/hooks/useCachedQuery.ts` | Cross-feature: React Query wrapper with `localStorage` persistence (TTL-based) |
| `src/utils/{date,price,sentimentUtils,lsCache,indexBy}.ts` | Pure helpers used across features |
| `src/lib/{utils,inspect-dom-capture}.ts` | shadcn `cn()` helper; DOM feedback capture |
| `src/types/{domain,store,index}.ts` | Cross-feature TS types |
| `src/index.css` | Design tokens (CSS custom properties), Tailwind v4 import, shadcn globals |
| `src/App.css` | Layout-level CSS (page shells, sidebar, grid scaffolds) |

---

## Conventions you can't derive from the code

- **No `useMemo` / `useCallback`** — React Compiler handles memoization. See [ui.md](ui.md).
- **CSS classes over inline styles** unless the value is dynamic. See [ui.md](ui.md).
- **All API calls through `src/api/core.ts`** — don't reach for `fetch` directly. Bearer + 401 logout depend on it.
- **Feature folders never re-export to each other** — if you're importing from another feature, the component should be in `components/common/`.
- **Chart controls + `DatePicker` stay native** — do not migrate to shadcn.
