import { useEffect, useRef, forwardRef } from 'react';
import { createChart, LineSeries, createSeriesMarkers } from 'lightweight-charts';
import type { Time } from 'lightweight-charts';

type HistoryPoint = { time: string; value: number };

type MarkerPoint = {
  time: string;
  side: string;
  value: number;
  shares: number;
};

type SimPortfolioChartProps = {
  history: HistoryPoint[];
  markers?: MarkerPoint[];
  // When true, time strings are HH:MM (ET) — convert to unix seconds for display
  intraday?: boolean;
};

// Convert HH:MM string to unix seconds using a fixed UTC base date.
// Using 1970-01-05 (Monday) as anchor so times are always positive and ascending.
function hmToUnix(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (4 * 86400) + h * 3600 + m * 60; // Jan 5 1970 00:00 UTC + HH:MM
}

function toTime(timeStr: string, intraday: boolean): Time {
  if (!intraday) return timeStr as `${number}-${number}-${number}`;
  return hmToUnix(timeStr) as unknown as Time;
}

function fmtVal(v: number) {
  return `$${v.toFixed(2)}`;
}

const SimPortfolioChart = forwardRef<HTMLDivElement, SimPortfolioChartProps>(
  function SimPortfolioChart({ history, markers = [], intraday = false }, outerRef) {
    const ref = useRef<HTMLDivElement>(null);

    function setRef(el: HTMLDivElement | null) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (outerRef && typeof outerRef === 'object') outerRef.current = el;
    }

    useEffect(() => {
      if (!history.length || !ref.current) return;
      const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

      const chart = createChart(ref.current, {
        width: ref.current.clientWidth,
        height: 220,
        layout: { background: { color: cv('--surface-0') || 'transparent' }, textColor: cv('--text-primary') || '#e5e7eb' },
        grid: { vertLines: { color: cv('--surface-3') || 'rgba(255,255,255,0.05)' }, horzLines: { color: cv('--surface-3') || 'rgba(255,255,255,0.05)' } },
        timeScale: { timeVisible: intraday, secondsVisible: false },
        localization: intraday
          ? {
              timeFormatter: (t: number) => {
                // t is unix seconds with fixed anchor; extract HH:MM
                const totalSeconds = t % 86400;
                const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
                const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
                return `${h}:${m}`;
              },
            }
          : {},
      });

      const series = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
      series.setData(history.map((p) => ({ time: toTime(p.time, intraday), value: p.value })));

      if (markers.length) {
        const ms = markers
          .map((m) => ({
            time: toTime(m.time, intraday),
            position: m.side === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
            color: m.side === 'buy' ? '#22c55e' : '#ef4444',
            shape: m.side === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
            text: m.side === 'buy' ? `B ${fmtVal(m.value)}` : `S ${m.shares.toFixed(2)}sh`,
          }))
          .sort((a, b) => (a.time < b.time ? -1 : 1));
        createSeriesMarkers(series, ms);
      }

      chart.timeScale().fitContent();
      const el = ref.current;
      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      return () => {
        ro.disconnect();
        chart.remove();
      };
    }, [history, markers, intraday]);

    return <div ref={setRef} className="chart-container" style={{ marginTop: '0.75rem' }} />;
  },
);

export default SimPortfolioChart;
