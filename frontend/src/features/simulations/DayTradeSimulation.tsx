import { useRef, useCallback, useMemo, useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBars } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';

import SimEntryPanel from './components/entry-panel/SimEntryPanel';
import DayTradeChartSlot from './components/DayTradeChartSlot';
import OrderControls from './components/OrderControls';
import { dayTradeReducer, initialDayTradeState } from './reducers/dayTradeReducer';
import { intradayStrategy } from './reducers/baseStrategy';
import {
  useExportSimPdf, useApplyPreset, useAddManualAction, useSimRefs,
  useTextChange, usePortfolioMarkers, useSimResult, useIntradayChart,
} from './hooks';
import { DateUtils } from '@/utils/date';
import { DAYTRADE_PRESETS } from './dayTradePresets';
import { PriceUtils } from '@/utils/price';
import type { Side, Action } from '@/utils/sim';
import { buildSimStats } from '@/utils/sim';


const chartConfig = {
  toTime: (b: { t: string }) =>
    Math.floor(new Date(b.t).getTime() / 1000) as unknown as import('lightweight-charts').Time,
  timeVisible: true,
  secondsVisible: false,
};

export default function DayTradeSimulation({ ticker }: { ticker: string }) {
  const [s, dispatch] = useReducer(dayTradeReducer, undefined, initialDayTradeState);
  const { date, timeframe, query, actions, nextSide, value, startShares, manualTime, textValue, chartType, tradeMode } = s;

  const nextActionId = useRef(Math.max(0, ...s.actions.map((a) => a.id)) + 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const { valueRef, tradeModeRef, actionsRef } = useSimRefs(value, tradeMode, actions);

  const { data, isPending, error } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', ticker, query.date, query.timeframe],
    queryFn: () => getBars(ticker, query.date, query.timeframe),
    enabled: Boolean(ticker && query.date),
    staleTime: 5 * 60 * 1000,
  });

  const bars = useMemo(() => data?.bars ?? [], [data]);
  const result = useSimResult(bars, actions, startShares, tradeMode, DateUtils.fmtTime);

  const { popoverNodes } = useIntradayChart({
    containerRef, bars, chartType, chartConfig, toIso: DateUtils.unixSecondsToIso,
    actionsRef: actionsRef as React.MutableRefObject<Action[]>,
    valueRef, tradeModeRef, nextIdRef: nextActionId,
    dispatch, date: query.date, tradeMode, fmtTime: DateUtils.fmtTime, actions,
  });

  const applyPreset = useApplyPreset(
    DAYTRADE_PRESETS,
    (p, id) => ({ id, timestamp: DateUtils.timeToIso(p.time, query.date), time: p.time, side: p.side as Side, value: p.value }),
    intradayStrategy, query.date, dispatch, nextActionId,
  );

  const addManualAction = useAddManualAction(
    intradayStrategy, manualTime, nextSide, value, query.date, dispatch, nextActionId,
    () => dispatch({ type: 'SET_MANUAL_TIME', time: '' }),
  );

  const clear = useCallback(() => dispatch({ type: 'CLEAR_ACTIONS', date: query.date }), [query.date]);
  const handleExportPdf = useExportSimPdf(ticker, result, [
    { ref: containerRef, label: 'Price Chart' },
    { ref: portfolioChartRef, label: 'Portfolio Value' },
  ], 'Time (ET)');
  const portfolioMarkers = usePortfolioMarkers(result);
  const handleTextChange = useTextChange(query.date, dispatch);

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      <OrderControls
        {...intradayStrategy.buildOrderControls(s, dispatch, {
          maxDate: DateUtils.lastWeekday(DateUtils.todayStr()),
          onLoad: (e) => { e.preventDefault(); dispatch({ type: 'LOAD_BARS', date, timeframe }); },
          showTradeControls: bars.length > 0,
        })}
      />

      {bars.length > 0 && (
        <SimEntryPanel
          topSlot={<DayTradeChartSlot chartType={chartType} tradeMode={tradeMode} value={value} containerRef={containerRef} dispatch={dispatch} />}
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
      {popoverNodes}
    </div>
  );
}
