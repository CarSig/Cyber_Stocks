import { useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, AreaSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { getBars } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Toolbar from './components/Toolbar';
import ManualEntry from './components/ManualEntry';
import Results from './components/Results';
import { exportSimPdf } from './utils/exportPdf';
import { dayTradeReducer, initialDayTradeState } from './reducers/dayTradeReducer';
import { intradayStrategy } from './reducers/baseStrategy';
import { useApplyPreset } from './hooks/useApplyPreset';
import { useAddManualAction } from './hooks/useAddManualAction';
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

import type { Side, Action, SimResult } from '@/utils/sim';
import {
  runLongSimulation,
  runShortSimulation,
  buildSimStats,
  fmtMarkerText,
  simResultToExportArgs,
} from '@/utils/sim';

const nextActionId = { current: 1 };

type ChartRef = { chart: IChartApi; candleSeries: ISeriesApi<SeriesType> } | null;

export default function DayTradeSimulation({ ticker }: { ticker: string }) {
  const [s, dispatch] = useReducer(dayTradeReducer, undefined, initialDayTradeState);
  const {
    date,
    timeframe,
    query,
    actions,
    nextSide,
    value,
    startShares,
    manualTime,
    textMode,
    textValue,
    chartType,
    tradeMode,
  } = s;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartRef>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const nextSideRef = useRef<Side>(nextSide as Side);
  const valueRef = useRef<string>(value);
  const tradeModeRef = useRef<'long' | 'short'>(tradeMode);
  useEffect(() => {
    nextSideRef.current = nextSide as Side;
  }, [nextSide]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);

  const applyPreset = useApplyPreset(
    DAYTRADE_PRESETS,
    (p, id) => ({
      id,
      timestamp: DateUtils.timeToIso(p.time, query.date),
      time: p.time,
      side: p.side as Side,
      value: p.value,
    }),
    intradayStrategy,
    query.date,
    dispatch,
    nextActionId,
  );

  const { data, isPending, error } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', ticker, query.date, query.timeframe],
    queryFn: () => getBars(ticker, query.date, query.timeframe),
    enabled: Boolean(ticker && query.date),
    staleTime: 5 * 60 * 1000,
  });

  const bars = useMemo(() => data?.bars ?? [], [data]);

  const result = useMemo<SimResult | null>(() => {
    if (!bars.length || !actions.length) return null;
    if (tradeMode === 'short') return runShortSimulation(bars, actions, DateUtils.fmtTime);
    return runLongSimulation(bars, actions, DateUtils.fmtTime, Math.max(0, Number(startShares) || 0));
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

    const toTime = (b: AlpacaBar) =>
      Math.floor(new Date(b.t).getTime() / 1000) as unknown as import('lightweight-charts').Time;

    let candleSeries: ISeriesApi<SeriesType>;
    if (chartType === 'candlestick') {
      candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      candleSeries.setData(bars.map((b) => ({ time: toTime(b), open: b.o, high: b.h, low: b.l, close: b.c })));
    } else if (chartType === 'area') {
      candleSeries = chart.addSeries(AreaSeries, {
        lineColor: '#22c55e',
        topColor: '#22c55e55',
        bottomColor: '#22c55e00',
        lineWidth: 2,
      });
      candleSeries.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    } else {
      candleSeries = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2 });
      candleSeries.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    }

    chart.timeScale().fitContent();

    let lastHoveredBar: { iso: string } | null = null;
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        lastHoveredBar = null;
        return;
      }
      lastHoveredBar = { iso: new Date((param.time as unknown as number) * 1000).toISOString() };
    });
    chart.subscribeClick((param) => {
      if (!param.time) return;
      const iso = new Date((param.time as unknown as number) * 1000).toISOString();
      const val = Math.max(0.01, Number(valueRef.current) || 100);
      const side: Side = tradeModeRef.current === 'short' ? 'short' : 'buy';
      dispatch({
        type: 'ADD_ACTION',
        action: { id: nextActionId.current++, timestamp: iso, time: DateUtils.fmtTime(iso), side, value: val },
        date: query.date,
      });
    });

    const el = containerRef.current!;
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      if (!lastHoveredBar) return;
      const val = Math.min(100, Math.max(0.01, Number(valueRef.current) || 50));
      const side: Side = tradeModeRef.current === 'short' ? 'cover' : 'sell';
      dispatch({
        type: 'ADD_ACTION',
        action: {
          id: nextActionId.current++,
          timestamp: lastHoveredBar!.iso,
          time: DateUtils.fmtTime(lastHoveredBar!.iso),
          side,
          value: val,
        },
        date: query.date,
      });
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
  }, [bars, chartType, query.date]);

  // Sync action markers onto chart
  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;
    createSeriesMarkers(
      ref.candleSeries,
      actions
        .map((a) => {
          const isEntry = a.side === 'buy' || a.side === 'short';
          return {
            time: Math.floor(new Date(a.timestamp).getTime() / 1000) as unknown as import('lightweight-charts').Time,
            position: isEntry ? ('belowBar' as const) : ('aboveBar' as const),
            color:
              a.side === 'buy' ? '#22c55e' : a.side === 'sell' ? '#ef4444' : a.side === 'short' ? '#f97316' : '#60a5fa',
            shape: isEntry ? ('arrowUp' as const) : ('arrowDown' as const),
            text: fmtMarkerText(a.side, a.value),
          };
        })
        .sort((a, b) => (a.time < b.time ? -1 : 1)),
    );
  }, [actions]);

  const addManualAction = useAddManualAction(
    intradayStrategy,
    manualTime,
    nextSide,
    value,
    query.date,
    dispatch,
    nextActionId,
    () => dispatch({ type: 'SET_MANUAL_TIME', time: '' }),
  );

  const removeAction = useCallback(
    (id: number) => dispatch({ type: 'REMOVE_ACTION', id, date: query.date }),
    [query.date],
  );

  const updateAction = useCallback(
    (id: number, field: 'side' | 'value', val: string) =>
      dispatch({ type: 'UPDATE_ACTION', id, field, val, date: query.date }),
    [query.date],
  );

  const clear = useCallback(() => dispatch({ type: 'CLEAR_ACTIONS', date: query.date }), [query.date]);

  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const { stats, transactions } = simResultToExportArgs(result);
    exportSimPdf(
      ticker,
      stats,
      transactions,
      [
        { ref: containerRef.current, label: 'Price Chart' },
        { ref: portfolioChartRef.current, label: 'Portfolio Value' },
      ],
      'Time (ET)',
    );
  }, [result, ticker]);

  const portfolioMarkers = useMemo(
    () => result?.transactions.map((t) => ({ time: t.time, side: t.side, value: t.value, shares: t.shares })) ?? [],
    [result],
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      let parsedDate: string | undefined;
      let actionLines = lines;
      if (/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? '')) {
        parsedDate = lines[0];
        actionLines = lines.slice(1);
      }
      const effectiveDate = parsedDate ?? query.date;
      let id = Date.now();
      const parsed: Action[] = [];
      for (const line of actionLines) {
        const parts = line.split(',').map((s) => s.trim());
        if (parts.length !== 2) continue;
        const [timeStr, numStr] = parts;
        const num = Number(numStr);
        if (isNaN(num) || num === 0) continue;
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) continue;
        const side: Side = num > 0 ? 'buy' : 'sell';
        const val = Math.min(side === 'sell' ? 100 : Infinity, Math.abs(num));
        parsed.push({
          id: id++,
          timestamp: DateUtils.timeToIso(timeStr, effectiveDate),
          time: timeStr,
          side,
          value: val,
        });
      }
      dispatch({ type: 'SET_TEXT', raw, parsedDate, parsedActions: parsed.length ? parsed : undefined });
    },
    [query.date],
  );

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      <form
        className="dtrade-order-controls"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'LOAD_BARS', date, timeframe });
        }}
      >
        {bars.length > 0 && (
          <>
            <div className="dtrade-next-side">
              <button
                className={`sim-chart-btn${tradeMode === 'long' ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'SET_TRADE_MODE', mode: 'long', date: query.date })}
                type="button"
              >
                Long
              </button>
              <button
                className={`sim-chart-btn${tradeMode === 'short' ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'SET_TRADE_MODE', mode: 'short', date: query.date })}
                type="button"
                style={tradeMode === 'short' ? { borderColor: '#f97316', color: '#f97316' } : undefined}
              >
                Short
              </button>
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
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={startShares}
                  onChange={(e) => dispatch({ type: 'SET_START_SHARES', startShares: e.target.value })}
                  className="dtrade-shares-input"
                />
              </div>
            )}
            <div className="dtrade-shares">
              <span className="dtrade-label">Value:</span>
              <Input
                type="number"
                min="0"
                step="any"
                value={value}
                onChange={(e) => dispatch({ type: 'SET_VALUE', value: e.target.value })}
                className="dtrade-shares-input"
              />
              <span className="dtrade-label">{tradeMode === 'long' ? '$ buy / % sell' : '$ short / % cover'}</span>
            </div>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="alpaca-input"
            type="date"
            value={date}
            max={DateUtils.lastWeekday(DateUtils.todayStr())}
            onChange={(e) => dispatch({ type: 'SET_DATE', date: e.target.value })}
          />
          <select
            className="alpaca-input"
            value={timeframe}
            onChange={(e) => dispatch({ type: 'SET_TIMEFRAME', timeframe: e.target.value })}
          >
            {MarketUtils.TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button className="alpaca-btn" type="submit">
            Load
          </button>
        </div>
      </form>

      {bars.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
            {(['line', 'area', 'candlestick'] as const).map((t) => (
              <button
                key={t}
                className={`sim-chart-btn${chartType === t ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'SET_CHART_TYPE', chartType: t })}
                type="button"
              >
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

          <Toolbar
            presets={DAYTRADE_PRESETS}
            onPreset={applyPreset}
            textMode={textMode}
            onTextModeToggle={() => dispatch({ type: 'TOGGLE_TEXT_MODE', date: query.date })}
            hasResult={!!result}
            onExportPdf={handleExportPdf}
            hasActions={actions.length > 0}
            onClear={clear}
          />

          <ManualEntry
            side={nextSide}
            onSideChange={(s) => dispatch({ type: 'SET_NEXT_SIDE', side: s })}
            sideOptions={
              tradeMode === 'long'
                ? [
                    { value: 'buy', label: 'Buy ($)' },
                    { value: 'sell', label: 'Sell (%)' },
                  ]
                : [
                    { value: 'short', label: 'Short ($)' },
                    { value: 'cover', label: 'Cover (%)' },
                  ]
            }
            value={value}
            onValueChange={(v) => dispatch({ type: 'SET_VALUE', value: v })}
            onAdd={addManualAction}
            inputSlot={
              <input
                className="alpaca-input"
                type="time"
                value={manualTime}
                onChange={(e) => dispatch({ type: 'SET_MANUAL_TIME', time: e.target.value })}
              />
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
                  <tr>
                    {['Time (ET)', 'Side', 'Value', ''].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...actions]
                    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                    .map((a) => (
                      <tr key={a.id}>
                        <td>{a.time}</td>
                        <td>
                          <select
                            className="dtrade-inline-select"
                            value={a.side}
                            onChange={(e) => updateAction(a.id, 'side', e.target.value)}
                          >
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
                          <input
                            className="dtrade-inline-input"
                            type="number"
                            min="0"
                            max={a.side === 'sell' || a.side === 'cover' ? 100 : undefined}
                            step="any"
                            value={a.value}
                            onChange={(e) => updateAction(a.id, 'value', e.target.value)}
                          />
                          <span className="dtrade-unit">{a.side === 'buy' || a.side === 'short' ? '$' : '%'}</span>
                        </td>
                        <td>
                          <button className="dtrade-remove" onClick={() => removeAction(a.id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {result && result.transactions.length > 0 && (
            <Results
              ref={portfolioChartRef}
              stats={buildSimStats(result, tradeMode, PriceUtils.fmt)}
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
