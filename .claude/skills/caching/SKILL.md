---
name: caching
description: Caching on both layers — React Query + localStorage on the frontend, Redis (ioredis) on the NestJS backend.
---

# caching

Two independent caches. Match the layer you're editing.

## Frontend
- **React Query** is the primary cache (`frontend/src/api/queryClient.ts`): `staleTime 5min`, `gcTime 30min`. Tune per-query via `staleTime` when data is more/less volatile; don't globally lower it.
- **localStorage persistence**: `src/hooks/useCachedQuery.ts` wraps React Query with TTL-based localStorage persistence for data that should survive a refresh.
- Other localStorage: `auth_token`/`auth_user` (AuthContext), `notifications` (NotificationContext). No service worker.
- Invalidate via query keys from the feature's `queryKeys.ts` — see `skills/state-management.md`.

## Backend
- **Redis via `ioredis`**, wrapped in `backend_nest/src/shared/cache.service.ts`. Primary API: `getOrSet<T>(key, ttlSeconds, fn)` — returns cached value or computes, caches, and returns. **Degrades gracefully**: if `REDIS_URL` is unset/unavailable, it just runs `fn` (no caching), so never assume the cache is present.
- **Key conventions** in `src/shared/cache-keys.ts`: `ticker:<name>`, `sparkline:<name>` (24h TTL), `history:<name>`, correlation matrix (7-day TTL).
- **Invalidation**: `cache.del(key)` or batch `invalidateTickerCacheKeys(cache, name)` — call it when `stock_quotes` or `company_news` for a ticker changes.
- `CacheModule` is `@Global()` — inject `CacheService` anywhere without importing the module.
