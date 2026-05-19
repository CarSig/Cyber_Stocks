import { useEffect, useRef, type RefObject } from 'react';
import type { IChartApi } from 'lightweight-charts';
import { daysAgoString, todayString } from '../utils/dates';
import { useSyncRef } from './useOverlayRefs';

type UseChartRangeOpts = {
  period?: number | null;
  visibleRange?: { from: string; to: string } | null;
  onPeriodChange?: (days: number) => void;
  onRangeChange?: (range: { from: string; to: string }) => void;
};

export function useChartRange(
  chartRef: RefObject<IChartApi | null>,
  { period, visibleRange, onPeriodChange, onRangeChange }: UseChartRangeOpts,
): void {
  const skipRangeRef = useRef(false);
  const periodRef = useSyncRef(period);
  const visibleRangeRef = useSyncRef(visibleRange);
  const onPeriodChangeRef = useSyncRef(onPeriodChange);
  const onRangeChangeRef = useSyncRef(onRangeChange);

  useEffect(() => {
    const rangeTimer = setTimeout(() => {
      if (!chartRef.current) return;
      skipRangeRef.current = false;
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
        onRangeChangeRef.current?.({ from: String(range.from), to: String(range.to) });
        const days = Math.round(
          (new Date(String(range.to)).getTime() - new Date(String(range.from)).getTime()) / 86400000,
        );
        onPeriodChangeRef.current?.(days);
      });
    }, 150);
    return () => clearTimeout(rangeTimer);
  }, [chartRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (visibleRangeRef.current) {
      try {
        chartRef.current
          .timeScale()
          .setVisibleRange(
            visibleRangeRef.current as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0],
          );
      } catch {
        chartRef.current.timeScale().fitContent();
      }
    } else if (periodRef.current === null || periodRef.current === undefined) {
      chartRef.current.timeScale().fitContent();
    } else {
      try {
        chartRef.current.timeScale().setVisibleRange({
          from: daysAgoString(periodRef.current),
          to: todayString(),
        } as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]);
      } catch {
        chartRef.current.timeScale().fitContent();
      }
    }
    setTimeout(() => {
      skipRangeRef.current = false;
    }, 150);
  }, [period, visibleRange, chartRef]); // eslint-disable-line react-hooks/exhaustive-deps
}
