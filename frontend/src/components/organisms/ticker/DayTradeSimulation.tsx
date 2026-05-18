import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, AreaSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { getBars } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SimToolbar from './sim/SimToolbar';
import SimManualEntry from './sim/SimManualEntry';
import SimResults from './sim/SimResults';
import { exportSimPdf } from './sim/simExportPdf';
import { useSimTextSync } from './sim/useSimTextSync';
import { DateUtils } from '@/utils/date';
import { PriceUtils } from '@/utils/price';
import { MarketUtils } from '@/utils/market';

const DAYTRADE_PRESETS: Record<string, { time: string; side: 'buy' | 'sell'; value: number }[]> = {
  'Open & Close': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '15:45', side: 'sell', value: 100 },
  ],
  'Buy open, sell mid': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '12:00', side: 'sell', value: 100 },
  ],
  'Morning momentum': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '10:00', side: 'sell', value: 50 },
    { time: '10:30', side: 'sell', value: 100 },
  ],
  'Scalp open': [
    { time: '09:31', side: 'buy', value: 100 },
    { time: '09:45', side: 'sell', value: 100 },
  ],
  'Afternoon fade': [
    { time: '13:00', side: 'buy', value: 100 },
    { time: '15:30', side: 'sell', value: 100 },
  ],
};

import type { Side, Action, Transaction, SimResult } from '@/utils/sim';
import { runShortSimulation, simResultToExportArgs } from '@/utils/sim';

