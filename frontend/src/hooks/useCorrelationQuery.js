import { useQuery } from "@tanstack/react-query";

export function useCorrelationQuery(key, fn, enabled) {
  return useQuery({
    queryKey: key,
    queryFn: fn,
    enabled,
    retry: false,
    placeholderData: (prev) => prev,
  });
}
