import { forwardRef, useMemo, useRef } from 'react';
import type { Time } from 'lightweight-charts';
import { ChartAuto, simActionsOverlay, type ChartPlugin, type ChartType } from '@/features/charts/core';
import type { MarkerPoint, HistoryPoint } from '@/features/charts/types';

type PortfolioChartProps = {
  history: HistoryPoint[];
  markers?: MarkerPoint[];
  /** When true, `time` strings are ISO timestamps shifted to ET; convert to
   *  unix seconds so the chart's time axis renders intraday HH:MM (ET). */
  intraday?: boolean;
};

/**
 * Portfolio-value line chart with optional buy/sell action markers.
 * Forwards a ref to the outer container div so callers (e.g. PDF export)
 * can capture it as an image.
 */
const PortfolioChart = forwardRef<HTMLDivElement, PortfolioChartProps>(function PortfolioChart(
  { history, markers = [], intraday = false },
  outerRef,
) {
  const localRef = useRef<HTMLDivElement>(null);

  function setRef(el: HTMLDivElement | null) {
    localRef.current = el;
    if (typeof outerRef === 'function') outerRef(el);
    else if (outerRef) outerRef.current = el;
  }

  const offset = useMemo(
    () => (intraday && history.length ? etOffset(history[0].time) : 0),
    [intraday, history],
  );

  const data = useMemo(
    () =>
      history.map((p) => ({
        time: toTime(p.time, intraday, offset),
        value: p.value,
      })),
    [history, intraday, offset],
  );

  const plugins: ChartPlugin[] = useMemo(
    () => (markers.length ? [simActionsOverlay({ markers, toTime: (ts) => toTime(ts, intraday, offset) })] : []),
    [markers, intraday, offset],
  );

  if (!history.length) return <div ref={setRef} className="chart-container chart-mt-75" />;

  return (
    <div ref={setRef} className="chart-mt-75">
      <ChartAuto
        data={data}
        defaultType="Line"
        availableTypes={['Line', 'Area']}
        plugins={plugins}
        hidePeriodControls
        resize={{ enabled: true }}
      />
    </div>
  );
});

export default PortfolioChart;

// --- time conversion helpers (lifted from the original imperative impl) ---

function toTime(timeStr: string, intraday: boolean, offset: number): Time {
  if (!intraday) return timeStr as unknown as Time;
  return (Math.floor(new Date(timeStr).getTime() / 1000) + offset) as unknown as Time;
}

/** Returns the ET offset in seconds for the given UTC ISO timestamp. */
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
