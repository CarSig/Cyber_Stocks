import { useEffect, useRef } from 'react';
import { daysAgoString, todayString } from '@/components/organisms/charts/utils/dates.js';
import { useSyncRef } from './useOverlayRefs.js';

// Syncs the chart's visible time range with the period/visibleRange props.
// Uses skipRangeRef to suppress the outgoing range-change event during
// programmatic panning (avoids feedback loops).
export function useChartRange(chartRef, { period, visibleRange, onPeriodChange, onRangeChange }) {
  const skipRangeRef = useRef(false);
  const periodRef = useSyncRef(period);
  const visibleRangeRef = useSyncRef(visibleRange);
  const onPeriodChangeRef = useSyncRef(onPeriodChange);
  const onRangeChangeRef = useSyncRef(onRangeChange);

  // Wire range listener after chart is created. Depends on chartRef.current being
  // populated, which happens synchronously inside useChartInstance's effect body.
  // Both effects run after the same render, effects fire in call order, so this
  // runs after useChartInstance has set chartRef.current.
  useEffect(() => {
    const rangeTimer = setTimeout(() => {
      if (!chartRef.current) return;
      skipRangeRef.current = false;
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
        onRangeChangeRef.current?.({ from: range.from, to: range.to });
        const days = Math.round((new Date(range.to) - new Date(range.from)) / 86400000);
        onPeriodChangeRef.current?.(days);
      });
    }, 150);
    return () => clearTimeout(rangeTimer);
  }, [chartRef]); // re-wire when chart rebuilds — onPeriodChangeRef/onRangeChangeRef are stable refs // eslint-disable-line react-hooks/exhaustive-deps

  // Apply period/range changes after the chart exists.
  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (visibleRangeRef.current) {
      chartRef.current.timeScale().setVisibleRange(visibleRangeRef.current);
    } else if (periodRef.current === null) {
      chartRef.current.timeScale().fitContent();
    } else {
      chartRef.current.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current), to: todayString() });
    }
    setTimeout(() => {
      skipRangeRef.current = false;
    }, 150);
  }, [period, visibleRange, chartRef]); // eslint-disable-line react-hooks/exhaustive-deps
}
