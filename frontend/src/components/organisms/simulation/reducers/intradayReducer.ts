import { DateUtils } from '@/utils/date';
import type { Action } from '@/utils/sim';
import type { IntradayEvent } from '@/api/alpaca';
import { makeSimReducer, initialBaseSimState } from './baseReducer';
import type { BaseSimAction } from './baseReducer';
import { intradayStrategy } from './baseStrategy';

export type SimAllRow = {
  rank: number;
  ticker: string;
  event: string;
  trade_idea: string;
  action: 'buy' | 'short';
  chartTime: string;
  preMarket: boolean;
  entryTime: string;
  profitPct: number | null;
  error?: string;
};

export type IntradaySimState = ReturnType<typeof initialIntradayState>;

export type IntradaySimAction =
  | BaseSimAction<Action>
  | { type: 'LOAD_EVENT'; event: IntradayEvent; timeframe: string }
  | { type: 'LOAD_BARS'; ticker: string; date: string; timeframe: string }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIMEFRAME'; timeframe: string }
  | { type: 'TOGGLE_PEERS' }
  | { type: 'ADD_EXTRA_DATE'; date: string }
  | { type: 'RESET_EXTRA_DATES' }
  | { type: 'SET_AI_DELAY'; delay: number }
  | { type: 'SIM_ALL_START' }
  | { type: 'SIM_ALL_DONE'; results: SimAllRow[] }
  | { type: 'SIM_ALL_CLOSE' };

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
    showPeers: false,
    extraDates: [] as string[],
    simAllResults: null as SimAllRow[] | null,
    simAllRunning: false,
    aiDelay: 1,
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
      return {
        ...state,
        selectedEvent: action.event,
        date,
        textValue: syncTextDate(state.textValue, date),
        query: { ticker: primaryTicker, date, timeframe: action.timeframe },
        actions: [],
        extraDates: [],
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
    case 'TOGGLE_PEERS':
      return { ...state, showPeers: !state.showPeers };
    case 'ADD_EXTRA_DATE':
      return { ...state, extraDates: [...new Set([...state.extraDates, action.date])] };
    case 'RESET_EXTRA_DATES':
      return { ...state, extraDates: [] };
    case 'SET_AI_DELAY':
      return { ...state, aiDelay: action.delay };
    case 'SIM_ALL_START':
      return { ...state, simAllRunning: true, simAllResults: null };
    case 'SIM_ALL_DONE':
      return { ...state, simAllRunning: false, simAllResults: action.results };
    case 'SIM_ALL_CLOSE':
      return { ...state, simAllRunning: false, simAllResults: null };
    default:
      return baseReducer(state, action as BaseSimAction<Action>);
  }
}
