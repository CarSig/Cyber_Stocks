import { useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBars } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';

import SimEntryPanel from './components/entry-panel/SimEntryPanel';
import ChartTypeToggle from './components/ChartTypeToggle';
import OrderControls from './components/OrderControls';
import { useExportSimPdf } from './hooks/useExportSimPdf';
import { dayTradeReducer, initialDayTradeState } from './reducers/dayTradeReducer';
import { intradayStrategy } from './reducers/baseStrategy';

import { useApplyPreset } from './hooks/useApplyPreset';
import { useAddManualAction } from './hooks/useAddManualAction';
import { usePriceChart } from './hooks/usePriceChart';
import { useChartPopover } from './hooks/useChartPopover';
import { useActionMarkers } from './hooks/useActionMarkers';
import { useCrosshairTracker } from './hooks/useCrosshairTracker';
import { useSimChartClick } from './hooks/useSimChartClick';
import { parseIntradayText } from './utils/parseSimText';
import ChartActionPopover from './components/ChartActionPopover';
import { DateUtils } from '@/utils/date';
import { PriceUtils } from '@/utils/price';

const dayTradeToIso = (t: unknown) => new Date((t as number) * 1000).toISOString();

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
import { runLongSimulation, runShortSimulation, buildSimStats } from '@/utils/sim';

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
    textValue,
    chartType,
    tradeMode,
  } = s;

  const nextActionId = useRef(Math.max(0, ...s.actions.map((a) => a.id)) + 1);

  const containerRef = useRef<HTMLDivElement>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<string>(value);
  const tradeModeRef = useRef<'long' | 'short'>(tradeMode);
  const actionsRef = useRef(actions);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

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

  // Price chart
  const chartRef = usePriceChart(containerRef, bars, chartType, {
    toTime: (b) => Math.floor(new Date(b.t).getTime() / 1000) as unknown as import('lightweight-charts').Time,
    timeVisible: true,
    secondsVisible: false,
  });

  const popover = useChartPopover<Action>(
    dispatch,
    nextActionId,
    query.date,
    tradeMode,
    DateUtils.fmtTime,
    (id, iso, label, side, val) => ({ id, timestamp: iso, time: label, side, value: val }),
  );

  const getHoveredIso = useCrosshairTracker(chartRef, dayTradeToIso, [bars, chartType]);

  useSimChartClick(containerRef, chartRef, bars, chartType, {
    actionsRef: actionsRef as React.MutableRefObject<Action[]>,
    valueRef,
    tradeModeRef,
    nextIdRef: nextActionId,
    dispatch,
    date: query.date,
    fmtLabel: DateUtils.fmtTime,
    createAction: (id: number, iso: string, label: string, side: 'buy' | 'sell' | 'short' | 'cover', val: number) => ({ id, timestamp: iso, time: label, side, value: val }),
    onPopoverOpen: popover.openAdd,
    onEditPopoverOpen: popover.openEdit,
    getHoveredIso,
  });

  // Action markers
  useActionMarkers(chartRef, actions);

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
          textValue={textValue}
          onTextChange={handleTextChange}
          toolbar={intradayStrategy.buildToolbar(s, dispatch, {
            presets: DAYTRADE_PRESETS,
            onPreset: applyPreset,
            onExportPdf: handleExportPdf,
            onClear: clear,
          })}
          manual={intradayStrategy.buildManual(s, dispatch, {
            inputType: 'time',
            onAdd: addManualAction,
          })}
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
      {popover.add && <ChartActionPopover popover={popover.add} tradeMode={tradeMode} />}
      {popover.edit && <ChartActionPopover mode="edit" popover={popover.edit} tradeMode={tradeMode} />}
    </div>
  );
}
