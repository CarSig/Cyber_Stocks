import { useCallback } from 'react';
import type { Dispatch } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IntradayEvent } from '@/features/charts/api';
import { simOneEvent } from '../utils/simOneEvent';
import type { IntradaySimAction, SimAllRow, EntryStrategy, ExitStrategy } from '../reducers/intradayReducer';

type Opts = {
  filteredEvents: IntradayEvent[];
  aiDelay: number;
  entryStrategy: EntryStrategy;
  exitStrategy: ExitStrategy;
  timeframe: string;
  fmtTime: (iso: string) => string;
  dispatch: Dispatch<IntradaySimAction>;
};

export function useSimulateAll({
  filteredEvents,
  aiDelay,
  entryStrategy,
  exitStrategy,
  timeframe,
  fmtTime,
  dispatch,
}: Opts) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!filteredEvents.length) return;
    dispatch({ type: 'SIM_ALL_START' });

    const BATCH = 4;
    const rows: SimAllRow[] = [];
    for (let i = 0; i < filteredEvents.length; i += BATCH) {
      const batch = filteredEvents.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((ev) => simOneEvent(ev, entryStrategy, exitStrategy, aiDelay, timeframe, fmtTime, queryClient)),
      );
      rows.push(...results);
    }

    rows.sort((a, b) => (b.profitPct ?? -Infinity) - (a.profitPct ?? -Infinity));
    dispatch({ type: 'SIM_ALL_DONE', results: rows });
  }, [filteredEvents, aiDelay, entryStrategy, exitStrategy, timeframe, fmtTime, dispatch, queryClient]);
}
