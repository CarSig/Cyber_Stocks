# Feature-Based Migration Guide

The frontend is being migrated from atomic design (`atoms/` → `molecules/` → `organisms/`) to a feature-based folder structure under `src/features/`. This document defines the target structure, the rules for what moves where, and the step-by-step process for migrating each feature.

---

## Target folder structure

Each feature lives in `src/features/<name>/` with the following subfolders:

```
src/features/<name>/
  api/          — API call functions (fetch wrappers). Own definitions, not re-exports.
  components/   — React components owned exclusively by this feature
  hooks/        — React hooks owned exclusively by this feature
  model/        — Business logic, reducers, strategy objects
  ui/           — Generic UI controls scoped to this feature (selectors, toggles, etc.)
  utils/        — Pure functions: math, formatting, parsing, color utils
  constants.ts  — Feature-scoped constants (colors, option arrays, magic numbers)
  types.ts      — All types for this feature (domain types, prop types, hook return types)
  queryKeys.ts  — React Query key factories
```

Barrel `index.ts` files in each subfolder allow single-line imports:
```ts
import { CorrelationBox, CorrelationMatrix } from '@/features/correlations/components';
import { useCorrelationQuery } from '@/features/correlations/hooks';
```

---

## Rules: what moves where

| What | Destination | Notes |
|------|-------------|-------|
| API fetch functions for this feature | `api/index.ts` | Move full definition, not a re-export. Remove from `src/api/`. Update `src/api/index.ts` re-exports to point to the feature. |
| Organism components used only by this feature | `components/` | Move file, update all import sites |
| Test files | `components/` alongside the component | Move with the component |
| Shared UI controls scoped to this feature | `ui/` | e.g. lag selectors, view toggles |
| Hooks used only by this feature | `hooks/` | Move from `src/hooks/`. Update all import sites. |
| Generic hooks used by many features | stays in `src/hooks/` | Don't move shared hooks |
| Pure util functions owned by this feature | `utils/index.ts` | Extract from wherever they currently live (e.g. page utils files) |
| Formatting helpers scoped to this feature | `utils/index.ts` | e.g. `fmtPct` used only in correlation components |
| All type declarations for this feature | `types.ts` | Prop types, hook return types, domain wrappers — move out of component files |
| Inline constants (option arrays, color maps, magic strings) | `constants.ts` | Extract from component files |
| React Query key arrays | `queryKeys.ts` | Define key factories here |
| Shared types from `@algo/shared` | `types.ts` as re-exports | `export type { CorrelationResult } from '@algo/shared'` |

---

## What does NOT move

- **`src/components/ui/`** — shadcn/ui primitives, never move these
- **`src/utils/sentimentUtils.ts`**, **`src/utils/date.ts`**, etc. — cross-feature utilities, stay in `src/utils/`
- **`src/context/`** — shared React contexts
- **`src/types/domain.ts`** — shared type barrel
- **`src/pages/`** — route-level page components stay in pages; they import from features
- Hooks imported by 3+ features — leave in `src/hooks/` until there is a clear owner
- Molecule components shared across features — leave in `src/components/molecules/shared/`

### Cross-feature components belong in `components/common/`

If a component is used by **two or more features**, it does not live in either feature's `components/` folder — it lives under `src/components/common/<bucket>/` (e.g. `data-display/`, `layout/`, `filters/`). A feature should never import from another feature's `components/`. If you find that import, move the component to `components/common/` and update both call sites.

Example: `SummaryCard` and `SummaryListRow` are used by both `news` and `intelligence`, so they live in `src/components/common/data-display/`, not in either feature.

---

## Migration steps (per feature)

1. **Inventory** — list every file that belongs to the feature: components, hooks, utils, API calls, types, constants
2. **Create `types.ts`** — move all prop types, hook return types, and domain type wrappers out of component/hook files into `types.ts`; re-export shared types from `@algo/shared`
3. **Create `constants.ts`** — extract inline constant arrays and maps from component files
4. **Create `utils/index.ts`** — move pure functions (math, formatting, color) that are owned by this feature
5. **Create `api/index.ts`** — move API fetch function definitions here; remove from `src/api/<domain>.ts`; update `src/api/index.ts` to re-export from the feature
6. **Move components** — copy files to `components/`, update their internal imports to use `../types`, `../constants`, `../utils`, `../api`; create `components/index.ts` barrel
7. **Move hooks** — copy files to `hooks/`, update internal imports; create `hooks/index.ts` barrel
8. **Move ui controls** — copy to `ui/`, create `ui/index.ts` barrel
9. **Update all import sites** — pages, other components, other hooks that imported from the old locations
10. **Delete old files** — remove original files from `organisms/`, `src/hooks/`, `components/shared/`, etc.
11. **Verify** — `npm run lint` (zero new errors), run feature tests, smoke test in browser

---

## Completed migrations

