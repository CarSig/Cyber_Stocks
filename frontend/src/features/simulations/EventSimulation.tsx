import { useEffect, useRef, useMemo, useReducer, useCallback } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { syncIntradayMarkers } from '@/features/charts/utils';
import { setupDayLines } from '@/features/charts/utils';
import { getBars, getIntradayEvents } from '@/features/charts/api';
import type { AlpacaBar } from '@/types';
import SimEntryPanel from './components/entry-panel/SimEntryPanel';
import EventFilters from './components/EventFilters';
import EventChartSlot from './components/EventChartSlot';
import IntradayEventCard from './components/intraday/IntradayEventCard';
import OrderControls from './components/OrderControls';
import AllDialog from './components/intraday/AllDialog';
import { intradayReducer, initialIntradayState } from './reducers/intradayReducer';
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
  useRowSelect,
} from './hooks';
import { buildIntradayChartConfig } from './utils';
import { DateUtils } from '@/utils/date';
import { useTimezone } from '@/context/TimezoneContext';
import { PriceUtils } from '@/utils/price';
import { buildSimStats, type Action } from '@/utils/sim';
import { INTRADAY_SIM_PRESETS } from './eventSimPresets';

export default function EventSimulation() {
  const { fmtTime, toChartTime } = useTimezone();
  const [s, dispatch] = useReducer(intradayReducer, undefined, initialIntradayState);
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
    aiDelay,
    exitAtClose,
  } = s;

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

  const bars = useMemo(() => {
    const all = [...extraQueries.flatMap((q) => q.data?.bars ?? []), ...(data?.bars ?? [])];
    return all.sort((a, b) => a.t.localeCompare(b.t));
  }, [data, extraQueries]);

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
    onAfterAttach: () => {
      const offset = tzOffsetRef.current;
      if (chartRef.current) {
        syncIntradayMarkers(chartRef.current.series, actions, selectedEvent, query.date, offset);
      }
      return dayLinesRef.current
        ? setupDayLines(chartRef.current!.chart, dayLinesRef.current, containerRef.current!, bars, offset)
        : undefined;
    },
  });

  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;
    syncIntradayMarkers(ref.series, actions, selectedEvent, query.date, tzOffsetRef.current);
  }, [actions, selectedEvent, query.date, chartRef]);

  const result = useSimResult(bars, actions, startShares, tradeMode, fmtTime);
  const portfolioMarkers = usePortfolioMarkers(result);
  const handleTextChange = useTextChange(query.date, dispatch);

  const applyPreset = useApplyPreset(
    INTRADAY_SIM_PRESETS,
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
    exitAtClose,
    timeframe,
    dispatch,
    nextActionId,
  });
  const handleSimulateAll = useSimulateAll({ filteredEvents, aiDelay, exitAtClose, timeframe, fmtTime, dispatch });
  const handleRowSelect = useRowSelect({ eventsData, timeframe, exitAtClose, dispatch, nextActionId });
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

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      <OrderControls
        {...intradayStrategy.buildOrderControls(s, dispatch, {
          maxDate: DateUtils.lastWeekday(DateUtils.todayStr()),
          onLoad: (e) => {
            e.preventDefault();
            dispatch({ type: 'LOAD_BARS', ticker: query.ticker, date, timeframe });
          },
          showTradeControls: bars.length > 0,
          eventSlot: eventsData?.length ? (
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

      {selectedEvent && <IntradayEventCard event={selectedEvent} />}

      {bars.length > 0 && (
        <SimEntryPanel
          topSlot={
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
          }
          tradeMode={tradeMode}
          strategy={intradayStrategy}
          textValue={textValue}
          onTextChange={handleTextChange}
          toolbar={intradayStrategy.buildToolbar(s, dispatch, {
            presets: INTRADAY_SIM_PRESETS,
            onPreset: applyPreset,
            onExportPdf: handleExportPdf,
            onClear: clear,
            ai: {
              onAiSim: handleAiSim,
              aiSimDisabled: !selectedEvent,
              onSimulateAll: filteredEvents.length ? handleSimulateAll : undefined,
              simulateAllLabel: isFiltered ? `Simulate Selected (${filteredEvents.length})` : 'Simulate All',
              aiDelay,
              onAiDelayChange: (d) => dispatch({ type: 'SET_AI_DELAY', delay: d }),
              exitAtClose,
              onExitAtCloseChange: (v) => dispatch({ type: 'SET_EXIT_AT_CLOSE', exitAtClose: v }),
            },
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
      {popoverNodes}
    </div>
  );
}
