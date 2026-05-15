import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import type { ISeriesApi, SeriesType } from 'lightweight-charts';
import { getBars } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';
import '@/pages/Alpaca/Alpaca.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const TIMEFRAMES = [
  { label: '1 min', value: '1Min' },
  { label: '5 min', value: '5Min' },
  { label: '15 min', value: '15Min' },
  { label: '30 min', value: '30Min' },
  { label: '1 hour', value: '1Hour' },
];

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'ET (New York)', value: 'America/New_York' },
  { label: 'CT (Chicago)', value: 'America/Chicago' },
  { label: 'PT (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'GMT (London)', value: 'Europe/London' },
  { label: 'CET (Paris)', value: 'Europe/Paris' },
  { label: 'IST (Mumbai)', value: 'Asia/Kolkata' },
  { label: 'JST (Tokyo)', value: 'Asia/Tokyo' },
  { label: 'HKT (Hong Kong)', value: 'Asia/Hong_Kong' },
];

const CHART_TYPES = ['Candlestick', 'Line', 'Area'];

function useAlpacaBars(ticker: string | undefined, date: string, timeframe: string) {
  return useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', ticker, date, timeframe],
    queryFn: () => getBars(ticker!, date, timeframe),
    enabled: Boolean(ticker && date),
    staleTime: 5 * 60 * 1000,
  });
}

function getTzOffsetSeconds(ianaTimezone: string, referenceDate?: Date): number {
  const ref = referenceDate ?? new Date();
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
  return (parse(fmt(ianaTimezone)).getTime() - parse(fmt('UTC')).getTime()) / 1000;
}

function toTzTime(isoUtc: string, tzOffsetSeconds: number): number {
  return Math.floor(new Date(isoUtc).getTime() / 1000) + tzOffsetSeconds;
}

function buildSeriesData(bars: AlpacaBar[], tzOffsetSeconds: number) {
  return bars.map((b) => ({
    time: toTzTime(b.t, tzOffsetSeconds) as unknown as import('lightweight-charts').Time,
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    value: b.c,
  }));
}

type ChartWithSeriesRefs = {
  _seriesRefs?: ISeriesApi<SeriesType>[];
};

function addSeries(chart: ReturnType<typeof createChart>, chartType: string): ISeriesApi<SeriesType> {
  if (chartType === 'Line') {
    return chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
  }
  if (chartType === 'Area') {
    return chart.addSeries(AreaSeries, {
      lineColor: '#3b82f6',
      topColor: 'rgba(59,130,246,0.3)',
      bottomColor: 'rgba(59,130,246,0)',
    });
  }
  return chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderUpColor: '#22c55e',
    borderDownColor: '#ef4444',
    wickUpColor: '#22c55e',
    wickDownColor: '#ef4444',
  });
}

const COMPARE_COLORS = ['#f59e0b', '#a78bfa', '#f472b6', '#34d399'];

type CompareBarsEntry = { ticker: string; bars: AlpacaBar[] };

type IntradayChartProps = {
  bars: AlpacaBar[];
  compareBars: CompareBarsEntry[];
  timezone: string;
  chartType: string;
};

function IntradayChart({ bars, compareBars, timezone, chartType }: IntradayChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: 'var(--foreground, #e5e7eb)' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.1)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !bars?.length) return;

    chart.applyOptions({});
    const chartWithRefs = chart as unknown as ChartWithSeriesRefs;
    if (chartWithRefs._seriesRefs) {
      chartWithRefs._seriesRefs.forEach((s) => {
        try {
          chart.removeSeries(s);
        } catch {}
      });
    }
    chartWithRefs._seriesRefs = [];

    const tzOffset = getTzOffsetSeconds(timezone, new Date(bars[0].t));

    const mainSeries = addSeries(chart, chartType);
    const mainData = buildSeriesData(bars, tzOffset);
    mainSeries.setData(mainData as Parameters<typeof mainSeries.setData>[0]);
    chartWithRefs._seriesRefs.push(mainSeries);

    compareBars.forEach(({ ticker: cTicker, bars: cBars }, i) => {
      if (!cBars?.length) return;
      const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
      const scaleId = `compare_${i}`;
      const cSeries = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceScaleId: scaleId,
      });
      chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      const cTzOffset = getTzOffsetSeconds(timezone, new Date(cBars[0].t));
      cSeries.setData(cBars.map((b) => ({ time: toTzTime(b.t, cTzOffset) as unknown as import('lightweight-charts').Time, value: b.c })));
      cSeries.applyOptions({ title: cTicker });
      chartWithRefs._seriesRefs!.push(cSeries);
    });

    chart.timeScale().fitContent();
  }, [bars, compareBars, timezone, chartType]);

  return <div ref={containerRef} className="alpaca-chart-container" />;
}

type BarStatsProps = {
  bars: AlpacaBar[];
};

