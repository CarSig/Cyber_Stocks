const PREFIX = 'lsc_v3_';

type CacheEntry<T> = { data: T; ts: number; ttl: number };

export function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - ts > ttl) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function lsSet<T>(key: string, data: T, ttl: number): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now(), ttl }));
  } catch {
    /* quota */
  }
}

export function withLsCache<T>(key: string, ttl: number | undefined, fetcher: () => Promise<T>): () => Promise<T> {
  return async () => {
    const cached = lsGet<T>(key);
    if (cached !== null) return cached;
    const data = await fetcher();
    if (ttl != null) lsSet(key, data, ttl);
    return data;
  };
}
