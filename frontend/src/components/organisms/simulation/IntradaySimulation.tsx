import { useEffect, useRef, useCallback, useMemo, useReducer, useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { syncIntradayMarkers } from '@/components/organisms/charts/utils/markers';
import { setupDayLines } from '@/components/organisms/charts/utils/dayLines';
import { getBars, getIntradayEvents } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';
import type { IntradayEvent } from '@/api/alpaca';
import FilterSelect from '@/components/molecules/shared/FilterSelect';
import SimEntryPanel from './components/entry-panel/SimEntryPanel';
import ChartTypeToggle from './components/ChartTypeToggle';
import IntradayEventCard from './components/intraday/IntradayEventCard';
import OrderControls from './components/OrderControls';
import AllDialog from './components/intraday/AllDialog';
import { intradayReducer, initialIntradayState } from './reducers/intradayReducer';
import type { SimAllRow } from './reducers/intradayReducer';
import { intradayStrategy } from './reducers/baseStrategy';
import { useApplyPreset } from './hooks/useApplyPreset';
import { useAddManualAction } from './hooks/useAddManualAction';
import { useExportSimPdf } from './hooks/useExportSimPdf';
import { detectShortDirection, calcEntryTime } from './utils/intradaySimUtils';
import { attachChartClick } from './utils/chartClick';
import ChartActionPopover from './components/ChartActionPopover';
import { DateUtils } from '@/utils/date';
import { PriceUtils } from '@/utils/price';

const INTRADAY_SIM_PRESETS: Record<string, { time: string; side: 'buy' | 'sell'; value: number }[]> = {
  'Open & Close': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '15:45', side: 'sell', value: 100 },
  ],
  'Morning scalp': [
    { time: '09:31', side: 'buy', value: 100 },
    { time: '09:45', side: 'sell', value: 100 },
  ],
  'Afternoon fade': [
    { time: '13:00', side: 'buy', value: 100 },
    { time: '15:30', side: 'sell', value: 100 },
  ],
};

import type { Side, Action, Transaction, SimResult } from '@/utils/sim';
import { runLongSimulation, runShortSimulation, buildSimStats } from '@/utils/sim';

function parseIntradayText(raw: string, date: string): { parsedDate: string | null; actions: Action[] } {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { parsedDate: null, actions: [] };

  let parsedDate: string | null = null;
  let actionLines = lines;
  if (/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? '')) {
    parsedDate = lines[0];
    actionLines = lines.slice(1);
  }

  const effectiveDate = parsedDate ?? date;
  let nextId = Date.now();
  const actions: Action[] = [];
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
    actions.push({
      id: nextId++,
      timestamp: DateUtils.timeToIso(timeStr, effectiveDate),
      time: timeStr,
      side,
      value: val,
    });
  }
  return { parsedDate, actions };
}

type ChartRef = { chart: IChartApi; series: ISeriesApi<SeriesType> } | null;

