import { useQuery, type UseQueryResult } from '@tanstack/react-query';

type UseCachedQueryOpts = {
  ttl?: number;
  enabled?: boolean;
  cacheKey?: string;
};

export function useCachedQuery<T>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<T>,
  { ttl, enabled = true }: UseCachedQueryOpts = {},
): UseQueryResult<T> {
  return useQuery({
    queryKey,
    queryFn: fetcher,
    enabled,
    staleTime: ttl,
    gcTime: ttl,
  });
}
