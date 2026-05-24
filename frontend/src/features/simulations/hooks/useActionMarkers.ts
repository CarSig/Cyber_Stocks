import { useEffect } from 'react';
import { createSeriesMarkers } from 'lightweight-charts';
import type { ISeriesApi, SeriesType } from 'lightweight-charts';
import { fmtMarkerText } from '@/utils/sim';
import type { Side } from '@/utils/sim';

type MarkerAction = {
  timestamp?: string;
  time?: string;
  date?: string;
  side: Side;
  value: number | string;
};

/**
 * Syncs action markers onto a chart series.
 * Works for both intraday (timestamp-based) and long-term (date-based) actions.
 */
export function useActionMarkers(
  chartRef: React.RefObject<{ series: ISeriesApi<SeriesType> } | null>,
  actions: MarkerAction[],
) {
  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;

    const markers = actions
      .filter((a) => {
        const key = a.timestamp ?? a.date;
        return key && !isNaN(new Date(key).getTime());
      })
      .map((a) => {
        const key = a.timestamp ?? a.date!;
        const isEntry = a.side === 'buy' || a.side === 'short';
        return {
          time: Math.floor(new Date(key).getTime() / 1000) as unknown as import('lightweight-charts').Time,
          position: isEntry ? ('belowBar' as const) : ('aboveBar' as const),
          color:
            a.side === 'buy' ? '#22c55e' : a.side === 'sell' ? '#ef4444' : a.side === 'short' ? '#f97316' : '#60a5fa',
          shape: isEntry ? ('arrowUp' as const) : ('arrowDown' as const),
          text: fmtMarkerText(a.side, Number(a.value)),
        };
      })
      .sort((a, b) => (a.time < b.time ? -1 : 1));

    createSeriesMarkers(ref.series, markers);
  }, [actions, chartRef]);
}
