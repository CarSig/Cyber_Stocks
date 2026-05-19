import { useEffect, useRef, useCallback } from 'react';
import type { IChartApi } from 'lightweight-charts';

export function useCrosshairTracker(
  chartRef: React.RefObject<{ chart: IChartApi } | null>,
  toIso: (time: unknown) => string,
  deps: React.DependencyList = [],
): () => string | null {
  const hoveredRef = useRef<string | null>(null);

  useEffect(() => {
    const chart = chartRef.current?.chart;
    if (!chart) return;

    const handler = (param: { time?: unknown }) => {
      hoveredRef.current = param.time ? toIso(param.time) : null;
    };

    chart.subscribeCrosshairMove(handler as Parameters<typeof chart.subscribeCrosshairMove>[0]);
    return () => {
      chart.unsubscribeCrosshairMove(handler as Parameters<typeof chart.unsubscribeCrosshairMove>[0]);
      hoveredRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRef, toIso, ...deps]);

  return useCallback(() => hoveredRef.current, []);
}
