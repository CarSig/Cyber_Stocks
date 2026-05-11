import { useQuery } from "@tanstack/react-query";
import { withLsCache } from "../utils/lsCache.js";

export function useCachedQuery(queryKey, fetcher, { ttl, enabled = true, cacheKey } = {}) {
  return useQuery({
    queryKey,
    queryFn: withLsCache(cacheKey ?? queryKey.join("_"), ttl, fetcher),
    enabled,
    staleTime: ttl,
    gcTime: ttl,
  });
}
