import { useCallback, type RefObject } from 'react';
import { exportSimPdf } from '../utils';
import { simResultToExportArgs } from '@/utils/sim';
import type { SimResult } from '@/utils/sim';

type ChartRef = { ref: RefObject<HTMLDivElement | null>; label: string };

export function useExportSimPdf(ticker: string, result: SimResult | null, chartRefs: ChartRef[], timeLabel = 'Date') {
  return useCallback(() => {
    if (!result) return;
    const { stats, transactions } = simResultToExportArgs(result);
    exportSimPdf(
      ticker,
      stats,
      transactions,
      chartRefs.map((c) => ({ ref: c.ref.current, label: c.label })),
      timeLabel,
    );
  }, [result, ticker, chartRefs, timeLabel]);
}
