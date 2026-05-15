import { daysAgoString, todayString } from "./dates.js";

export function attachResizeObserver(chart, containerRef) {
  const observer = new ResizeObserver(() => {
    if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
  });
  observer.observe(containerRef.current);
  return observer;
}

export function subscribeRangeChange(chart, skipRangeRef, { onRangeChange, onPeriodChange } = {}) {
  const timerId = setTimeout(() => {
    skipRangeRef.current = false;
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (skipRangeRef.current || !range) return;
      onRangeChange?.({ from: range.from, to: range.to });
      const days = Math.round((new Date(range.to) - new Date(range.from)) / 86400000);
      onPeriodChange?.(days);
    });
  }, 150);
  return timerId;
}

export function applyRange(chart, skipRangeRef, { period, visibleRange } = {}) {
  skipRangeRef.current = true;
  if (visibleRange) {
    try { chart.timeScale().setVisibleRange(visibleRange); } catch { chart.timeScale().fitContent(); }
  } else if (period === null) {
    chart.timeScale().fitContent();
  } else {
    try { chart.timeScale().setVisibleRange({ from: daysAgoString(period), to: todayString() }); } catch { chart.timeScale().fitContent(); }
  }
  setTimeout(() => { skipRangeRef.current = false; }, 150);
}