function BarStats({ bars }: BarStatsProps) {
  const open = bars[0].o;
  const close = bars[bars.length - 1].c;
  const high = Math.max(...bars.map((b) => b.h));
  const low = Math.min(...bars.map((b) => b.l));
  const volume = bars.reduce((s, b) => s + b.v, 0);
  const change = close - open;
  const changePct = ((change / open) * 100).toFixed(2);
  const changeColor = change >= 0 ? 'var(--color-green, #22c55e)' : 'var(--color-red, #ef4444)';

  return (
    <div className="alpaca-stats">
      {[
        { label: 'Open', value: `$${open.toFixed(2)}` },
        { label: 'Close', value: `$${close.toFixed(2)}` },
        { label: 'High', value: `$${high.toFixed(2)}`, color: 'var(--color-green, #22c55e)' },
        { label: 'Low', value: `$${low.toFixed(2)}`, color: 'var(--color-red, #ef4444)' },
        { label: 'Change', value: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct}%)`, color: changeColor },
        { label: 'Volume', value: volume.toLocaleString() },
        { label: 'Bars', value: bars.length },
      ].map(({ label, value, color }) => (
        <div key={label} className="alpaca-stat">
          <span className="alpaca-stat-label">{label}</span>
          <span className="alpaca-stat-value" style={color ? { color } : undefined}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

type CompareQueryProps = {
  ticker: string;
  date: string;
  timeframe: string;
  onData: (ticker: string, bars: AlpacaBar[]) => void;
};

function CompareQuery({ ticker, date, timeframe, onData }: CompareQueryProps) {
  const { data } = useAlpacaBars(ticker, date, timeframe);
  useEffect(() => {
    if (data) onData(ticker, data.bars ?? []);
  }, [data, ticker, onData]);
  return null;
}

type DayTradeTabProps = {
  ticker?: string;
  companies?: Record<string, string>;
};

export default function DayTradeTab({ ticker, companies }: DayTradeTabProps) {
  const [date, setDate] = useState(todayStr());
  const [timeframe, setTimeframe] = useState('1Min');
  const [timezone, setTimezone] = useState('America/New_York');
  const [chartType, setChartType] = useState('Candlestick');
  const [query, setQuery] = useState({ date: todayStr(), timeframe: '1Min' });
  const [compareTickers, setCompareTickers] = useState<string[]>([]);
  const [compareBarsMap, setCompareBarsMap] = useState<Record<string, AlpacaBar[]>>({});

  const { data, isPending, error } = useAlpacaBars(ticker, query.date, query.timeframe);

  const otherTickers = companies
    ? Object.values(companies)
        .filter((t) => t !== ticker)
        .sort()
    : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuery({ date, timeframe });
    setCompareBarsMap({});
  }

  function toggleCompare(t: string) {
    setCompareTickers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function handleCompareData(t: string, bars: AlpacaBar[]) {
    setCompareBarsMap((prev) => ({ ...prev, [t]: bars }));
  }

  const compareBars = compareTickers.map((t) => ({ ticker: t, bars: compareBarsMap[t] ?? [] }));
  const tfLabel = TIMEFRAMES.find((t) => t.value === query.timeframe)?.label ?? query.timeframe;
  const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone;

  return (
    <div className="day-trade-tab">
      {compareTickers.map((t) => (
        <CompareQuery key={t} ticker={t} date={query.date} timeframe={query.timeframe} onData={handleCompareData} />
      ))}

      <div className="alpaca-controls">
        <form className="alpaca-form" onSubmit={handleSubmit}>
          <input
            className="alpaca-input"
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
          />
          <select className="alpaca-input" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select className="alpaca-input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button className="alpaca-btn" type="submit">
            Load
          </button>
        </form>

        <div className="alpaca-chart-type-btns">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct}
              className={`alpaca-type-btn${chartType === ct ? ' alpaca-type-btn--active' : ''}`}
              onClick={() => setChartType(ct)}
              type="button"
            >
              {ct}
            </button>
          ))}
        </div>
      </div>

      {otherTickers.length > 0 && (
        <div className="alpaca-compare">
          <span className="alpaca-compare-label">Compare:</span>
          <div className="alpaca-compare-tickers">
            {otherTickers.map((t) => {
              const active = compareTickers.includes(t);
              const color = active ? COMPARE_COLORS[compareTickers.indexOf(t) % COMPARE_COLORS.length] : undefined;
              return (
                <button
                  key={t}
                  type="button"
                  className={`alpaca-compare-btn${active ? ' alpaca-compare-btn--active' : ''}`}
                  style={active ? { borderColor: color, color } : undefined}
                  onClick={() => toggleCompare(t)}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      {data && (
        <>
          <div className="alpaca-chart-header">
            <span className="alpaca-chart-symbol">{data.symbol}</span>
            <span className="alpaca-chart-date">{query.date}</span>
            <span className="alpaca-chart-timeframe">
              {tfLabel} · {tzLabel}
            </span>
            {compareTickers.length > 0 && (
              <span className="alpaca-chart-timeframe">vs {compareTickers.join(', ')}</span>
            )}
          </div>
          {data.bars?.length > 0 ? (
            <>
              <BarStats bars={data.bars} />
              <IntradayChart bars={data.bars} compareBars={compareBars} timezone={timezone} chartType={chartType} />
            </>
          ) : (
            <p className="alpaca-status">No bars returned — market may have been closed on this date.</p>
          )}
        </>
      )}
    </div>
  );
}
