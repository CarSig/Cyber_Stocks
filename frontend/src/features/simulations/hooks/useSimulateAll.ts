import { useCallback } from 'react';
import type { Dispatch } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBars } from '@/api/alpaca';
import type { IntradayEvent } from '@/api/alpaca';
import type { Action } from '@/utils/sim';
import { runLongSimulation, runShortSimulation } from '@/utils/sim';
import { DateUtils } from '@/utils/date';
import { detectShortDirection, calcEntryDateTime, getExitTime } from '../utils';
import type { IntradaySimAction, SimAllRow } from '../reducers/intradayReducer';

type Opts = {
  filteredEvents: IntradayEvent[];
  aiDelay: number;
  exitAtClose: boolean;
  timeframe: string;
  fmtTime: (iso: string) => string;
  dispatch: Dispatch<IntradaySimAction>;
};

export function useSimulateAll({ filteredEvents, aiDelay, exitAtClose, timeframe, fmtTime, dispatch }: Opts) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!filteredEvents.length) return;
    dispatch({ type: 'SIM_ALL_START' });

    const simOne = async (ev: IntradayEvent): Promise<SimAllRow> => {
      const primaryTicker = ev.ticker.split('/')[0].trim();
      const isShort = detectShortDirection(primaryTicker, ev.trade_idea);
      const action = isShort ? ('short' as const) : ('buy' as const);

      try {
        const { entryTime, entryDate, exitDate } = calcEntryDateTime(
          ev.chart_time,
          ev.chart_date,
          aiDelay,
          ev.timing,
          timeframe,
        );
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

        const daysAfter =
          ev.timing !== 'during'
            ? Math.round((new Date(exitDate).getTime() - new Date(ev.first_date).getTime()) / 86_400_000)
            : null;

        if (!bars.length)
          return {
            rank: ev.rank, ticker: primaryTicker, event: ev.event, trade_idea: ev.trade_idea,
            action, chartDate: ev.chart_date, chartTime: ev.chart_time,
            firstDate: ev.first_date, firstTime: ev.first_time, preMarket: false,
            afterHours: ev.after_hours, entryDate, entryTime, exitDate, daysAfter,
            profitPct: null, error: 'No data',
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
          rank: ev.rank, ticker: primaryTicker, event: ev.event, trade_idea: ev.trade_idea,
          action, chartDate: ev.chart_date, chartTime: ev.chart_time,
          firstDate: ev.first_date, firstTime: ev.first_time, preMarket: false,
          afterHours: ev.after_hours, entryDate, entryTime, exitDate, daysAfter,
          profitPct: result.profitPct,
        };
      } catch (err) {
        return {
          rank: ev.rank, ticker: primaryTicker, event: ev.event, trade_idea: ev.trade_idea,
          action, chartDate: ev.chart_date, chartTime: ev.chart_time,
          firstDate: ev.first_date, firstTime: ev.first_time, preMarket: false,
          afterHours: ev.after_hours, entryDate: ev.chart_date, entryTime: '15:59',
          exitDate: ev.chart_date, daysAfter: null, profitPct: null,
          error: err instanceof Error ? err.message : 'Failed',
        };
      }
    };

    const BATCH = 4;
    const rows: SimAllRow[] = [];
    for (let i = 0; i < filteredEvents.length; i += BATCH) {
      const batch = filteredEvents.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(simOne));
      rows.push(...results);
    }

    rows.sort((a, b) => (b.profitPct ?? -Infinity) - (a.profitPct ?? -Infinity));
    dispatch({ type: 'SIM_ALL_DONE', results: rows });
  }, [filteredEvents, aiDelay, exitAtClose, timeframe, fmtTime, dispatch, queryClient]);
}
