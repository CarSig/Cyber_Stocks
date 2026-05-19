import { useMemo } from 'react';
import type { SimResult } from '@/utils/sim';

export function usePortfolioMarkers(result: SimResult | null) {
  return useMemo(
    () =>
      result?.transactions.map((t) => ({ timestamp: t.timestamp, side: t.side, value: t.value, shares: t.shares })) ??
      [],
    [result],
  );
}
