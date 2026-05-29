import { useCallback } from 'react';
import type { Dispatch, MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBars } from '@/features/charts/api';
import type { IntradayEvent } from '@/features/charts/api';
import type { Action } from '@/features/simulations/utils/sim';
import { DateUtils } from '@/utils/date';
import {
  detectShortDirection,
  calcEntryDateTimeForStrategy,
  getExitTime,
  isVolatilityStrategy,
  resolveExitLegs,
  nextWeekday,
} from '../utils';
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

export function useAiSim({
  selectedEvent,
  aiDelay,
  entryStrategy,
  exitStrategy,
  timeframe,
  dispatch,
  nextActionId,
}: Opts) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!selectedEvent) return;
    const primaryTicker = selectedEvent.ticker.split('/')[0].trim();
    const isShort = detectShortDirection(primaryTicker, selectedEvent.trade_idea);

    const chartDate = selectedEvent.chart_date;
    const {
      entryTime,
      entryDate,
      exitDate: baseExitDate,
    } = calcEntryDateTimeForStrategy(
      entryStrategy,
      selectedEvent.chart_time,
      chartDate,
      aiDelay,
      selectedEvent.timing,
      timeframe,
    );
    const entryIso = DateUtils.timeToIso(entryTime, entryDate);

    const isVolStrategy = isVolatilityStrategy(exitStrategy);

    // Exit legs: complex strategies may scale out across several bars/days; the
    // rest resolve to a single full-close leg.
    let legs: { t: string; fraction: number }[];

    if (isVolStrategy) {
      const fiveDaysOut = nextWeekday(nextWeekday(nextWeekday(nextWeekday(nextWeekday(entryDate)))));
      // Determine latest date we may need bars for
      const latestDate =
        exitStrategy === 'vol-next-day'
          ? nextWeekday(entryDate)
          : exitStrategy === 'vol-same-day'
            ? entryDate
            : fiveDaysOut;

      // Fetch every weekday from entry through the latest possible exit, not just
      // the endpoints — resolveExitLegs scans bars across the whole holding window
      // (volume spikes / ATR moves on the middle days must be visible), and warming
      // the cache here means the chart's per-date queries resolve from cache.
      const dates: string[] = [entryDate];
      for (let d = nextWeekday(entryDate); d <= latestDate; d = nextWeekday(d)) dates.push(d);
      const allBarsArrays = await Promise.all(
        Array.from(new Set(dates)).map((d) =>
          queryClient
            .fetchQuery({
              queryKey: ['alpaca-bars', primaryTicker, d, timeframe],
              queryFn: () => getBars(primaryTicker, d, timeframe),
              staleTime: Infinity,
            })
            .then((r) => r.bars),
        ),
      );
      const allBars = allBarsArrays.flat().sort((a, b) => a.t.localeCompare(b.t));
      legs = resolveExitLegs(exitStrategy, allBars, entryIso, entryDate, timeframe);
    } else {
      const fixedExitTime = getExitTime(exitStrategy, timeframe) as string;
      const exitIso = DateUtils.timeToIso(fixedExitTime, baseExitDate);
      legs = [{ t: exitIso, fraction: 1 }];

      if (entryDate !== baseExitDate) {
        await queryClient.prefetchQuery({
          queryKey: ['alpaca-bars', primaryTicker, baseExitDate, timeframe],
          queryFn: () => getBars(primaryTicker, baseExitDate, timeframe),
          staleTime: Infinity,
        });
      }
    }

    const exitSide: Action['side'] = isShort ? 'cover' : 'sell';
    const newActions: Action[] = [
      { id: nextActionId.current++, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
      ...legs.map((leg) => ({
        id: nextActionId.current++,
        timestamp: leg.t,
        time: leg.t.slice(11, 16),
        side: exitSide,
        value: Math.round(leg.fraction * 100),
      })),
    ];

    const mode = isShort ? 'short' : 'long';
    dispatch({ type: 'SET_TRADE_MODE', mode, date: chartDate });

    // Multi-day strategies can place an exit leg several days out. The chart only
    // loads bars for the dates it knows about, so extend the chart to cover the
    // full holding period — every weekday from the event day up to the furthest
    // action date — otherwise those days' markers have no bars to anchor to and
    // the exit appears to be missing.
    const lastActionDate = newActions.reduce((max, a) => {
      const d = a.timestamp.slice(0, 10);
      return d > max ? d : max;
    }, chartDate);
    const holdingDates: string[] = [];
    for (let d = nextWeekday(chartDate); d <= lastActionDate; d = nextWeekday(d)) {
      holdingDates.push(d);
    }
    // Dispatch once so bars (and the chart) rebuild a single time, not per day.
    if (holdingDates.length) dispatch({ type: 'ADD_EXTRA_DATES', dates: holdingDates });

    dispatch({ type: 'SET_ACTIONS', actions: newActions, textValue: intradayStrategy.toText(chartDate, newActions) });
  }, [selectedEvent, aiDelay, entryStrategy, exitStrategy, timeframe, dispatch, nextActionId, queryClient]);
}
