import { useCallback } from 'react';
import type { Dispatch, MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBars } from '@/features/charts/api';
import type { IntradayEvent } from '@/features/charts/api';
import type { Action } from '@/utils/sim';
import { DateUtils } from '@/utils/date';
import { detectShortDirection, calcEntryDateTime, getExitTime } from '../utils';
import { intradayStrategy } from '../reducers/baseStrategy';
import type { IntradaySimAction } from '../reducers/intradayReducer';

type Opts = {
  selectedEvent: IntradayEvent | null;
  aiDelay: number;
  exitAtClose: boolean;
  timeframe: string;
  dispatch: Dispatch<IntradaySimAction>;
  nextActionId: MutableRefObject<number>;
};

export function useAiSim({ selectedEvent, aiDelay, exitAtClose, timeframe, dispatch, nextActionId }: Opts) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
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
  }, [selectedEvent, aiDelay, exitAtClose, timeframe, dispatch, nextActionId, queryClient]);
}
