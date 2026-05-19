import type { IChartApi } from 'lightweight-charts';
import type { RefObject } from 'react';
import { daysAgoString, todayString } from './dates';

export function attachResizeObserver(
  chart: IChartApi,
  containerRef: RefObject<HTMLElement | null>,
  disposedRef: { current: boolean },
): ResizeObserver {
  const observer = new ResizeObserver(() => {
    if (!disposedRef.current && containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
  });
  if (containerRef.current) observer.observe(containerRef.current);
  return observer;
}

type RangeChangeCallbacks = {
  onRangeChange?: (range: { from: string; to: string }) => void;
  onPeriodChange?: (days: number) => void;
};

export function subscribeRangeChange(
  chart: IChartApi,
  skipRangeRef: RefObject<boolean>,
  { onRangeChange, onPeriodChange }: RangeChangeCallbacks = {},
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    skipRangeRef.current = false;
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (skipRangeRef.current || !range) return;
      onRangeChange?.({ from: String(range.from), to: String(range.to) });
      const days = Math.round(
        (new Date(String(range.to)).getTime() - new Date(String(range.from)).getTime()) / 86400000,
      );
      onPeriodChange?.(days);
    });
  }, 150);
}

type ApplyRangeOpts = {
  period?: number | null;
  visibleRange?: { from: string; to: string } | null;
};

export function applyRange(
  chart: IChartApi,
  skipRangeRef: RefObject<boolean>,
  { period, visibleRange }: ApplyRangeOpts = {},
): void {
  skipRangeRef.current = true;
  if (visibleRange) {
    try {
      chart
        .timeScale()
        .setVisibleRange(visibleRange as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]);
    } catch {
      chart.timeScale().fitContent();
    }
  } else if (period === null || period === undefined) {
    chart.timeScale().fitContent();
  } else {
    try {
      chart
        .timeScale()
        .setVisibleRange({ from: daysAgoString(period), to: todayString() } as Parameters<
          ReturnType<IChartApi['timeScale']>['setVisibleRange']
        >[0]);
    } catch {
      chart.timeScale().fitContent();
    }
  }
  setTimeout(() => {
    skipRangeRef.current = false;
  }, 150);
}