export default function IntradaySimulation() {
  const [s, dispatch] = useReducer(intradayReducer, undefined, initialIntradayState);
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
    selectedEvent,
    showPeers,
    extraDates,
    simAllResults,
    simAllRunning,
    aiDelay,
  } = s;

  const queryClient = useQueryClient();

  const nextActionId = useRef(Math.max(0, ...s.actions.map((a) => a.id)) + 1);

  const [popover, setPopover] = useState<{ iso: string; x: number; y: number; side: Side; value: string } | null>(null);
  const [editPopover, setEditPopover] = useState<{ action: Action; x: number; y: number } | null>(null);
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dayLinesRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartRef>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<string>(value);
  const tradeModeRef = useRef<'long' | 'short'>(tradeMode);
  const tzOffsetRef = useRef<number>(0);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);

  const { data: eventsData } = useQuery<IntradayEvent[]>({
    queryKey: ['intraday-events'],
    queryFn: getIntradayEvents,
    staleTime: Infinity,
  });

  const { data, isPending, error } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', query.ticker, query.date, query.timeframe],
    queryFn: () => getBars(query.ticker, query.date, query.timeframe),
    enabled: Boolean(query.ticker && query.date),
    staleTime: 5 * 60 * 1000,
  });

  const allDates = useMemo(() => {
    const set = new Set([query.date, ...extraDates]);
    return Array.from(set).sort();
  }, [query.date, extraDates]);
  const earliestDate = allDates[0] ?? query.date;
  const latestDate = allDates[allDates.length - 1] ?? query.date;
  const prevDate = useMemo(() => DateUtils.prevWeekday(earliestDate), [earliestDate]);
  const nextDate = useMemo(() => DateUtils.nextWeekday(latestDate), [latestDate]);

  const extraQueries = useQueries({
    queries: extraDates.map((d) => ({
      queryKey: ['alpaca-bars', query.ticker, d, query.timeframe] as const,
      queryFn: () => getBars(query.ticker, d, query.timeframe),
      enabled: Boolean(query.ticker && d),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const bars = useMemo(() => {
    const all = [...extraQueries.flatMap((q) => q.data?.bars ?? []), ...(data?.bars ?? [])];
    return all.sort((a, b) => a.t.localeCompare(b.t));
  }, [data, extraQueries]);

  const peerTickers = useMemo(
    () => (showPeers && selectedEvent ? selectedEvent.peers.slice(0, 4) : []),
    [showPeers, selectedEvent],
  );

  const PEER_COLORS = ['#f59e0b', '#60a5fa', '#f472b6', '#34d399'];

  const peerQueryResults = useQueries({
    queries: peerTickers.map((t) => ({
      queryKey: ['alpaca-bars', t, query.date, query.timeframe] as const,
      queryFn: () => getBars(t, query.date, query.timeframe),
      enabled: Boolean(t && query.date),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const peerBars = useMemo(
    () => peerTickers.map((t, i) => ({ ticker: t, bars: peerQueryResults[i]?.data?.bars ?? [] })),
    [peerTickers, peerQueryResults],
  );

  const result = useMemo<SimResult | null>(() => {
    if (!bars.length || !actions.length) return null;
    if (tradeMode === 'short') return runShortSimulation(bars, actions, DateUtils.fmtTime);
    return runLongSimulation(bars, actions, DateUtils.fmtTime, Math.max(0, Number(startShares) || 0));
  }, [bars, actions, startShares, tradeMode]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const { parsedDate, actions: parsed } = parseIntradayText(raw, query.date);
      dispatch({
        type: 'SET_TEXT',
        raw,
        parsedDate: parsedDate ?? undefined,
        parsedActions: parsed.length ? parsed : undefined,
      });
    },
    [query.date],
  );

  const applyPreset = useApplyPreset(
    INTRADAY_SIM_PRESETS,
    (p, id) => ({
      id,
      timestamp: DateUtils.timeToIso(p.time, query.date),
      time: p.time,
      side: p.side,
      value: p.value,
    }),
    intradayStrategy,
    query.date,
    dispatch,
    nextActionId,
  );

  const handleEventSelect = useCallback(
    (eventLabel: string | null) => {
      if (!eventLabel) return;
      const ev = eventsData?.find((e) => e.event === eventLabel);
      if (!ev) return;
      dispatch({ type: 'LOAD_EVENT', event: ev, timeframe });
    },
    [eventsData, timeframe],
  );

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'LOAD_BARS', ticker: query.ticker, date, timeframe });
  }

  // Build price chart
  useEffect(() => {
    if (!containerRef.current || !bars.length) return;
    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(containerRef.current, {
      height: 200,
      layout: { background: { color: 'transparent' }, textColor: cv('--text-primary') || '#e5e7eb' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255,255,255,0.1)',
        fixLeftEdge: false,
        fixRightEdge: false,
        tickMarkFormatter: (time: number, tickMarkType: number) => {
          const d = new Date(time * 1000);
          const hh = String(d.getUTCHours()).padStart(2, '0');
          const mm = String(d.getUTCMinutes()).padStart(2, '0');
          // tickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
          if (tickMarkType <= 2) {
            const day = d.getUTCDate();
            const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
            return `${day} ${mon} ${hh}:${mm}`;
          }
          return `${hh}:${mm}`;
        },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    const offset = DateUtils.etOffsetSeconds(new Date(bars[0].t));
    tzOffsetRef.current = offset;
    const toTime = (b: AlpacaBar) => DateUtils.toEtChartTime(b.t, offset);

    let series: ISeriesApi<SeriesType>;
    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      series.setData(bars.map((b) => ({ time: toTime(b), open: b.o, high: b.h, low: b.l, close: b.c })));
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#22c55e',
        topColor: '#22c55e55',
        bottomColor: '#22c55e00',
        lineWidth: 2,
      });
      series.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    } else {
      series = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2 });
      series.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    }

    // Peer overlays — separate price scale per peer so different price ranges display cleanly
    peerBars.forEach(({ ticker: peerTicker, bars: pb }, i) => {
      if (!pb.length) return;
      const color = PEER_COLORS[i % PEER_COLORS.length];
      const scaleId = `peer_${i}`;
      const peerSeries = chart.addSeries(LineSeries, { color, lineWidth: 1, priceScaleId: scaleId, title: peerTicker });
      chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      peerSeries.setData(pb.map((b) => ({ time: toTime(b), value: b.c })));
    });

    chart.timeScale().fitContent();

    const chartTimeToIso = (t: number) => new Date((t - offset) * 1000).toISOString();

    let lastHoveredBar: { iso: string } | null = null;
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        lastHoveredBar = null;
        return;
      }
      lastHoveredBar = { iso: chartTimeToIso(param.time as unknown as number) };
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
    chartRef.current = { chart, series };
    syncIntradayMarkers(series, actions, selectedEvent, query.date, offset);

    const cleanupDayLines = dayLinesRef.current
      ? setupDayLines(chart, dayLinesRef.current, el, bars, offset)
      : () => {};

    return () => {
      cleanupClick();
      cleanupDayLines();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartType, peerBars]);

  // Sync action + event markers onto chart
  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;
    syncIntradayMarkers(ref.series, actions, selectedEvent, query.date, tzOffsetRef.current);
  }, [actions, selectedEvent, query.date]);

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

  const handleSimulateAll = useCallback(async () => {
    if (!eventsData?.length) return;
    dispatch({ type: 'SIM_ALL_START' });

    const simOne = async (ev: IntradayEvent): Promise<SimAllRow> => {
      const primaryTicker = ev.ticker.split('/')[0].trim();
      const isShort = detectShortDirection(primaryTicker, ev.trade_idea);
      const action = isShort ? ('short' as const) : ('buy' as const);

      try {
        const { bars } = await queryClient.fetchQuery({
          queryKey: ['alpaca-bars', primaryTicker, ev.chart_date, '5Min'],
          queryFn: () => getBars(primaryTicker, ev.chart_date, '5Min'),
          staleTime: Infinity,
        });
        const [ch, cm] = ev.chart_time.split(':').map(Number);
        const isPreMarket = ch * 60 + cm < 9 * 60 + 30;
        const entryTime = calcEntryTime(ev.chart_time, aiDelay, isPreMarket);

        if (!bars.length)
          return {
            rank: ev.rank,
            ticker: primaryTicker,
            event: ev.event,
            trade_idea: ev.trade_idea,
            action,
            chartTime: ev.chart_time,
            preMarket: isPreMarket,
            entryTime,
            profitPct: null,
            error: 'No data',
          };

        const entryIso = DateUtils.timeToIso(entryTime, ev.chart_date);
        const exitIso = DateUtils.timeToIso('15:45', ev.chart_date);
        const actions: Action[] = [
          { id: 1, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
          { id: 2, timestamp: exitIso, time: '15:45', side: isShort ? 'cover' : 'sell', value: 100 },
        ];

        const result = isShort
          ? runShortSimulation(bars, actions, DateUtils.fmtTime)
          : runLongSimulation(bars, actions, DateUtils.fmtTime, 0);

        return {
          rank: ev.rank,
          ticker: primaryTicker,
          event: ev.event,
          trade_idea: ev.trade_idea,
          action,
          chartTime: ev.chart_time,
          preMarket: isPreMarket,
          entryTime,
          profitPct: result.profitPct,
        };
      } catch (err) {
        return {
          rank: ev.rank,
          ticker: primaryTicker,
          event: ev.event,
          trade_idea: ev.trade_idea,
          action,
          chartTime: ev.chart_time,
          preMarket: false,
          entryTime: '09:30',
          profitPct: null,
          error: err instanceof Error ? err.message : 'Failed',
        };
      }
    };

    // Run in batches of 4 to avoid rate-limiting
    const BATCH = 4;
    const rows: SimAllRow[] = [];
    for (let i = 0; i < eventsData.length; i += BATCH) {
      const batch = eventsData.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(simOne));
      rows.push(...results);
    }

    rows.sort((a, b) => (b.profitPct ?? -Infinity) - (a.profitPct ?? -Infinity));
    dispatch({ type: 'SIM_ALL_DONE', results: rows });
  }, [eventsData, aiDelay, queryClient]);

  const handleAiSim = useCallback(() => {
    if (!selectedEvent) return;
    const primaryTicker = selectedEvent.ticker.split('/')[0].trim();
    const isShort = detectShortDirection(primaryTicker, selectedEvent.trade_idea);

    const chartDate = selectedEvent.chart_date;
    const [ch, cm] = selectedEvent.chart_time.split(':').map(Number);
    const isPreMarket = ch * 60 + cm < 9 * 60 + 30;
    const entryTime = calcEntryTime(selectedEvent.chart_time, aiDelay, isPreMarket);
    const exitTime = '15:45';
    const entryIso = DateUtils.timeToIso(entryTime, chartDate);
    const exitIso = DateUtils.timeToIso(exitTime, chartDate);

    const newActions: Action[] = [
      { id: nextActionId.current++, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
      { id: nextActionId.current++, timestamp: exitIso, time: exitTime, side: isShort ? 'cover' : 'sell', value: 100 },
    ];

    const mode = isShort ? 'short' : 'long';
    dispatch({ type: 'SET_TRADE_MODE', mode, date: chartDate });
    dispatch({ type: 'SET_ACTIONS', actions: newActions, textValue: intradayStrategy.toText(chartDate, newActions) });
  }, [selectedEvent, aiDelay]);

  const handleExportPdf = useExportSimPdf(
    query.ticker,
    result,
    [
      { ref: containerRef, label: 'Price Chart' },
      { ref: portfolioChartRef, label: 'Portfolio Value' },
    ],
    'Time (ET)',
  );

  const portfolioMarkers = useMemo(
    () =>
      result?.transactions.map((t) => ({ time: t.timestamp, side: t.side, value: t.value, shares: t.shares })) ?? [],
    [result],
  );

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      {/* Controls */}
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
        eventSlot={
          eventsData && eventsData.length > 0 ? (
            <FilterSelect
              value={selectedEvent?.event ?? null}
              onChange={handleEventSelect}
              placeholder="Events…"
              showAll={false}
              className="alpaca-input w-55"
              options={eventsData.map((ev) => ({
                value: ev.event,
                label: `#${ev.rank} ${ev.ticker} — ${ev.event.slice(0, 40)}${ev.event.length > 40 ? '…' : ''}`,
              }))}
            />
          ) : undefined
        }
        onLoad={handleLoad}
        showTradeControls={bars.length > 0}
      />

      {/* Event card */}
      {selectedEvent && <IntradayEventCard event={selectedEvent} />}

      {bars.length > 0 && (
        <SimEntryPanel
          topSlot={
            <>
              <ChartTypeToggle
                chartType={chartType}
                onChange={(t) => dispatch({ type: 'SET_CHART_TYPE', chartType: t })}
                extraButtons={
                  <>
                    {selectedEvent && selectedEvent.peers.length > 0 && (
                      <button
                        className={`sim-chart-btn${showPeers ? ' active' : ''}`}
                        onClick={() => dispatch({ type: 'TOGGLE_PEERS' })}
                        type="button"
                        style={showPeers ? { borderColor: '#f59e0b', color: '#f59e0b' } : undefined}
                      >
                        Peers ({selectedEvent.peers.slice(0, 4).join(', ')})
                      </button>
                    )}
                    <button
                      className="sim-chart-btn"
                      onClick={() => dispatch({ type: 'ADD_EXTRA_DATE', date: prevDate })}
                      type="button"
                    >
                      + Day before ({prevDate})
                    </button>
                    <button
                      className="sim-chart-btn"
                      onClick={() => dispatch({ type: 'ADD_EXTRA_DATE', date: nextDate })}
                      type="button"
                    >
                      + Day after ({nextDate})
                    </button>
                    {extraDates.length > 0 && (
                      <button
                        className="sim-chart-btn"
                        onClick={() => dispatch({ type: 'RESET_EXTRA_DATES' })}
                        type="button"
                      >
                        Reset days
                      </button>
                    )}
                  </>
                }
              />
              <div className="dtrade-chart-hint">
                {tradeMode === 'long'
                  ? `Left click to buy $${value} · Right click to sell ${value}% · Hold 1s to configure`
                  : `Left click to short $${value} · Right click to cover ${value}% · Hold 1s to configure`}
                {showPeers && peerTickers.length > 0 && (
                  <span style={{ marginLeft: 8 }}>
                    {peerTickers.map((t, i) => (
                      <span key={t} style={{ color: PEER_COLORS[i], marginLeft: 6 }}>
                        ■ {t}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              <div ref={containerRef} className="alpaca-chart-container">
                <div ref={dayLinesRef} className="alpaca-chart-daylines" />
              </div>
            </>
          }
          tradeMode={tradeMode}
          strategy={intradayStrategy}
          presets={INTRADAY_SIM_PRESETS}
          onPreset={applyPreset}
          textMode={textMode}
          onTextModeToggle={() => dispatch({ type: 'TOGGLE_TEXT_MODE', date: query.date })}
          onExportPdf={handleExportPdf}
          onClear={clear}
          ai={{
            onAiSim: handleAiSim,
            aiSimDisabled: !selectedEvent,
            onSimulateAll: eventsData?.length ? handleSimulateAll : undefined,
            aiDelay,
            onAiDelayChange: (d: number) => dispatch({ type: 'SET_AI_DELAY', delay: d }),
          }}
          nextSide={nextSide}
          onNextSideChange={(s) => dispatch({ type: 'SET_NEXT_SIDE', side: s as Side })}
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

      <AllDialog
        open={simAllRunning || !!simAllResults}
        onClose={() => dispatch({ type: 'SIM_ALL_CLOSE' })}
        running={simAllRunning}
        results={simAllResults}
        aiDelay={aiDelay}
        onAiDelayChange={(d) => dispatch({ type: 'SET_AI_DELAY', delay: d })}
        onReload={handleSimulateAll}
      />
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
