import { DateUtils } from '@/utils/date';
import type { Action } from '@/features/simulations/utils/sim';
import type { IntradayEvent } from '@/features/charts/api';
import { makeSimReducer, initialBaseSimState } from './baseReducer';
import type { BaseSimAction } from './baseReducer';
import { intradayStrategy } from './baseStrategy';
import { prevWeekday, nextWeekday } from '../utils';

export type SimAllRow = {
  rank: number;
  ticker: string;
  event: string;
  trade_idea: string;
  action: 'buy' | 'short';
  chartDate: string;
  chartTime: string;
  firstDate: string;
  firstTime: string;
  preMarket: boolean;
  afterHours: boolean;
  entryDate: string;
  entryTime: string;
  exitDate: string;
  daysAfter: number | null;
  profitPct: number | null;
  error?: string;
};

export type IntradaySimState = ReturnType<typeof initialIntradayState>;

export type EntryStrategy = 'first-candle';
export type ExitStrategy =
  | '15:45'
  | '15:59'
  | 'vol-same-day'
  | 'vol-next-day'
  | 'vol-hold'
  | 'vol-hold-3x'
  | 'vol-hold-eod'
  | 'vol-hold-vwap'
  | 'vol-hold-confirm'
  | 'vol-trail'
  | 'vol-staged';

export type CombinationRow = {
  entryStrategy: EntryStrategy;
  exitStrategy: ExitStrategy;
  wins: number;
  losses: number;
  total: number;
  avgWin: number | null;
  avgLoss: number | null;
  avgTotal: number | null;
};

export type IntradaySimAction =
  | BaseSimAction<Action>
  | { type: 'LOAD_EVENT'; event: IntradayEvent; timeframe: string }
  | { type: 'LOAD_BARS'; ticker: string; date: string; timeframe: string }
  | { type: 'ADD_EXTRA_DATE'; date: string }
  | { type: 'ADD_EXTRA_DATES'; dates: string[] }
  | { type: 'RESET_EXTRA_DATES' }
  | { type: 'SET_AI_DELAY'; delay: number }
  | { type: 'SET_ENTRY_STRATEGY'; entryStrategy: EntryStrategy }
  | { type: 'SET_EXIT_STRATEGY'; exitStrategy: ExitStrategy }
  | { type: 'SIM_ALL_START' }
  | { type: 'SIM_ALL_DONE'; results: SimAllRow[] }
  | { type: 'SIM_ALL_CLOSE' }
  | { type: 'COMB_START' }
  | { type: 'COMB_DONE'; results: CombinationRow[] }
  | { type: 'COMB_CLOSE' };

function syncTextDate(prev: string, newDate: string): string {
  const lines = prev.split('\n');
  if (/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? '')) {
    lines[0] = newDate;
    return lines.join('\n');
  }
  return newDate + (prev ? '\n' + prev : '');
}

const defaultDate = () => DateUtils.lastWeekday(DateUtils.todayStr());

const baseReducer = makeSimReducer(intradayStrategy);

export function initialIntradayState() {
  const date = defaultDate();
  return {
    ...initialBaseSimState<Action>(date, 'area'),
    date,
    timeframe: '5Min',
    query: { ticker: 'CRWD', date, timeframe: '5Min' },
    selectedEvent: null as IntradayEvent | null,
    extraDates: [] as string[],
    simAllResults: null as SimAllRow[] | null,
    simAllRunning: false,
    combResults: null as CombinationRow[] | null,
    combRunning: false,
    aiDelay: 1,
    entryStrategy: 'default' as EntryStrategy,
    exitStrategy: '15:45' as ExitStrategy,
  };
}

export function pickPersistable(s: IntradaySimState) {
  return {
    date: s.date,
    timeframe: s.timeframe,
    query: s.query,
    actions: s.actions,
    value: s.value,
    startShares: s.startShares,
    manualTime: s.manualTime,
    nextSide: s.nextSide,
    textValue: s.textValue,
    chartType: s.chartType,
    tradeMode: s.tradeMode,
    selectedEvent: s.selectedEvent,
    extraDates: s.extraDates,
    aiDelay: s.aiDelay,
    entryStrategy: s.entryStrategy,
    exitStrategy: s.exitStrategy,
    // NOT persisted: simAllResults, simAllRunning, combResults, combRunning, textMode
  };
}

export function intradayReducer(
  state: ReturnType<typeof initialIntradayState>,
  action: IntradaySimAction,
): ReturnType<typeof initialIntradayState> {
  switch (action.type) {
    case 'LOAD_EVENT': {
      const primaryTicker = action.event.ticker.split('/')[0].trim();
      const date = action.event.chart_date;
      const extraDates = [prevWeekday(date), nextWeekday(date)];
      return {
        ...state,
        selectedEvent: action.event,
        date,
        textValue: syncTextDate(state.textValue, date),
        query: { ticker: primaryTicker, date, timeframe: action.timeframe },
        actions: [],
        extraDates,
      };
    }
    case 'LOAD_BARS':
      return {
        ...state,
        query: { ticker: action.ticker, date: action.date, timeframe: action.timeframe },
        actions: [],
        textValue: action.date,
        extraDates: [],
      };
    case 'SET_DATE':
      return {
        ...state,
        date: action.date,
        textValue: syncTextDate(state.textValue, action.date),
        selectedEvent: null,
      };
    case 'SET_TIMEFRAME':
      return { ...state, timeframe: action.timeframe };
    case 'ADD_EXTRA_DATE':
      return { ...state, extraDates: [...new Set([...state.extraDates, action.date])] };
    case 'ADD_EXTRA_DATES': {
      const merged = [...new Set([...state.extraDates, ...action.dates])];
      // No-op if nothing new — avoids a redundant re-render / chart rebuild.
      if (merged.length === state.extraDates.length) return state;
      return { ...state, extraDates: merged };
    }
    case 'RESET_EXTRA_DATES':
      return { ...state, extraDates: [] };
    case 'SET_AI_DELAY':
      return { ...state, aiDelay: action.delay };
    case 'SET_ENTRY_STRATEGY':
      return { ...state, entryStrategy: action.entryStrategy };
    case 'SET_EXIT_STRATEGY':
      return { ...state, exitStrategy: action.exitStrategy };
    case 'SIM_ALL_START':
      return { ...state, simAllRunning: true, simAllResults: null };
    case 'SIM_ALL_DONE':
      return { ...state, simAllRunning: false, simAllResults: action.results };
    case 'SIM_ALL_CLOSE':
      return { ...state, simAllRunning: false, simAllResults: null };
    case 'COMB_START':
      return { ...state, combRunning: true, combResults: null };
    case 'COMB_DONE':
      return { ...state, combRunning: false, combResults: action.results };
    case 'COMB_CLOSE':
      return { ...state, combRunning: false, combResults: null };
    default:
      return baseReducer(state, action as BaseSimAction<Action>);
  }
}
