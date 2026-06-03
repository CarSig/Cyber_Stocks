import { useEffect, useRef, useMemo, useReducer, useCallback } from 'react';
import './Simulation.css';
import { useQuery, useQueries } from '@tanstack/react-query';
import { syncIntradayMarkers, setupDayLines } from '@/features/charts/utils';
import { getBars, getIntradayEvents } from '@/features/charts/api';
import type { AlpacaBar } from '@/types';
import SimEntryPanel from './components/entry-panel/SimEntryPanel';
import EventFilters from './components/EventFilters';
import EventChartSlot from './components/EventChartSlot';
import DayTradeChartSlot from './components/DayTradeChartSlot';
import IntradayEventCard from './components/intraday/IntradayEventCard';
import ContextPanel from './components/intraday/ContextPanel';
import OrderControls from './components/OrderControls';
import AllDialog from './components/intraday/AllDialog';
import CombinationsDialog from './components/intraday/CombinationsDialog';
import { intradayReducer, initialIntradayState } from './reducers/intradayReducer';
import type { IntradaySimState, IntradaySimAction } from './reducers/intradayReducer';
import { intradayStrategy } from './reducers/baseStrategy';
import {
  useApplyPreset,
  useAddManualAction,
  useExportSimPdf,
  useSimRefs,
  useTextChange,
  usePortfolioMarkers,
  useSimResult,
  useIntradayChart,
  useEventFilters,
  useAiSim,
  useSimulateAll,
  useCombinationsAll,
  useRowSelect,
} from './hooks';
import { buildIntradayChartConfig } from './utils';
import { DateUtils } from '@/utils/date';
import { useTimezone } from '@/context/TimezoneContext';
import { PriceUtils } from '@/utils/price';
import { buildSimStats, type Action } from '@/features/simulations/utils/sim';
import { INTRADAY_SIM_PRESETS } from './eventSimPresets';
import { DAYTRADE_PRESETS } from './dayTradePresets';
import { load, save } from './persistence';
import { pickPersistable } from './reducers/intradayReducer';

type IntradaySimulationProps = { mode: 'daytrade'; ticker: string } | { mode: 'event' };

function initState(tickerOverride: string | undefined, mode: 'daytrade' | 'event'): IntradaySimState {
  const base = initialIntradayState();
  const ticker = tickerOverride ?? base.query.ticker;
  const persisted = load<IntradaySimState>('intraday', mode, ticker);
  const seeded = persisted ? { ...base, ...persisted } : base;
  return tickerOverride ? { ...seeded, query: { ...seeded.query, ticker: tickerOverride } } : seeded;
}

