import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { withLsCache } from '@/utils/lsCache';

type UseCachedQueryOpts = {
  ttl?: number;
  enabled?: boolean;
  cacheKey?: string;
};

export function useCachedQuery<T>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<T>,
  { ttl, enabled = true, cacheKey }: UseCachedQueryOpts = {},
): UseQueryResult<T> {
  return useQuery({
    queryKey,
    queryFn: withLsCache<T>(cacheKey ?? (queryKey as string[]).join('_'), ttl, fetcher),
    enabled,
    staleTime: ttl,
    gcTime: ttl,
  });
}
