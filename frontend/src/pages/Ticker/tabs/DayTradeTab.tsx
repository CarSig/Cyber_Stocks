import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBars } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';
import { TIMEFRAMES, TIMEZONES, CHART_TYPES, COMPARE_COLORS } from '@/features/charts/utils';
import { useTimezone } from '@/context/TimezoneContext';
import { IntradayChart } from '@/features/charts/components';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function useAlpacaBars(ticker: string | undefined, date: string, timeframe: string) {
  return useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', ticker, date, timeframe],
    queryFn: () => getBars(ticker!, date, timeframe),
    enabled: Boolean(ticker && date),
    staleTime: 5 * 60 * 1000,
  });
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
  const { timezone } = useTimezone();
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
          <button className="alpaca-btn" type="submit">
            Load
          </button>
        </form>

        <div className="alpaca-chart-type-btns">
          {CHART_TYPES.General.map((ct) => (
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
              <IntradayChart bars={data.bars} compareBars={compareBars} chartType={chartType} />
            </>
          ) : (
            <p className="alpaca-status">No bars returned — market may have been closed on this date.</p>
          )}
        </>
      )}
    </div>
  );
}