export default function IntradaySimulation(props: IntradaySimulationProps) {
  const { fmtTime, toChartTime } = useTimezone();
  const tickerOverride = props.mode === 'daytrade' ? props.ticker : undefined;
  const [s, dispatch] = useReducer(intradayReducer, undefined, () => initState(tickerOverride, props.mode));
  const {
    date,
    timeframe,
    query,
    actions,
    value,
    startShares,
    manualTime,
    nextSide,
    textValue,
    chartType,
    tradeMode,
    selectedEvent,
    extraDates,
    simAllResults,
    simAllRunning,
    combResults,
    combRunning,
    aiDelay,
    entryStrategy,
    exitStrategy,
  } = s;

  // In daytrade mode, keep query.ticker in sync with the prop.
  useEffect(() => {
    if (props.mode !== 'daytrade') return;
    if (query.ticker === props.ticker) return;
    dispatch({ type: 'LOAD_BARS', ticker: props.ticker, date, timeframe });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode === 'daytrade' ? props.ticker : null]);

  // Persist user input to sessionStorage so a page reload restores the session.
  useEffect(() => {
    const ticker = props.mode === 'daytrade' ? props.ticker : s.query.ticker;
    save('intraday', props.mode, ticker, pickPersistable(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  const nextActionId = useRef(Math.max(0, ...s.actions.map((a) => a.id)) + 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dayLinesRef = useRef<HTMLDivElement>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const { valueRef, tradeModeRef, actionsRef } = useSimRefs(value, tradeMode, actions);
  const tzOffsetRef = useRef<number>(0);

  const { data: eventsData } = useQuery({
    queryKey: ['intraday-events'],
    queryFn: getIntradayEvents,
    staleTime: Infinity,
    enabled: props.mode === 'event',
  });

  const { tickerFilter, setTickerFilter, timingFilter, setTimingFilter, filteredEvents, isFiltered } =
    useEventFilters(eventsData);

  const { data, isPending, error } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', query.ticker, query.date, query.timeframe],
    queryFn: () => getBars(query.ticker, query.date, query.timeframe),
    enabled: Boolean(query.ticker && query.date),
    staleTime: 5 * 60 * 1000,
  });

  const allDates = useMemo(() => Array.from(new Set([query.date, ...extraDates])).sort(), [query.date, extraDates]);
  const prevDate = useMemo(() => DateUtils.prevWeekday(allDates[0] ?? query.date), [allDates, query.date]);
  const nextDate = useMemo(
    () => DateUtils.nextWeekday(allDates[allDates.length - 1] ?? query.date),
    [allDates, query.date],
  );

  const extraQueries = useQueries({
    queries: extraDates.map((d) => ({
      queryKey: ['alpaca-bars', query.ticker, d, query.timeframe] as const,
      queryFn: () => getBars(query.ticker, d, query.timeframe),
      enabled: Boolean(query.ticker && d),
      staleTime: 5 * 60 * 1000,
    })),
  });

  // `useQueries` returns a fresh array reference every render, so keying the memo
  // on `extraQueries` itself would recompute `bars` (new ref) every render and
  // rebuild the chart on every render — which races lightweight-charts' draw loop
  // and can freeze the UI. Key on a stable signature derived from each query's
  // last update time instead, so `bars` only changes when bar data actually does.
  const extraSig = extraQueries.map((q) => `${q.dataUpdatedAt}`).join('|');
  const bars = useMemo(() => {
    const all = [...extraQueries.flatMap((q) => q.data?.bars ?? []), ...(data?.bars ?? [])];
    return all.sort((a, b) => a.t.localeCompare(b.t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, extraSig]);

  useEffect(() => {
    if (!bars.length) return;
    const b = bars[0];
    const ref = new Date(b.t);
    const chartTime = toChartTime(b.t, ref);
    tzOffsetRef.current = (chartTime as unknown as number) - Math.floor(new Date(b.t).getTime() / 1000);
  }, [bars, toChartTime]);

  const intradayChartConfig = useMemo(() => buildIntradayChartConfig(bars, toChartTime), [bars, toChartTime]);

  const { chartRef, popoverNodes } = useIntradayChart({
    containerRef,
    bars,
    chartType,
    chartConfig: intradayChartConfig,
    toIso: (t: unknown) => new Date(((t as number) - tzOffsetRef.current) * 1000).toISOString(),
    actionsRef: actionsRef as React.MutableRefObject<Action[]>,
    valueRef,
    tradeModeRef,
    nextIdRef: nextActionId,
    dispatch,
    date: query.date,
    tradeMode,
    fmtTime,
    actions,
    onAfterAttach:
      props.mode === 'event'
        ? () => {
            const offset = tzOffsetRef.current;
            if (chartRef.current) {
              syncIntradayMarkers(chartRef.current.series, actions, selectedEvent, query.date, offset);
            }
            return dayLinesRef.current
              ? setupDayLines(chartRef.current!.chart, dayLinesRef.current, containerRef.current!, bars, offset)
              : undefined;
          }
        : undefined,
  });

  useEffect(() => {
    if (props.mode !== 'event') return;
    const ref = chartRef.current;
    if (!ref) return;
    syncIntradayMarkers(ref.series, actions, selectedEvent, query.date, tzOffsetRef.current);
  }, [actions, selectedEvent, query.date, chartRef, props.mode]);

  const result = useSimResult(bars, actions, startShares, tradeMode, fmtTime);
  const portfolioMarkers = usePortfolioMarkers(result);
  const handleTextChange = useTextChange(query.date, dispatch);

  const presets = props.mode === 'event' ? INTRADAY_SIM_PRESETS : DAYTRADE_PRESETS;
  const applyPreset = useApplyPreset(
    presets,
    (p, id) => ({ id, timestamp: DateUtils.timeToIso(p.time, query.date), time: p.time, side: p.side, value: p.value }),
    intradayStrategy,
    query.date,
    dispatch,
    nextActionId,
  );

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

  const handleEventSelect = useCallback(
    (eventLabel: string | null) => {
      if (!eventLabel) return;
      const ev = eventsData?.find((e) => e.event === eventLabel);
      if (!ev) return;
      dispatch({ type: 'LOAD_EVENT', event: ev, timeframe });
    },
    [eventsData, timeframe],
  );

  const handleAiSim = useAiSim({
    selectedEvent: selectedEvent ?? null,
    aiDelay,
    entryStrategy,
    exitStrategy,
    timeframe,
    dispatch,
    nextActionId,
  });

  // When the exit-strategy preset changes (with an event already selected),
  // regenerate the AI actions so the chart markers and the ACTIONS panel reflect
  // the new preset's entry/exit timing immediately — no need to re-click "AI".
  useEffect(() => {
    if (props.mode !== 'event' || !selectedEvent) return;
    void handleAiSim();
    // handleAiSim is keyed on exitStrategy (and the rest of its inputs); re-run
    // only when the preset or the selected event changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitStrategy, selectedEvent]);
  const handleSimulateAll = useSimulateAll({
    filteredEvents,
    aiDelay,
    entryStrategy,
    exitStrategy,
    timeframe,
    fmtTime,
    dispatch,
  });
  const handleCombinationsAll = useCombinationsAll({ filteredEvents, aiDelay, timeframe, fmtTime, dispatch });
  const handleRowSelect = useRowSelect({ eventsData, timeframe, exitStrategy, dispatch, nextActionId });
  const handleExportPdf = useExportSimPdf(
    query.ticker,
    result,
    [
      { ref: containerRef, label: 'Price Chart' },
      { ref: portfolioChartRef, label: 'Portfolio Value' },
    ],
    'Time (ET)',
  );

  const clear = useCallback(() => dispatch({ type: 'CLEAR_ACTIONS', date: query.date }), [query.date]);

  const orderControlsOnLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const loadTicker = props.mode === 'daytrade' ? props.ticker : query.ticker;
    dispatch({ type: 'LOAD_BARS', ticker: loadTicker, date, timeframe } as IntradaySimAction);
  };

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      <OrderControls
        {...intradayStrategy.buildOrderControls(s, dispatch, {
          maxDate: DateUtils.lastWeekday(DateUtils.todayStr()),
          onLoad: orderControlsOnLoad,
          showTradeControls: bars.length > 0,
          eventSlot:
            props.mode === 'event' && eventsData?.length ? (
              <EventFilters
                eventsData={eventsData}
                tickerFilter={tickerFilter}
                onTickerFilterChange={setTickerFilter}
                timingFilter={timingFilter}
                onTimingFilterChange={setTimingFilter}
                filteredEvents={filteredEvents}
                selectedEvent={selectedEvent}
                onEventSelect={handleEventSelect}
              />
            ) : undefined,
        })}
      />

      {props.mode === 'event' && selectedEvent && (
        <>
          <IntradayEventCard event={selectedEvent} />
          <ContextPanel ticker={selectedEvent.ticker.split('/')[0].trim()} />
        </>
      )}

      {bars.length > 0 && (
        <SimEntryPanel
          topSlot={
            props.mode === 'event' ? (
              <EventChartSlot
                chartType={chartType}
                tradeMode={tradeMode}
                value={value}
                containerRef={containerRef}
                dayLinesRef={dayLinesRef}
                prevDate={prevDate}
                nextDate={nextDate}
                extraDates={extraDates}
                dispatch={dispatch}
              />
            ) : (
              <DayTradeChartSlot
                chartType={chartType}
                tradeMode={tradeMode}
                value={value}
                containerRef={containerRef}
                dispatch={dispatch}
              />
            )
          }
          tradeMode={tradeMode}
          strategy={intradayStrategy}
          textValue={textValue}
          onTextChange={handleTextChange}
          toolbar={intradayStrategy.buildToolbar(s, dispatch, {
            presets,
            onPreset: applyPreset,
            onExportPdf: handleExportPdf,
            onClear: clear,
            ai:
              props.mode === 'event'
                ? {
                    onAiSim: handleAiSim,
                    aiSimDisabled: !selectedEvent,
                    onSimulateAll: filteredEvents.length ? handleSimulateAll : undefined,
                    simulateAllLabel: isFiltered ? `Simulate Selected (${filteredEvents.length})` : 'Simulate All',
                    onCombinationsAll: filteredEvents.length ? handleCombinationsAll : undefined,
                    aiDelay,
                    onAiDelayChange: (d) => dispatch({ type: 'SET_AI_DELAY', delay: d }),
                    exitStrategy,
                    onExitStrategyChange: (v) => dispatch({ type: 'SET_EXIT_STRATEGY', exitStrategy: v }),
                  }
                : undefined,
          })}
          manual={intradayStrategy.buildManual(s, dispatch, { inputType: 'time', onAdd: addManualAction })}
          actions={intradayStrategy.buildActions(s, dispatch)}
          result={{
            stats: result ? buildSimStats(result, tradeMode, PriceUtils.fmt) : null,
            history: result?.portfolioHistory ?? [],
            markers: portfolioMarkers,
            transactions: result?.transactions ?? null,
            chartRef: portfolioChartRef,
          }}
        />
      )}

      {props.mode === 'event' && (
        <>
          <AllDialog
            open={simAllRunning || !!simAllResults}
            onClose={() => dispatch({ type: 'SIM_ALL_CLOSE' })}
            running={simAllRunning}
            results={simAllResults}
            aiDelay={aiDelay}
            onAiDelayChange={(d) => dispatch({ type: 'SET_AI_DELAY', delay: d })}
            onReload={handleSimulateAll}
            onRowSelect={handleRowSelect}
            exitStrategy={exitStrategy}
          />
          <CombinationsDialog
            open={combRunning || !!combResults}
            onClose={() => dispatch({ type: 'COMB_CLOSE' })}
            running={combRunning}
            results={combResults}
            onSelectCombo={(_entry, exit) => {
              dispatch({ type: 'SET_EXIT_STRATEGY', exitStrategy: exit });
            }}
          />
        </>
      )}
      {popoverNodes}
    </div>
  );
}
