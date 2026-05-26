import type { QueryClient } from '@tanstack/react-query';
import { getBars } from '@/features/charts/api';
import type { IntradayEvent } from '@/features/charts/api';
import type { Action } from '@/features/simulations/utils/sim';
import { runLongSimulation, runShortSimulation } from '@/features/simulations/utils/sim';
import { DateUtils } from '@/utils/date';
import {
  detectShortDirection,
  calcEntryDateTimeForStrategy,
  getExitTime,
  isVolatilityStrategy,
  resolveVolatilityExit,
  nextWeekday,
} from './index';
import type { EntryStrategy, ExitStrategy, SimAllRow } from '../reducers/intradayReducer';

export async function simOneEvent(
  ev: IntradayEvent,
  entryStrategy: EntryStrategy,
  exitStrategy: ExitStrategy,
  aiDelay: number,
  timeframe: string,
  fmtTime: (iso: string) => string,
  queryClient: QueryClient,
): Promise<SimAllRow> {
  const primaryTicker = ev.ticker.split('/')[0].trim();
  const isShort = detectShortDirection(primaryTicker, ev.trade_idea);
  const action = isShort ? ('short' as const) : ('buy' as const);

  try {
    const { entryTime, entryDate, exitDate: baseExitDate } = calcEntryDateTimeForStrategy(
      entryStrategy,
      ev.chart_time,
      ev.chart_date,
      aiDelay,
      ev.timing,
      timeframe,
    );

    const fetchBars = (date: string) =>
      queryClient.fetchQuery({
        queryKey: ['alpaca-bars', primaryTicker, date, timeframe],
        queryFn: () => getBars(primaryTicker, date, timeframe),
        staleTime: Infinity,
      });

    const isVol = isVolatilityStrategy(exitStrategy);
    let datesToFetch: string[];
    if (isVol) {
      const fiveDaysOut = nextWeekday(nextWeekday(nextWeekday(nextWeekday(nextWeekday(entryDate)))));
      const latestDate =
        exitStrategy === 'vol-next-day' ? nextWeekday(entryDate) :
        exitStrategy === 'vol-same-day' ? entryDate :
        fiveDaysOut;
      datesToFetch = Array.from(new Set([entryDate, latestDate]));
    } else {
      datesToFetch = Array.from(new Set([entryDate, baseExitDate]));
    }

    const allBarsArrays = await Promise.all(datesToFetch.map((d) => fetchBars(d).then((r) => r.bars)));
    const bars = allBarsArrays.flat().sort((a, b) => a.t.localeCompare(b.t));

    const entryIso = DateUtils.timeToIso(entryTime, entryDate);

    let exitIso: string;
    let exitTime: string;
    let exitDate: string;

    if (isVol) {
      exitIso = resolveVolatilityExit(exitStrategy, bars, entryIso, entryDate, timeframe);
      exitTime = exitIso.slice(11, 16);
      exitDate = exitIso.slice(0, 10);
    } else {
      const fixedExitTime = getExitTime(exitStrategy, timeframe) as string;
      exitDate = baseExitDate;
      exitTime = fixedExitTime;
      exitIso = DateUtils.timeToIso(exitTime, exitDate);
    }

    const daysAfter =
      ev.timing !== 'during'
        ? Math.round((new Date(exitDate).getTime() - new Date(ev.first_date).getTime()) / 86_400_000)
        : null;

    if (!bars.length) {
      return {
        rank: ev.rank, ticker: primaryTicker, event: ev.event, trade_idea: ev.trade_idea, action,
        chartDate: ev.chart_date, chartTime: ev.chart_time, firstDate: ev.first_date, firstTime: ev.first_time,
        preMarket: false, afterHours: ev.after_hours, entryDate, entryTime, exitDate, daysAfter,
        profitPct: null, error: 'No data',
      };
    }

    const actions: Action[] = [
      { id: 1, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
      { id: 2, timestamp: exitIso, time: exitTime, side: isShort ? 'cover' : 'sell', value: 100 },
    ];

    const result = isShort
      ? runShortSimulation(bars, actions, fmtTime)
      : runLongSimulation(bars, actions, fmtTime, 0);

    return {
      rank: ev.rank, ticker: primaryTicker, event: ev.event, trade_idea: ev.trade_idea, action,
      chartDate: ev.chart_date, chartTime: ev.chart_time, firstDate: ev.first_date, firstTime: ev.first_time,
      preMarket: false, afterHours: ev.after_hours, entryDate, entryTime, exitDate, daysAfter,
      profitPct: result.profitPct,
    };
  } catch (err) {
    return {
      rank: ev.rank, ticker: primaryTicker, event: ev.event, trade_idea: ev.trade_idea, action,
      chartDate: ev.chart_date, chartTime: ev.chart_time, firstDate: ev.first_date, firstTime: ev.first_time,
      preMarket: false, afterHours: ev.after_hours,
      entryDate: ev.chart_date, entryTime: '15:59', exitDate: ev.chart_date, daysAfter: null,
      profitPct: null, error: err instanceof Error ? err.message : 'Failed',
    };
  }
}
