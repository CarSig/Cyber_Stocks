const PREFIX = "lsc_v3_";

export function lsGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    if (Date.now() - ts > ttl) { localStorage.removeItem(PREFIX + key); return null; }
    return data;
  } catch { return null; }
}

export function lsSet(key, data, ttl) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now(), ttl })); } catch { /* quota */ }
}

export function withLsCache(key, ttl, fetcher) {
  return async () => {
    const cached = lsGet(key);
    if (cached !== null) return cached;
    const data = await fetcher();
    lsSet(key, data, ttl);
    return data;
  };
}
