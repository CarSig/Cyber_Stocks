import { useEffect, useRef, useCallback, useMemo, useReducer, useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { LineSeries } from 'lightweight-charts';

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
import { usePriceChart } from './hooks/usePriceChart';
import { useChartPopover } from './hooks/useChartPopover';
import { useCrosshairTracker } from './hooks/useCrosshairTracker';

import { useSimChartClick } from './hooks/useSimChartClick';
import { parseIntradayText } from './utils/parseSimText';
import { detectShortDirection, calcEntryDateTime, getExitTime } from './utils/intradaySimUtils';
import ChartActionPopover from './components/ChartActionPopover';
import { DateUtils } from '@/utils/date';
import { useTimezone } from '@/context/TimezoneContext';
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

import type { Action, SimResult } from '@/utils/sim';
import { runLongSimulation, runShortSimulation, buildSimStats } from '@/utils/sim';

const PEER_COLORS = ['#f59e0b', '#60a5fa', '#f472b6', '#34d399'];

export default function IntradaySimulation() {
  const { fmtTime, toChartTime } = useTimezone();
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
    textValue,
    chartType,
    tradeMode,
    selectedEvent,
    showPeers,
    extraDates,
    simAllResults,
    simAllRunning,
    aiDelay,
    exitAtClose,
  } = s;

  const [tickerFilter, setTickerFilter] = useState<string | null>(null);
  const [timingFilter, setTimingFilter] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const nextActionId = useRef(Math.max(0, ...s.actions.map((a) => a.id)) + 1);

  const containerRef = useRef<HTMLDivElement>(null);
  const dayLinesRef = useRef<HTMLDivElement>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<string>(value);
  const tradeModeRef = useRef<'long' | 'short'>(tradeMode);
  const actionsRef = useRef(actions);
  const tzOffsetRef = useRef<number>(0);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const { data: eventsData } = useQuery<IntradayEvent[]>({
    queryKey: ['intraday-events'],
    queryFn: getIntradayEvents,
    staleTime: Infinity,
  });

  const filteredEvents = useMemo(
    () =>
      eventsData?.filter(
        (ev) =>
          (!tickerFilter || ev.ticker.split('/')[0].trim() === tickerFilter) &&
          (!timingFilter || ev.timing === timingFilter),
      ) ?? [],
    [eventsData, tickerFilter, timingFilter],
  );
  const isFiltered = !!(tickerFilter || timingFilter);

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
    if (tradeMode === 'short') return runShortSimulation(bars, actions, fmtTime);
    return runLongSimulation(bars, actions, fmtTime, Math.max(0, Number(startShares) || 0));
  }, [bars, actions, startShares, tradeMode, fmtTime]);

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

  // Price chart with timezone-aware time conversion and peer overlays
  const chartRef = usePriceChart(containerRef, bars, chartType, {
    toTime: (b) => {
      const ref = new Date(bars[0]?.t ?? b.t);
      const chartTime = toChartTime(b.t, ref);
      // keep tzOffsetRef in sync for marker/crosshair inverse conversion
      const utcSec = Math.floor(new Date(b.t).getTime() / 1000);
      tzOffsetRef.current = (chartTime as unknown as number) - utcSec;
      return chartTime;
    },
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: (time: number, tickMarkType: number) => {
      const d = new Date(time * 1000);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      if (tickMarkType <= 2) {
        const day = d.getUTCDate();
        const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        return `${day} ${mon} ${hh}:${mm}`;
      }
      return `${hh}:${mm}`;
    },
    extraSeries: (chart, toTime) => {
      return peerBars.map(({ ticker: peerTicker, bars: pb }, i) => {
        if (!pb.length) return () => {};
        const color = PEER_COLORS[i % PEER_COLORS.length];
        const scaleId = `peer_${i}`;
        const peerSeries = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceScaleId: scaleId,
          title: peerTicker,
        });
        chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
        peerSeries.setData(pb.map((b) => ({ time: toTime(b), value: b.c })));
        return () => chart.removeSeries(peerSeries);
      });
    },
  });

  const popover = useChartPopover<Action>(
    dispatch,
    nextActionId,
    query.date,
    tradeMode,
    fmtTime,
    (id, iso, label, side, val) => ({ id, timestamp: iso, time: label, side, value: val }),
  );

  const intradayToIso = useCallback(
    (t: unknown) => new Date(((t as number) - tzOffsetRef.current) * 1000).toISOString(),
    [tzOffsetRef],
  );
  const getHoveredIso = useCrosshairTracker(chartRef, intradayToIso, [bars, chartType, peerBars]);

  useSimChartClick(containerRef, chartRef, bars, chartType, {
    actionsRef: actionsRef as React.MutableRefObject<Action[]>,
    valueRef,
    tradeModeRef,
    nextIdRef: nextActionId,
    dispatch,
    date: query.date,
    fmtLabel: fmtTime,
    createAction: (id: number, iso: string, label: string, side: 'buy' | 'sell' | 'short' | 'cover', val: number) => ({ id, timestamp: iso, time: label, side, value: val }),
    onPopoverOpen: popover.openAdd,
    onEditPopoverOpen: popover.openEdit,
    getHoveredIso,
    onAfterAttach: () => {
      const offset = tzOffsetRef.current;
      if (chartRef.current) {
        syncIntradayMarkers(chartRef.current.series, actions, selectedEvent, query.date, offset);
      }
      const cleanupDayLines = dayLinesRef.current
        ? setupDayLines(chartRef.current!.chart, dayLinesRef.current, containerRef.current!, bars, offset)
        : () => {};
      return cleanupDayLines;
    },
  }, [peerBars]);

  // Sync action + event markers onto chart
  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;
    syncIntradayMarkers(ref.series, actions, selectedEvent, query.date, tzOffsetRef.current);
  }, [actions, selectedEvent, query.date, chartRef]);

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

  const clear = useCallback(() => dispatch({ type: 'CLEAR_ACTIONS', date: query.date }), [query.date]);

  const handleSimulateAll = useCallback(async () => {
    if (!filteredEvents.length) return;
    dispatch({ type: 'SIM_ALL_START' });

    const simOne = async (ev: IntradayEvent): Promise<SimAllRow> => {
      const primaryTicker = ev.ticker.split('/')[0].trim();
      const isShort = detectShortDirection(primaryTicker, ev.trade_idea);
      const action = isShort ? ('short' as const) : ('buy' as const);

      try {
        const { entryTime, entryDate, exitDate } = calcEntryDateTime(ev.chart_time, ev.chart_date, aiDelay, ev.timing, timeframe);
        const exitTime = getExitTime(exitAtClose, timeframe);

        const fetchBars = (date: string) =>
          queryClient.fetchQuery({
            queryKey: ['alpaca-bars', primaryTicker, date, timeframe],
            queryFn: () => getBars(primaryTicker, date, timeframe),
            staleTime: Infinity,
          });

        const { bars: entryBars } = await fetchBars(entryDate);
        const extraBars = exitDate !== entryDate ? (await fetchBars(exitDate)).bars : [];
        const bars = [...entryBars, ...extraBars].sort((a, b) => a.t.localeCompare(b.t));

        const daysAfter = ev.timing !== 'during'
          ? Math.round((new Date(exitDate).getTime() - new Date(ev.first_date).getTime()) / 86_400_000)
          : null;

        if (!bars.length)
          return {
            rank: ev.rank,
            ticker: primaryTicker,
            event: ev.event,
            trade_idea: ev.trade_idea,
            action,
            chartDate: ev.chart_date,
            chartTime: ev.chart_time,
            firstDate: ev.first_date,
            firstTime: ev.first_time,
            preMarket: false,
            afterHours: ev.after_hours,
            entryDate,
            entryTime,
            exitDate,
            daysAfter,
            profitPct: null,
            error: 'No data',
          };

        const entryIso = DateUtils.timeToIso(entryTime, entryDate);
        const exitIso = DateUtils.timeToIso(exitTime, exitDate);
        const actions: Action[] = [
          { id: 1, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
          { id: 2, timestamp: exitIso, time: exitTime, side: isShort ? 'cover' : 'sell', value: 100 },
        ];

        const result = isShort
          ? runShortSimulation(bars, actions, fmtTime)
          : runLongSimulation(bars, actions, fmtTime, 0);

        return {
          rank: ev.rank,
          ticker: primaryTicker,
          event: ev.event,
          trade_idea: ev.trade_idea,
          action,
          chartDate: ev.chart_date,
          chartTime: ev.chart_time,
          firstDate: ev.first_date,
          firstTime: ev.first_time,
          preMarket: false,
          afterHours: ev.after_hours,
          entryDate,
          entryTime,
          exitDate,
          daysAfter,
          profitPct: result.profitPct,
        };
      } catch (err) {
        return {
          rank: ev.rank,
          ticker: primaryTicker,
          event: ev.event,
          trade_idea: ev.trade_idea,
          action,
          chartDate: ev.chart_date,
          chartTime: ev.chart_time,
          firstDate: ev.first_date,
          firstTime: ev.first_time,
          preMarket: false,
          afterHours: ev.after_hours,
          entryDate: ev.chart_date,
          entryTime: '15:59',
          exitDate: ev.chart_date,
          daysAfter: null,
          profitPct: null,
          error: err instanceof Error ? err.message : 'Failed',
        };
      }
    };

    // Run in batches of 4 to avoid rate-limiting
    const BATCH = 4;
    const rows: SimAllRow[] = [];
    for (let i = 0; i < filteredEvents.length; i += BATCH) {
      const batch = filteredEvents.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(simOne));
      rows.push(...results);
    }

    rows.sort((a, b) => (b.profitPct ?? -Infinity) - (a.profitPct ?? -Infinity));
    dispatch({ type: 'SIM_ALL_DONE', results: rows });
  }, [filteredEvents, aiDelay, exitAtClose, timeframe, fmtTime, queryClient]);

  const handleRowSelect = useCallback(
    (row: SimAllRow) => {
      const ev = eventsData?.find((e) => e.rank === row.rank);
      if (!ev) return;
      dispatch({ type: 'LOAD_EVENT', event: ev, timeframe });
      const exitTime = getExitTime(exitAtClose, timeframe);
      const entryIso = DateUtils.timeToIso(row.entryTime, row.entryDate);
      const exitIso = DateUtils.timeToIso(exitTime, row.exitDate);
      const newActions: Action[] = [
        { id: nextActionId.current++, timestamp: entryIso, time: row.entryTime, side: row.action === 'short' ? 'short' : 'buy', value: 100 },
        { id: nextActionId.current++, timestamp: exitIso, time: exitTime, side: row.action === 'short' ? 'cover' : 'sell', value: 100 },
      ];
      const mode = row.action === 'short' ? 'short' : 'long';
      dispatch({ type: 'SET_TRADE_MODE', mode, date: row.entryDate });
      dispatch({ type: 'SET_ACTIONS', actions: newActions, textValue: intradayStrategy.toText(row.entryDate, newActions) });
    },
    [eventsData, timeframe, exitAtClose],
  );

  const handleAiSim = useCallback(async () => {
    if (!selectedEvent) return;
    const primaryTicker = selectedEvent.ticker.split('/')[0].trim();
    const isShort = detectShortDirection(primaryTicker, selectedEvent.trade_idea);

    const chartDate = selectedEvent.chart_date;
    const { entryTime, entryDate, exitDate } = calcEntryDateTime(
      selectedEvent.chart_time,
      chartDate,
      aiDelay,
      selectedEvent.timing,
      timeframe,
    );
    const exitTime = getExitTime(exitAtClose, timeframe);
    const entryIso = DateUtils.timeToIso(entryTime, entryDate);
    const exitIso = DateUtils.timeToIso(exitTime, exitDate);

    const newActions: Action[] = [
      { id: nextActionId.current++, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
      { id: nextActionId.current++, timestamp: exitIso, time: exitTime, side: isShort ? 'cover' : 'sell', value: 100 },
    ];

    if (entryDate !== exitDate) {
      await queryClient.prefetchQuery({
        queryKey: ['alpaca-bars', primaryTicker, exitDate, timeframe],
        queryFn: () => getBars(primaryTicker, exitDate, timeframe),
        staleTime: Infinity,
      });
    }

    const mode = isShort ? 'short' : 'long';
    dispatch({ type: 'SET_TRADE_MODE', mode, date: chartDate });
    dispatch({ type: 'SET_ACTIONS', actions: newActions, textValue: intradayStrategy.toText(chartDate, newActions) });
  }, [selectedEvent, aiDelay, exitAtClose, timeframe, queryClient]);

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
          eventsData && eventsData.length > 0 ? (() => {
            const tickers = [...new Set(eventsData.map((ev) => ev.ticker.split('/')[0].trim()))].sort();
            const timings = [...new Set(eventsData.map((ev) => ev.timing))].sort();
            return (
              <>
                <FilterSelect
                  value={tickerFilter}
                  onChange={(v) => { setTickerFilter(v || null); }}
                  placeholder="Ticker…"
                  showAll
                  allLabel="All"
                  className="alpaca-input w-28"
                  options={tickers}
                />
                <FilterSelect
                  value={timingFilter}
                  onChange={(v) => { setTimingFilter(v || null); }}
                  placeholder="Timing…"
                  showAll
                  allLabel="All"
                  className="alpaca-input w-32"
                  options={timings}
                />
                <FilterSelect
                  value={selectedEvent?.event ?? null}
                  onChange={handleEventSelect}
                  placeholder="Events…"
                  showAll={false}
                  className="alpaca-input w-55"
                  options={filteredEvents.map((ev) => ({
                    value: ev.event,
                    label: `#${ev.rank} ${ev.ticker} — ${ev.event.slice(0, 40)}${ev.event.length > 40 ? '…' : ''}`,
                  }))}
                />
              </>
            );
          })() : undefined
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
          textValue={textValue}
          onTextChange={handleTextChange}
          toolbar={{
            presets: INTRADAY_SIM_PRESETS,
            onPreset: applyPreset,
            textMode: s.textMode,
            onTextModeToggle: () => dispatch({ type: 'TOGGLE_TEXT_MODE', date: query.date }),
            onExportPdf: handleExportPdf,
            onClear: clear,
            ai: {
              onAiSim: handleAiSim,
              aiSimDisabled: !selectedEvent,
              onSimulateAll: filteredEvents.length ? handleSimulateAll : undefined,
              simulateAllLabel: isFiltered ? `Simulate Selected (${filteredEvents.length})` : 'Simulate All',
              aiDelay,
              onAiDelayChange: (d: number) => dispatch({ type: 'SET_AI_DELAY', delay: d }),
              exitAtClose,
              onExitAtCloseChange: (v: boolean) => dispatch({ type: 'SET_EXIT_AT_CLOSE', exitAtClose: v }),
            },
          }}
          manual={{
            inputType: 'time',
            inputValue: s.manualTime,
            onInputChange: (v) => dispatch({ type: 'SET_MANUAL_TIME', time: v }),
            value: s.value,
            onValueChange: (v) => dispatch({ type: 'SET_VALUE', value: v }),
            onAdd: addManualAction,
            nextSide: s.nextSide,
            onNextSideChange: (side) => dispatch({ type: 'SET_NEXT_SIDE', side }),
          }}
          actions={{
            list: s.actions,
            onUpdate: (id, field, val) => dispatch({ type: 'UPDATE_ACTION', id, field, val, date: query.date }),
            onRemove: (id) => dispatch({ type: 'REMOVE_ACTION', id, date: query.date }),
          }}
          result={{
            stats: result ? buildSimStats(result, tradeMode, PriceUtils.fmt) : null,
            history: result?.portfolioHistory ?? [],
            markers: portfolioMarkers,
            transactions: result?.transactions ?? null,
            chartRef: portfolioChartRef,
          }}
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
        onRowSelect={handleRowSelect}
      />
      {popover.add && <ChartActionPopover popover={popover.add} tradeMode={tradeMode} />}
      {popover.edit && <ChartActionPopover mode="edit" popover={popover.edit} tradeMode={tradeMode} />}
    </div>
  );
}
