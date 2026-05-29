import { useEffect, useRef, type RefObject } from 'react';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { todayString } from '../utils/dates';
import { useSyncRef } from './useSyncRef';

/** Right-anchor for period buttons = the last data point on the primary
 *  series. "1M" always means "last 30 days of data", regardless of where
 *  the user has panned. Falls back to today if no series ref / no data. */
function chartAnchorDate(series: ISeriesApi<SeriesType> | null): string {
  if (!series) return todayString();
  const data = series.data();
  const last = data[data.length - 1];
  if (!last) return todayString();
  return String(last.time);
}

function daysBefore(anchor: string, days: number): string {
  const d = new Date(anchor);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Trailing debounce (ms) before a pan/zoom is pushed to shared range state. */
const EMIT_DEBOUNCE_MS = 5;

type UseChartRangeOpts = {
  period?: number | null;
  visibleRange?: { from: string; to: string } | null;
  onPeriodChange?: (days: number) => void;
  onRangeChange?: (range: { from: string; to: string }) => void;
};

export function useChartRange(
  chartRef: RefObject<IChartApi | null>,
  { period, visibleRange, onPeriodChange, onRangeChange }: UseChartRangeOpts,
  primarySeriesRef?: RefObject<ISeriesApi<SeriesType> | null>,
): void {
  const skipRangeRef = useRef(false);
  const periodRef = useSyncRef(period);
  const visibleRangeRef = useSyncRef(visibleRange);
  const onPeriodChangeRef = useSyncRef(onPeriodChange);
  const onRangeChangeRef = useSyncRef(onRangeChange);
  // Trailing-debounce the range emission so a fast pan/zoom doesn't push a new
  // shared-state value (and re-render every follower chart) on every event —
  // we emit once the user pauses. The chart being driven moves freely meanwhile.
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const rangeTimer = setTimeout(() => {
      if (!chartRef.current) return;
      skipRangeRef.current = false;
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
        const from = String(range.from);
        const to = String(range.to);
        if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
        emitTimerRef.current = setTimeout(() => {
          emitTimerRef.current = null;
          onRangeChangeRef.current?.({ from, to });
          const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
          onPeriodChangeRef.current?.(days);
        }, EMIT_DEBOUNCE_MS);
      });
    }, 150);
    return () => {
      clearTimeout(rangeTimer);
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
    };
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
        const anchor = chartAnchorDate(primarySeriesRef?.current ?? null);
        chartRef.current.timeScale().setVisibleRange({
          from: daysBefore(anchor, periodRef.current),
          to: anchor,
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
