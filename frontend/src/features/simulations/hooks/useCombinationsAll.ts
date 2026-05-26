import { useCallback } from 'react';
import type { Dispatch } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IntradayEvent } from '@/features/charts/api';
import { simOneEvent } from '../utils/simOneEvent';
import type { IntradaySimAction, CombinationRow, EntryStrategy, ExitStrategy } from '../reducers/intradayReducer';

const ALL_ENTRY_STRATEGIES: EntryStrategy[] = ['first-candle'];
const ALL_EXIT_STRATEGIES: ExitStrategy[] = [
  '15:45',
  '15:59',
  'vol-same-day',
  'vol-next-day',
  'vol-hold',
  'vol-hold-3x',
  'vol-hold-eod',
  'vol-hold-vwap',
  'vol-hold-confirm',
];

type Opts = {
  filteredEvents: IntradayEvent[];
  aiDelay: number;
  timeframe: string;
  fmtTime: (iso: string) => string;
  dispatch: Dispatch<IntradaySimAction>;
};

export function useCombinationsAll({ filteredEvents, aiDelay, timeframe, fmtTime, dispatch }: Opts) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!filteredEvents.length) return;
    dispatch({ type: 'COMB_START' });

    const combos: [EntryStrategy, ExitStrategy][] = ALL_ENTRY_STRATEGIES.flatMap((en) =>
      ALL_EXIT_STRATEGIES.map((ex): [EntryStrategy, ExitStrategy] => [en, ex]),
    );

    const rows: CombinationRow[] = [];

    // Run one combination at a time (each combo batches events 4 at a time internally)
    for (const [entryStrategy, exitStrategy] of combos) {
      const BATCH = 4;
      const profitPcts: number[] = [];

      for (let i = 0; i < filteredEvents.length; i += BATCH) {
        const batch = filteredEvents.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((ev) => simOneEvent(ev, entryStrategy, exitStrategy, aiDelay, timeframe, fmtTime, queryClient)),
        );
        for (const r of results) {
          if (r.profitPct != null) profitPcts.push(r.profitPct);
        }
      }

      const wins = profitPcts.filter((p) => p >= 0);
      const losses = profitPcts.filter((p) => p < 0);
      const avgWin = wins.length ? wins.reduce((s, p) => s + p, 0) / wins.length : null;
      const avgLoss = losses.length ? losses.reduce((s, p) => s + p, 0) / losses.length : null;
      const avgTotal = profitPcts.length ? profitPcts.reduce((s, p) => s + p, 0) / profitPcts.length : null;

      rows.push({
        entryStrategy,
        exitStrategy,
        wins: wins.length,
        losses: losses.length,
        total: profitPcts.length,
        avgWin,
        avgLoss,
        avgTotal,
      });
    }

    rows.sort((a, b) => (b.avgTotal ?? -Infinity) - (a.avgTotal ?? -Infinity));
    dispatch({ type: 'COMB_DONE', results: rows });
  }, [filteredEvents, aiDelay, timeframe, fmtTime, dispatch, queryClient]);
}