function runSimulation(bars: AlpacaBar[], actions: Action[], startShares = 0): SimResult {
  const sorted = [...actions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const firstOpen = bars[0]?.o ?? 0;
  let shares = startShares;
  let totalInvested = startShares * firstOpen;
  let cashWithdrawn = 0;
  const transactions: Transaction[] = [];
  const portfolioHistory: { time: string; value: number }[] = [];

  for (const bar of bars) {
    const price = bar.c;
    const barTime = bar.t;
    for (const act of sorted) {
      if (act.timestamp > barTime) continue;
      if (transactions.some((t) => t.time === DateUtils.fmtTime(act.timestamp) && t.side === act.side)) continue;
      if (act.side === 'buy') {
        const bought = act.value / price;
        shares += bought;
        totalInvested += act.value;
        transactions.push({ time: DateUtils.fmtTime(act.timestamp), timestamp: act.timestamp, side: 'buy', price, shares: bought, value: act.value, sharesAfter: shares, portfolioValue: shares * price });
      } else {
        const pct = Math.min(act.value, 100) / 100;
        const sold = shares * pct;
        const proceeds = sold * price;
        shares -= sold;
        cashWithdrawn += proceeds;
        transactions.push({ time: DateUtils.fmtTime(act.timestamp), timestamp: act.timestamp, side: 'sell', price, shares: sold, value: proceeds, sharesAfter: shares, portfolioValue: shares * price });
      }
    }
    portfolioHistory.push({ time: barTime, value: shares * price });
  }

  const lastPrice = bars.at(-1)?.c ?? 0;
  const sharesValue = shares * lastPrice;
  const profit = sharesValue + cashWithdrawn - totalInvested;
  const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return { transactions, portfolioHistory, totalInvested, cashWithdrawn, finalShares: shares, sharesValue, profit, profitPct };
}


let nextActionId = 1;

type ChartRef = { chart: IChartApi; candleSeries: ISeriesApi<SeriesType> } | null;

export default function DayTradeSimulation({ ticker }: { ticker: string }) {
  const [date, setDate] = useState(() => DateUtils.lastWeekday(DateUtils.todayStr()));
  const [timeframe, setTimeframe] = useState('5Min');
  const [query, setQuery] = useState(() => ({ date: DateUtils.lastWeekday(DateUtils.todayStr()), timeframe: '5Min' }));
  const [actions, setActions] = useState<Action[]>([]);
  const [nextSide, setNextSide] = useState<Side>('buy');
  const [value, setValue] = useState('100');
  const [startShares, setStartShares] = useState('0');
  const [manualTime, setManualTime] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick'>('line');
  const [tradeMode, setTradeMode] = useState<'long' | 'short'>('long');

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartRef>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const nextSideRef = useRef<Side>(nextSide);
  const valueRef = useRef<string>(value);
  const tradeModeRef = useRef<'long' | 'short'>(tradeMode);
  useEffect(() => { nextSideRef.current = nextSide; }, [nextSide]);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { tradeModeRef.current = tradeMode; }, [tradeMode]);

  const { textValue, setTextValue, handleTextChange, actionsToText } = useSimTextSync<Action>({
    actions,
    toTextAction: (a) => ({ label: a.time, side: a.side, value: a.value }),
    parseTextAction: (label, num) => {
      const side: Side = num > 0 ? 'buy' : 'sell';
      const val = Math.min(side === 'sell' ? 100 : Infinity, Math.abs(num));
      const [h, m] = label.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return { id: nextActionId++, timestamp: DateUtils.timeToIso(label, query.date), time: label, side, value: val };
    },
    onActionsChange: setActions,
  });

  const applyPreset = useCallback((name: string) => {
    const preset = DAYTRADE_PRESETS[name];
    if (!preset) return;
    const newActions = preset.map((p) => ({
      id: nextActionId++,
      timestamp: DateUtils.timeToIso(p.time, query.date),
      time: p.time,
      side: p.side,
      value: p.value,
    }));
    setActions(newActions);
    setTextValue(actionsToText(newActions));
  }, [query.date, actionsToText, setTextValue]);

  const { data, isPending, error } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', ticker, query.date, query.timeframe],
    queryFn: () => getBars(ticker, query.date, query.timeframe),
    enabled: Boolean(ticker && query.date),
    staleTime: 5 * 60 * 1000,
  });

  const bars = data?.bars ?? [];

  const result = useMemo<SimResult | null>(() => {
    if (!bars.length || !actions.length) return null;
    if (tradeMode === 'short') return runShortSimulation(bars, actions, DateUtils.fmtTime);
    return runSimulation(bars, actions, Math.max(0, Number(startShares) || 0));
  }, [bars, actions, startShares, tradeMode]);

  // Build price chart
  useEffect(() => {
    if (!containerRef.current || !bars.length) return;
    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(containerRef.current, {
      height: 200,
      layout: { background: { color: 'transparent' }, textColor: cv('--text-primary') || '#e5e7eb' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.1)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    const toTime = (b: AlpacaBar) => Math.floor(new Date(b.t).getTime() / 1000) as unknown as import('lightweight-charts').Time;

    let candleSeries: ISeriesApi<SeriesType>;
    if (chartType === 'candlestick') {
      candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#22c55e', downColor: '#ef4444', borderUpColor: '#22c55e', borderDownColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444' });
      candleSeries.setData(bars.map((b) => ({ time: toTime(b), open: b.o, high: b.h, low: b.l, close: b.c })));
    } else if (chartType === 'area') {
      candleSeries = chart.addSeries(AreaSeries, { lineColor: '#22c55e', topColor: '#22c55e55', bottomColor: '#22c55e00', lineWidth: 2 });
      candleSeries.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    } else {
      candleSeries = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2 });
      candleSeries.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    }

    chart.timeScale().fitContent();

    let lastHoveredBar: { iso: string } | null = null;
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) { lastHoveredBar = null; return; }
      lastHoveredBar = { iso: new Date((param.time as unknown as number) * 1000).toISOString() };
    });
    chart.subscribeClick((param) => {
      if (!param.time) return;
      const iso = new Date((param.time as unknown as number) * 1000).toISOString();
      const val = Math.max(0.01, Number(valueRef.current) || 100);
      const side: Side = tradeModeRef.current === 'short' ? 'short' : 'buy';
      setActions((prev) => [...prev, { id: nextActionId++, timestamp: iso, time: DateUtils.fmtTime(iso), side, value: val }]);
    });

    const el = containerRef.current!;
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      if (!lastHoveredBar) return;
      const val = Math.min(100, Math.max(0.01, Number(valueRef.current) || 50));
      const side: Side = tradeModeRef.current === 'short' ? 'cover' : 'sell';
      setActions((prev) => [...prev, { id: nextActionId++, timestamp: lastHoveredBar!.iso, time: DateUtils.fmtTime(lastHoveredBar!.iso), side, value: val }]);
    }
    el.addEventListener('contextmenu', onContextMenu);
    chartRef.current = { chart, candleSeries };

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(el);

    return () => {
      el.removeEventListener('contextmenu', onContextMenu);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartType]);

  // Sync action markers onto chart
  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;
    createSeriesMarkers(ref.candleSeries, actions
      .map((a) => {
        const isEntry = a.side === 'buy' || a.side === 'short';
        return {
          time: Math.floor(new Date(a.timestamp).getTime() / 1000) as unknown as import('lightweight-charts').Time,
          position: isEntry ? ('belowBar' as const) : ('aboveBar' as const),
          color: a.side === 'buy' ? '#22c55e' : a.side === 'sell' ? '#ef4444' : a.side === 'short' ? '#f97316' : '#60a5fa',
          shape: isEntry ? ('arrowUp' as const) : ('arrowDown' as const),
          text: a.side === 'buy' ? `B $${a.value}` : a.side === 'sell' ? `S ${a.value}%` : a.side === 'short' ? `Sh $${a.value}` : `C ${a.value}%`,
        };
      })
      .sort((a, b) => (a.time < b.time ? -1 : 1)));
  }, [actions]);

  const addManualAction = useCallback(() => {
    if (!manualTime) return;
    const isExit = nextSide === 'sell' || nextSide === 'cover';
    const val = Math.max(0.01, Number(value) || (isExit ? 50 : 100));
    const iso = DateUtils.timeToIso(manualTime, query.date);
    const newAction: Action = { id: nextActionId++, timestamp: iso, time: manualTime, side: nextSide, value: val };
    setActions((prev) => [...prev, newAction]);
    setTextValue((prev) => prev ? prev + `\n${manualTime}, ${isExit ? -val : val}` : `${manualTime}, ${isExit ? -val : val}`);
    setManualTime('');
  }, [manualTime, nextSide, value, query.date, setTextValue]);

  const removeAction = useCallback((id: number) => setActions((prev) => prev.filter((a) => a.id !== id)), []);
  const updateAction = useCallback((id: number, field: 'side' | 'value', val: string) => {
    setActions((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const isExit = (s: Side) => s === 'sell' || s === 'cover';
      if (field === 'value') return { ...a, value: isExit(a.side) ? Math.min(100, Number(val)) : Number(val) };
      const newSide = val as Side;
      return { ...a, side: newSide, value: isExit(newSide) ? Math.min(100, a.value) : a.value };
    }));
  }, []);

  const clear = useCallback(() => { setActions([]); setTextValue(''); setNextSide(tradeMode === 'short' ? 'short' : 'buy'); }, [setTextValue, tradeMode]);

  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const { stats, transactions } = simResultToExportArgs(result);
    exportSimPdf(
      ticker,
      stats,
      transactions,
      [{ ref: containerRef.current, label: 'Price Chart' }, { ref: portfolioChartRef.current, label: 'Portfolio Value' }],
      'Time (ET)',
    );
  }, [result, ticker]);

  const portfolioMarkers = useMemo(() =>
    result?.transactions.map((t) => ({ time: t.time, side: t.side, value: t.value, shares: t.shares })) ?? [],
  [result]);

  const profitColor = result ? (result.profit >= 0 ? 'var(--color-green)' : 'var(--color-red)') : undefined;

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      <form className="dtrade-order-controls" onSubmit={(e) => { e.preventDefault(); const d = DateUtils.lastWeekday(date); setDate(d); setQuery({ date: d, timeframe }); setActions([]); setTextValue(''); }}>
        {bars.length > 0 && (<>
          <div className="dtrade-next-side">
            <button
              className={`sim-chart-btn${tradeMode === 'long' ? ' active' : ''}`}
              onClick={() => { setTradeMode('long'); setActions([]); setNextSide('buy'); }}
              type="button"
            >Long</button>
            <button
              className={`sim-chart-btn${tradeMode === 'short' ? ' active' : ''}`}
              onClick={() => { setTradeMode('short'); setActions([]); setNextSide('short'); }}
              type="button"
              style={tradeMode === 'short' ? { borderColor: '#f97316', color: '#f97316' } : undefined}
            >Short</button>
            <span style={{ width: '0.5rem' }} />
            {tradeMode === 'long' ? (
              <>
                <span className="dtrade-side-btn dtrade-side-btn--buy">▲ Left click = Buy ($)</span>
                <span className="dtrade-side-btn dtrade-side-btn--sell">▼ Right click = Sell (%)</span>
              </>
            ) : (
              <>
                <span className="dtrade-side-btn dtrade-side-btn--sell">▼ Left click = Short ($)</span>
                <span className="dtrade-side-btn dtrade-side-btn--buy">▲ Right click = Cover (%)</span>
              </>
            )}
          </div>
          {tradeMode === 'long' && (
            <div className="dtrade-shares">
              <span className="dtrade-label">Start shares:</span>
              <Input type="number" min="0" step="any" value={startShares} onChange={(e) => setStartShares(e.target.value)} className="dtrade-shares-input" />
            </div>
          )}
          <div className="dtrade-shares">
            <span className="dtrade-label">Value:</span>
            <Input type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} className="dtrade-shares-input" />
            <span className="dtrade-label">{tradeMode === 'long' ? '$ buy / % sell' : '$ short / % cover'}</span>
          </div>
        </>)}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input className="alpaca-input" type="date" value={date} max={DateUtils.lastWeekday(DateUtils.todayStr())} onChange={(e) => setDate(e.target.value)} />
          <select className="alpaca-input" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {MarketUtils.TIMEFRAMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button className="alpaca-btn" type="submit">Load</button>
        </div>
      </form>

      {bars.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
            {(['line', 'area', 'candlestick'] as const).map((t) => (
              <button key={t} className={`sim-chart-btn${chartType === t ? ' active' : ''}`} onClick={() => setChartType(t)} type="button">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="dtrade-chart-hint">
            {tradeMode === 'long'
              ? `Left click to buy $${value} · Right click to sell ${value}%`
              : `Left click to short $${value} · Right click to cover ${value}%`}
          </div>
          <div ref={containerRef} className="alpaca-chart-container" />

          <SimToolbar
            presets={DAYTRADE_PRESETS}
            onPreset={applyPreset}
            textMode={textMode}
            onTextModeToggle={() => {
              if (!textMode) setTextValue(actionsToText(actions));
              setTextMode((v) => !v);
            }}
            hasResult={!!result}
            onExportPdf={handleExportPdf}
            hasActions={actions.length > 0}
            onClear={clear}
          />

          <SimManualEntry
            side={nextSide}
            onSideChange={(s) => setNextSide(s as Side)}
            sideOptions={tradeMode === 'long'
              ? [{ value: 'buy', label: 'Buy ($)' }, { value: 'sell', label: 'Sell (%)' }]
              : [{ value: 'short', label: 'Short ($)' }, { value: 'cover', label: 'Cover (%)' }]}
            value={value}
            onValueChange={setValue}
            onAdd={addManualAction}
            inputSlot={
              <input className="alpaca-input" type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} />
            }
          />

          {textMode && (
            <Textarea
              value={textValue}
              onChange={handleTextChange}
              placeholder={'09:30, 100\n10:15, -50'}
              rows={Math.max(3, actions.length + 1)}
              className="sim-textarea"
            />
          )}

          {!textMode && actions.length > 0 && (
            <div className="dtrade-orders">
              <div className="dtrade-section-title">Actions</div>
              <table className="sim-table">
                <thead>
                  <tr>{['Time (ET)', 'Side', 'Value', ''].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[...actions].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((a) => (
                    <tr key={a.id}>
                      <td>{a.time}</td>
                      <td>
                        <select className="dtrade-inline-select" value={a.side} onChange={(e) => updateAction(a.id, 'side', e.target.value)}>
                          {tradeMode === 'long' ? (
                            <>
                              <option value="buy">BUY</option>
                              <option value="sell">SELL</option>
                            </>
                          ) : (
                            <>
                              <option value="short">SHORT</option>
                              <option value="cover">COVER</option>
                            </>
                          )}
                        </select>
                      </td>
                      <td>
                        <input className="dtrade-inline-input" type="number" min="0" max={a.side === 'sell' || a.side === 'cover' ? 100 : undefined} step="any" value={a.value} onChange={(e) => updateAction(a.id, 'value', e.target.value)} />
                        <span className="dtrade-unit">{a.side === 'buy' || a.side === 'short' ? '$' : '%'}</span>
                      </td>
                      <td><button className="dtrade-remove" onClick={() => removeAction(a.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result && result.transactions.length > 0 && (
            <SimResults
              ref={portfolioChartRef}
              stats={tradeMode === 'long' ? [
                { label: 'Total invested', value: PriceUtils.fmt(result.totalInvested) },
                { label: 'Shares held', value: result.finalShares.toFixed(4) },
                { label: 'Shares value', value: PriceUtils.fmt(result.sharesValue) },
                { label: 'Cash withdrawn', value: PriceUtils.fmt(result.cashWithdrawn) },
                { label: 'Profit', value: (result.profit >= 0 ? '+' : '') + PriceUtils.fmt(result.profit), color: profitColor },
                { label: 'Profit %', value: (result.profitPct >= 0 ? '+' : '') + result.profitPct.toFixed(2) + '%', color: profitColor },
              ] : [
                { label: 'Cash received', value: PriceUtils.fmt(result.totalInvested) },
                { label: 'Shares short', value: Math.abs(result.finalShares).toFixed(4) },
                { label: 'Remaining liability', value: PriceUtils.fmt(Math.abs(result.sharesValue)) },
                { label: 'Cover cost', value: PriceUtils.fmt(result.cashWithdrawn) },
                { label: 'Profit', value: (result.profit >= 0 ? '+' : '') + PriceUtils.fmt(result.profit), color: profitColor },
                { label: 'Profit %', value: (result.profitPct >= 0 ? '+' : '') + result.profitPct.toFixed(2) + '%', color: profitColor },
              ]}
              history={result.portfolioHistory}
              markers={portfolioMarkers}
              transactions={result.transactions}
              intraday
            />
          )}
        </>
      )}
    </div>
  );
}
