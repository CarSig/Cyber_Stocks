import type { CacheService } from "./cache.service";

/**
 * Deletes every cache entry derived from a single company's stock data
 * (full ticker payload, sparkline, and raw history). Call after any write
 * that changes `stock_quotes` / `company_news` for that company so readers
 * don't serve stale data.
 */
export async function invalidateTickerCacheKeys(cache: CacheService, name: string): Promise<void> {
  await Promise.all([
    cache.del(`ticker:${name}`),
    cache.del(`sparkline:${name}`),
    cache.del(`history:${name}`),
  ]);
}