| Feature | Status | Notes |
|---------|--------|-------|
| `correlations` | Done | `CorrelationBox`, `CorrelationMatrix`, `CorrelationControls`, `useCorrelationQuery`, `useCorrelationMetrics`, `pearsonLag`, `corrColor`, `fmtPct`, `getCorrelation`, `getCorrelationMatrix` |
| `charts` | Done | `StockChart`, `MultiChart`, `IntradayChart`, `SimPriceChart`, `VolatilityChart`, `SentimentHistogramChart`, `ChartModal`, chart hooks, utils, ui controls (`ChartToggleButton`, `ChartSep`, `ChartCard`, `PeriodButtons`), `getBars`, `getIntradayEvents` — `src/api/alpaca.ts` now re-exports from the feature |
| `news` | Done | `NewsSection`, `TickerDetailPanel`, `ArticleCard`, `ArticleHeader`, `ArticleMeta`, `StatsCard`, `TickerCard`, `TickerListRow`, `useNewsAnalysis`, `useCyberNews*`, `useCyberNewsPage`, all cyber-news and news API functions — `src/api/news.ts` and `src/api/cyber-news.ts` are now re-export shims; `src/hooks/useNewsAnalysis.ts` and `src/hooks/useCyberNews*.ts` are re-export shims. `SummaryCard`, `SummaryListRow`, `SummaryStats`, `SentimentCorrelationMetrics`, `StatsGrid`, `StatSection` previously lived here but were promoted to `src/components/common/data-display/` once `intelligence` started consuming them. `SignalsPanel`, `TopicsPanel`, `TopicsSidebar` were carried over from the old `pages/CyberNews/` extraction but never wired into the new `ItemListPage`-based layout and have been removed. |
| `threat-intel` | Done | `TiTable`, `MispTable/Row`, `NvdTable/Row/Filters`, `OtxPulseTable/Row`, `StatusCard`, `StatusCardContent`, `ThreatIntelCard`, `useThreatIntel`, `usePaginatedThreatIntel`, `useTickerThreatData` — `src/api/threat-intel.ts` and hook files are now re-export shims |
| `tickers` | Done | `Analysis`, `Chat`, `Summary`, `useStock`, `useCorrelation`, all stock API functions — `src/api/stock.ts` and `src/hooks/useStock.ts` are now re-export shims |
| `social` | Done | `SocialsTruthSocial`, `CommentNode`, `RedditPost`, `useTrump`, all trump API functions — `src/api/trump.ts` and `src/hooks/useTrump.ts` are now re-export shims |
| `intelligence` | Done | `EntityDetailPanel`, `ArticleDetail`, `EntityCorrelation`, `EntityCard`, `EntityListRow`, `SignalSidebar`, `useEntityIntelligence`, `useGlobalSignals`, `useBackendEntities`, `useAllSentimentCorrelations`, `useUrgencyFilter`, `useIntelligencePage` — `src/api/intelligence.ts` and hook files are now re-export shims. `StatRowSummary` previously lived here but was promoted to `src/components/common/data-display/` once `news` started consuming it. |
| `simulations` | Done | All 52 files moved wholesale — 3 top-level components, 10 sub-components, 19 hooks, 6 reducers, 9 utils, 2 preset files. `useSimulation` added to feature hooks. Pages updated to import from `@/features/simulations/`. |

---

## Pending migrations

None — all features migrated.

---

## Canonical exceptions

A few features intentionally deviate from the standard shape. Don't "fix" them.

- **`features/charts/`** — uses `core/` instead of `model/`. `charts/` is a chart framework (components + hooks + plugin types), not a data feature. `core/` exposes the public API surface (`ChartAuto`, `ChartManual`, `ChartPlugin`, plugin overlays). Treat it like a library, not a feature.
- **`features/sec/`** — uses `plugins/` instead of `ui/`. The files in `plugins/` are chart plugins implementing `ChartPlugin` from `charts/core`, not UI controls. The folder name reflects the contract.
- **`features/intelligence/`** — historically lacked `model/` and `ui/`. Empty `queryKeys.ts` and `types.ts` were added in 2026-05 to match the placeholder convention across the other features; `model/` and `ui/` will be added only when there is actual content to put there.

---

## Other src/ layout notes

These aren't features but follow conventions worth knowing:

- **`src/lib/`** — third-party-style modules and shadcn helpers. `inspect-dom-capture.ts` (vendor-style feedback widget) and `utils.ts` (shadcn `cn()`) live here. Don't put feature code here.
- **`src/stores/`** — global Zustand-style stores. Currently just `tickerStore.ts`. Don't put React contexts here (they go in `src/context/`).
- **`src/utils/`** — cross-feature pure utilities. Don't add `cn()`-style helpers here; those belong in `lib/`.
- **`src/pages/`** — route shells only. Page-specific components, hooks, and utils belong in the relevant `features/<x>/`. Don't add helper components to `pages/<X>/` — promote them to the feature instead. See the 2026-05 move of `pages/Ticker/CorrLagTable, TickerChat, TickerKPI, TickerWatchlist, WatchlistSparkline, buildChatContext, tickerUtils` → `features/tickers/{components,utils}/`.
- **Single-file pages** — if a page is just `index.tsx` with no siblings, keep it flat as `pages/Foo.tsx`. Only promote to a folder when there are sub-files (CSS, sub-components scoped to the page, etc.).
