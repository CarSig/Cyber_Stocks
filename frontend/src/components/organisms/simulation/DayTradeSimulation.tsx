import { useEffect, useRef, useCallback, useMemo, useReducer, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, AreaSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { getBars } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';
import { Input } from '@/components/ui/input';
import SimEntryPanel from './components/entry-panel/SimEntryPanel';
import ChartTypeToggle from './components/ChartTypeToggle';
import OrderControls from './components/OrderControls';
import { useExportSimPdf } from './hooks/useExportSimPdf';
import { dayTradeReducer, initialDayTradeState } from './reducers/dayTradeReducer';
import { intradayStrategy } from './reducers/baseStrategy';
import type { SimStrategy } from './reducers/baseStrategy';
import { useApplyPreset } from './hooks/useApplyPreset';
import { useAddManualAction } from './hooks/useAddManualAction';
import { attachChartClick } from './utils/chartClick';
import ChartActionPopover from './components/ChartActionPopover';
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
import { runLongSimulation, runShortSimulation, buildSimStats, fmtMarkerText } from '@/utils/sim';

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

  const nextActionId = useRef(Math.max(0, ...s.actions.map((a) => a.id)) + 1);

  const [popover, setPopover] = useState<{ iso: string; x: number; y: number; side: Side; value: string } | null>(null);
  const [editPopover, setEditPopover] = useState<{ action: Action; x: number; y: number } | null>(null);
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

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
    const el = containerRef.current!;
    const cleanupClick = attachChartClick(el, {
      chart,
      getHoveredIso: () => lastHoveredBar?.iso ?? null,
      onQuickAction: (iso, button) => {
        if (actionsRef.current.find((a) => a.timestamp === iso)) return;
        if (button === 0) {
          const side: Side = tradeModeRef.current === 'short' ? 'short' : 'buy';
          const val = Math.max(0.01, Number(valueRef.current) || 100);
          dispatch({ type: 'ADD_ACTION', action: { id: nextActionId.current++, timestamp: iso, time: DateUtils.fmtTime(iso), side, value: val }, date: query.date });
        } else {
          const side: Side = tradeModeRef.current === 'short' ? 'cover' : 'sell';
          const val = Math.min(100, Math.max(0.01, Number(valueRef.current) || 50));
          dispatch({ type: 'ADD_ACTION', action: { id: nextActionId.current++, timestamp: iso, time: DateUtils.fmtTime(iso), side, value: val }, date: query.date });
        }
      },
      onHoldStart: (iso, x, y, button) => {
        const existing = actionsRef.current.find((a) => a.timestamp === iso);
        if (existing) { setEditPopover({ action: existing, x, y }); return; }
        const side: Side = button === 0
          ? (tradeModeRef.current === 'short' ? 'short' : 'buy')
          : (tradeModeRef.current === 'short' ? 'cover' : 'sell');
        const val = button === 0
          ? String(Math.max(0.01, Number(valueRef.current) || 100))
          : String(Math.min(100, Math.max(0.01, Number(valueRef.current) || 50)));
        setPopover({ iso, x, y, side, value: val });
      },
    });
    chartRef.current = { chart, candleSeries };

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(el);

    return () => {
      cleanupClick();
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
        .filter((a) => a.timestamp && !isNaN(new Date(a.timestamp).getTime()))
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

  const dismissPopover = useCallback(() => setPopover(null), []);
  const confirmPopover = useCallback(
    (side: Side, rawValue: string) => {
      if (!popover) return;
      const isExit = side === 'sell' || side === 'cover';
      const val = isExit
        ? Math.min(100, Math.max(0.01, Number(rawValue)))
        : Math.max(0.01, Number(rawValue));
      if (!isFinite(val) || val <= 0) { setPopover(null); return; }
      dispatch({ type: 'ADD_ACTION', action: { id: nextActionId.current++, timestamp: popover.iso, time: DateUtils.fmtTime(popover.iso), side, value: val }, date: query.date });
      setPopover(null);
    },
    [popover, query.date],
  );

  const dismissEditPopover = useCallback(() => setEditPopover(null), []);
  const confirmEditPopover = useCallback(
    (side: Side, rawValue: string) => {
      if (!editPopover) return;
      const isExit = side === 'sell' || side === 'cover';
      const val = isExit
        ? Math.min(100, Math.max(0.01, Number(rawValue)))
        : Math.max(0.01, Number(rawValue));
      if (!isFinite(val) || val <= 0) { setEditPopover(null); return; }
      dispatch({ type: 'UPDATE_ACTION', id: editPopover.action.id, field: 'side', val: side, date: query.date });
      dispatch({ type: 'UPDATE_ACTION', id: editPopover.action.id, field: 'value', val: String(val), date: query.date });
      setEditPopover(null);
    },
    [editPopover, query.date],
  );
  const deleteFromEditPopover = useCallback(() => {
    if (!editPopover) return;
    dispatch({ type: 'REMOVE_ACTION', id: editPopover.action.id, date: query.date });
    setEditPopover(null);
  }, [editPopover, query.date]);

  const handleExportPdf = useExportSimPdf(
    ticker,
    result,
    [
      { ref: containerRef, label: 'Price Chart' },
      { ref: portfolioChartRef, label: 'Portfolio Value' },
    ],
    'Time (ET)',
  );

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

      <OrderControls
        tradeMode={tradeMode}
        onTradeModeChange={(mode) => dispatch({ type: 'SET_TRADE_MODE', mode, date: query.date })}
        startShares={startShares}
        onStartSharesChange={(v) => dispatch({ type: 'SET_START_SHARES', startShares: v })}
        value={value}
        onValueChange={(v) => dispatch({ type: 'SET_VALUE', value: v })}
        date={date}
        onDateChange={(d) => dispatch({ type: 'SET_DATE', date: d })}
        maxDate={DateUtils.lastWeekday(DateUtils.todayStr())}
        timeframe={timeframe}
        onTimeframeChange={(t) => dispatch({ type: 'SET_TIMEFRAME', timeframe: t })}
        onLoad={(e) => {
          e.preventDefault();
          dispatch({ type: 'LOAD_BARS', date, timeframe });
        }}
        showTradeControls={bars.length > 0}
        valueLabel={tradeMode === 'long' ? '$ buy / % sell' : '$ short / % cover'}
      />

      {bars.length > 0 && (
        <SimEntryPanel
          topSlot={
            <>
              <ChartTypeToggle
                chartType={chartType}
                onChange={(t) => dispatch({ type: 'SET_CHART_TYPE', chartType: t })}
              />
              <div className="dtrade-chart-hint">
                {tradeMode === 'long'
                  ? `Left click to buy $${value} · Right click to sell ${value}% · Hold 1s to configure`
                  : `Left click to short $${value} · Right click to cover ${value}% · Hold 1s to configure`}
              </div>
              <div ref={containerRef} className="alpaca-chart-container" />
            </>
          }
          tradeMode={tradeMode}
          strategy={intradayStrategy}
          presets={DAYTRADE_PRESETS}
          onPreset={applyPreset}
          textMode={textMode}
          onTextModeToggle={() => dispatch({ type: 'TOGGLE_TEXT_MODE', date: query.date })}
          onExportPdf={handleExportPdf}
          onClear={clear}
          nextSide={nextSide}
          onNextSideChange={(s) => dispatch({ type: 'SET_NEXT_SIDE', side: s })}
          manualValue={value}
          onManualValueChange={(v) => dispatch({ type: 'SET_VALUE', value: v })}
          onAddManual={addManualAction}
          manualInputType="time"
          manualInputValue={manualTime}
          onManualInputChange={(v) => dispatch({ type: 'SET_MANUAL_TIME', time: v })}
          textValue={textValue}
          onTextChange={handleTextChange}
          actions={actions}
          onUpdateAction={updateAction}
          onRemoveAction={removeAction}
          resultStats={result ? buildSimStats(result, tradeMode, PriceUtils.fmt) : null}
          resultHistory={result?.portfolioHistory ?? []}
          resultMarkers={portfolioMarkers}
          resultTransactions={result?.transactions ?? null}
          portfolioChartRef={portfolioChartRef}
        />
      )}
      {popover && (
        <ChartActionPopover
          x={popover.x}
          y={popover.y}
          initialSide={popover.side}
          initialValue={popover.value}
          tradeMode={tradeMode}
          onConfirm={confirmPopover}
          onDismiss={dismissPopover}
        />
      )}
      {editPopover && (
        <ChartActionPopover
          mode="edit"
          x={editPopover.x}
          y={editPopover.y}
          initialSide={editPopover.action.side}
          initialValue={String(editPopover.action.value)}
          tradeMode={tradeMode}
          onConfirm={confirmEditPopover}
          onDelete={deleteFromEditPopover}
          onDismiss={dismissEditPopover}
        />
      )}
    </div>
  );
}
