import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { getBars } from '@/api/alpaca.js';
import Page from '@/components/atoms/Page.jsx';
import './Alpaca.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function useAlpacaBars(ticker, date) {
  return useQuery({
    queryKey: ['alpaca-bars', ticker, date],
    queryFn: () => getBars(ticker, date),
    enabled: Boolean(ticker && date),
    staleTime: 5 * 60 * 1000,
  });
}

function IntradayChart({ bars }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

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

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !bars?.length) return;

    const data = bars.map((b) => ({
      time: Math.floor(new Date(b.t).getTime() / 1000),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
    }));

    seriesRef.current.setData(data);
    chartRef.current.timeScale().fitContent();
  }, [bars]);

  return <div ref={containerRef} className="alpaca-chart-container" />;
}

function BarStats({ bars }) {
  if (!bars?.length) return null;

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
      <div className="alpaca-stat">
        <span className="alpaca-stat-label">Open</span>
        <span className="alpaca-stat-value">${open.toFixed(2)}</span>
      </div>
      <div className="alpaca-stat">
        <span className="alpaca-stat-label">Close</span>
        <span className="alpaca-stat-value">${close.toFixed(2)}</span>
      </div>
      <div className="alpaca-stat">
        <span className="alpaca-stat-label">High</span>
        <span className="alpaca-stat-value" style={{ color: 'var(--color-green, #22c55e)' }}>
          ${high.toFixed(2)}
        </span>
      </div>
      <div className="alpaca-stat">
        <span className="alpaca-stat-label">Low</span>
        <span className="alpaca-stat-value" style={{ color: 'var(--color-red, #ef4444)' }}>
          ${low.toFixed(2)}
        </span>
      </div>
      <div className="alpaca-stat">
        <span className="alpaca-stat-label">Change</span>
        <span className="alpaca-stat-value" style={{ color: changeColor }}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)} ({changePct}%)
        </span>
      </div>
      <div className="alpaca-stat">
        <span className="alpaca-stat-label">Volume</span>
        <span className="alpaca-stat-value">{volume.toLocaleString()}</span>
      </div>
      <div className="alpaca-stat">
        <span className="alpaca-stat-label">Bars</span>
        <span className="alpaca-stat-value">{bars.length}</span>
      </div>
    </div>
  );
}

export default function Alpaca() {
  const [ticker, setTicker] = useState('AAPL');
  const [date, setDate] = useState(todayStr());
  const [query, setQuery] = useState({ ticker: 'AAPL', date: todayStr() });

  const { data, isPending, error } = useAlpacaBars(query.ticker, query.date);

  function handleSubmit(e) {
    e.preventDefault();
    setQuery({ ticker: ticker.toUpperCase().trim(), date });
  }

  return (
    <Page>
      <div className="alpaca-page">
        <div className="alpaca-header">
          <h2 className="alpaca-title">Intraday Chart</h2>
          <form className="alpaca-form" onSubmit={handleSubmit}>
            <input
              className="alpaca-input"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="Ticker"
              maxLength={10}
            />
            <input
              className="alpaca-input"
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
            />
            <button className="alpaca-btn" type="submit">
              Load
            </button>
          </form>
        </div>

        {isPending && <p className="alpaca-status">Loading…</p>}
        {error && <p className="alpaca-status alpaca-error">{error.message}</p>}

        {data && (
          <>
            <div className="alpaca-chart-header">
              <span className="alpaca-chart-symbol">{data.symbol}</span>
              <span className="alpaca-chart-date">{query.date}</span>
              <span className="alpaca-chart-timeframe">1-minute bars</span>
            </div>
            <BarStats bars={data.bars} />
            {data.bars?.length > 0 ? (
              <IntradayChart bars={data.bars} />
            ) : (
              <p className="alpaca-status">No bars returned — market may have been closed on this date.</p>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
