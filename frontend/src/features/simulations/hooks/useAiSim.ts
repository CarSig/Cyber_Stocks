import { useCallback } from 'react';
import type { Dispatch, MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBars } from '@/features/charts/api';
import type { IntradayEvent } from '@/features/charts/api';
import type { Action } from '@/features/simulations/utils/sim';
import { DateUtils } from '@/utils/date';
import { detectShortDirection, calcEntryDateTimeForStrategy, getExitTime, isVolatilityStrategy, resolveVolatilityExit, nextWeekday } from '../utils';
import { intradayStrategy } from '../reducers/baseStrategy';
import type { IntradaySimAction, EntryStrategy, ExitStrategy } from '../reducers/intradayReducer';

type Opts = {
  selectedEvent: IntradayEvent | null;
  aiDelay: number;
  entryStrategy: EntryStrategy;
  exitStrategy: ExitStrategy;
  timeframe: string;
  dispatch: Dispatch<IntradaySimAction>;
  nextActionId: MutableRefObject<number>;
};

export function useAiSim({ selectedEvent, aiDelay, entryStrategy, exitStrategy, timeframe, dispatch, nextActionId }: Opts) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!selectedEvent) return;
    const primaryTicker = selectedEvent.ticker.split('/')[0].trim();
    const isShort = detectShortDirection(primaryTicker, selectedEvent.trade_idea);

    const chartDate = selectedEvent.chart_date;
    const { entryTime, entryDate, exitDate: baseExitDate } = calcEntryDateTimeForStrategy(
      entryStrategy,
      selectedEvent.chart_time,
      chartDate,
      aiDelay,
      selectedEvent.timing,
      timeframe,
    );
    const entryIso = DateUtils.timeToIso(entryTime, entryDate);

    const isVolStrategy = isVolatilityStrategy(exitStrategy);

    // For volatility strategies we need bars to resolve the exit bar
    let exitIso: string;
    let exitTime: string;
    let exitDate: string;

    if (isVolStrategy) {
      const fiveDaysOut = nextWeekday(nextWeekday(nextWeekday(nextWeekday(nextWeekday(entryDate)))));
      // Determine latest date we may need bars for
      const latestDate = exitStrategy === 'vol-next-day' ? nextWeekday(entryDate)
        : exitStrategy === 'vol-same-day' ? entryDate
        : fiveDaysOut;

      const dates = Array.from(new Set([entryDate, latestDate]));
      const allBarsArrays = await Promise.all(
        dates.map((d) =>
          queryClient.fetchQuery({
            queryKey: ['alpaca-bars', primaryTicker, d, timeframe],
            queryFn: () => getBars(primaryTicker, d, timeframe),
            staleTime: Infinity,
          }).then((r) => r.bars),
        ),
      );
      const allBars = allBarsArrays.flat().sort((a, b) => a.t.localeCompare(b.t));
      exitIso = resolveVolatilityExit(exitStrategy, allBars, entryIso, entryDate, timeframe);
      exitTime = exitIso.slice(11, 16);
      exitDate = exitIso.slice(0, 10);
    } else {
      const fixedExitTime = getExitTime(exitStrategy, timeframe) as string;
      exitDate = baseExitDate;
      exitTime = fixedExitTime;
      exitIso = DateUtils.timeToIso(exitTime, exitDate);

      if (entryDate !== exitDate) {
        await queryClient.prefetchQuery({
          queryKey: ['alpaca-bars', primaryTicker, exitDate, timeframe],
          queryFn: () => getBars(primaryTicker, exitDate, timeframe),
          staleTime: Infinity,
        });
      }
    }

    const newActions: Action[] = [
      { id: nextActionId.current++, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
      { id: nextActionId.current++, timestamp: exitIso, time: exitTime, side: isShort ? 'cover' : 'sell', value: 100 },
    ];

    const mode = isShort ? 'short' : 'long';
    dispatch({ type: 'SET_TRADE_MODE', mode, date: chartDate });
    dispatch({ type: 'SET_ACTIONS', actions: newActions, textValue: intradayStrategy.toText(chartDate, newActions) });
  }, [selectedEvent, aiDelay, entryStrategy, exitStrategy, timeframe, dispatch, nextActionId, queryClient]);
}
