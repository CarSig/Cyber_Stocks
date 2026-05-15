import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useCorrelationQuery<T>(
  key: readonly unknown[],
  fn: () => Promise<T>,
  enabled: boolean,
): UseQueryResult<T> {
  return useQuery({
    queryKey: key,
    queryFn: fn,
    enabled,
    retry: false,
    placeholderData: (prev) => prev,
  });
}
