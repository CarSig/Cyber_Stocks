import { useEffect, useRef, forwardRef } from 'react';
import { createChart, LineSeries, createSeriesMarkers } from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import type { MarkerPoint, HistoryPoint } from '@/components/organisms/charts/utils/types';

type PortfolioChartProps = {
  history: HistoryPoint[];
  markers?: MarkerPoint[];
  // When true, time strings are HH:MM (ET) — convert to unix seconds for display
  intraday?: boolean;
};

function etOffset(isoUtc: string): number {
  const ref = new Date(isoUtc);
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(ref);
  const parse = (s: string) => {
    const [date, time] = s.split(', ');
    const [y, mo, d] = date.split('-');
    const [h, mi, se] = time.split(':');
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
  };
  return (parse(fmt('America/New_York')).getTime() - parse(fmt('UTC')).getTime()) / 1000;
}

function toTime(timeStr: string, intraday: boolean, offset: number): Time {
  if (!intraday) return timeStr as `${number}-${number}-${number}`;
  return (Math.floor(new Date(timeStr).getTime() / 1000) + offset) as unknown as Time;
}

function fmtVal(v: number) {
  return `$${v.toFixed(2)}`;
}

const PortfolioChart = forwardRef<HTMLDivElement, PortfolioChartProps>(function PortfolioChart(
  { history, markers = [], intraday = false },
  outerRef,
) {
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
      layout: {
        background: { color: cv('--surface-0') || 'transparent' },
        textColor: cv('--text-primary') || '#e5e7eb',
      },
      grid: {
        vertLines: { color: cv('--surface-3') || 'rgba(255,255,255,0.05)' },
        horzLines: { color: cv('--surface-3') || 'rgba(255,255,255,0.05)' },
      },
      timeScale: { timeVisible: intraday, secondsVisible: false },
      localization: intraday
        ? {
            timeFormatter: (t: number) => {
              // t is real unix seconds shifted to ET; format as HH:MM ET
              return new Date(t * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC',
              });
            },
          }
        : {},
    });

    const offset = intraday && history.length ? etOffset(history[0].time) : 0;

    const series = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
    series.setData(history.map((p) => ({ time: toTime(p.time, intraday, offset), value: p.value })));

    if (markers.length) {
      const ms = markers
        .map((m) => ({
          time: toTime(m.timestamp, intraday, offset),
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
    let disposed = false;
    const ro = new ResizeObserver(() => {
      if (!disposed) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);
    return () => {
      disposed = true;
      ro.disconnect();
      chart.remove();
    };
  }, [history, markers, intraday]);

  return <div ref={setRef} className="chart-container chart-mt-75" />;
});

export default PortfolioChart;
