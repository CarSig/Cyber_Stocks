import { DateUtils } from '@/utils/date';
import type { Side, Action } from '@/utils/sim';
import type { IntradayEvent } from '@/api/alpaca';

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

export type IntradaySimState = {
  date: string;
  timeframe: string;
  query: { ticker: string; date: string; timeframe: string };
  actions: Action[];
  nextSide: Side;
  value: string;
  startShares: string;
  manualTime: string;
  textMode: boolean;
  textValue: string;
  chartType: 'line' | 'area' | 'candlestick';
  tradeMode: 'long' | 'short';
  selectedEvent: IntradayEvent | null;
  showPeers: boolean;
  extraDates: string[];
  simAllResults: SimAllRow[] | null;
  simAllRunning: boolean;
  aiDelay: number;
};

export type IntradaySimAction =
  | { type: 'LOAD_EVENT'; event: IntradayEvent; timeframe: string }
  | { type: 'LOAD_BARS'; ticker: string; date: string; timeframe: string }
  | { type: 'SET_TRADE_MODE'; mode: 'long' | 'short' }
  | { type: 'SET_CHART_TYPE'; chartType: 'line' | 'area' | 'candlestick' }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIMEFRAME'; timeframe: string }
  | { type: 'SET_ACTIONS'; actions: Action[]; textValue: string }
  | { type: 'ADD_ACTION'; action: Action }
  | { type: 'REMOVE_ACTION'; id: number }
  | { type: 'UPDATE_ACTION'; id: number; field: 'side' | 'value'; val: string }
  | { type: 'CLEAR_ACTIONS' }
  | { type: 'SET_TEXT'; raw: string; parsedDate?: string; parsedActions?: Action[] }
  | { type: 'SET_MANUAL_TIME'; time: string }
  | { type: 'SET_VALUE'; value: string }
  | { type: 'SET_START_SHARES'; startShares: string }
  | { type: 'SET_NEXT_SIDE'; side: Side }
  | { type: 'TOGGLE_TEXT_MODE'; currentActions: Action[] }
  | { type: 'TOGGLE_PEERS' }
  | { type: 'ADD_EXTRA_DATE'; date: string }
  | { type: 'RESET_EXTRA_DATES' }
  | { type: 'SET_AI_DELAY'; delay: number }
  | { type: 'SIM_ALL_START' }
  | { type: 'SIM_ALL_DONE'; results: SimAllRow[] }
  | { type: 'SIM_ALL_CLOSE' };

function actionsToText(date: string, actions: Action[]): string {
  return [
    date,
    ...actions.map((a) => `${a.time}, ${a.side === 'sell' || a.side === 'cover' ? -a.value : a.value}`),
  ].join('\n');
}

function syncTextDate(prev: string, newDate: string): string {
  const lines = prev.split('\n');
  if (/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? '')) {
    lines[0] = newDate;
    return lines.join('\n');
  }
  return newDate + (prev ? '\n' + prev : '');
}

const defaultDate = () => DateUtils.lastWeekday(DateUtils.todayStr());

export function initialIntradaySimState(): IntradaySimState {
  const date = defaultDate();
  return {
    date,
    timeframe: '5Min',
    query: { ticker: 'CRWD', date, timeframe: '5Min' },
    actions: [],
    nextSide: 'buy',
    value: '100',
    startShares: '0',
    manualTime: '',
    textMode: false,
    textValue: date,
    chartType: 'area',
    tradeMode: 'long',
    selectedEvent: null,
    showPeers: false,
    extraDates: [],
    simAllResults: null,
    simAllRunning: false,
    aiDelay: 1,
  };
}

export function intradaySimReducer(state: IntradaySimState, action: IntradaySimAction): IntradaySimState {
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
    case 'SET_TRADE_MODE':
      return {
        ...state,
        tradeMode: action.mode,
        nextSide: action.mode === 'short' ? 'short' : 'buy',
        actions: [],
        textValue: state.query.date,
      };
    case 'SET_CHART_TYPE':
      return { ...state, chartType: action.chartType };
    case 'SET_DATE':
      return {
        ...state,
        date: action.date,
        textValue: syncTextDate(state.textValue, action.date),
        selectedEvent: null,
      };
    case 'SET_TIMEFRAME':
      return { ...state, timeframe: action.timeframe };
    case 'SET_ACTIONS':
      return { ...state, actions: action.actions, textValue: action.textValue };
    case 'ADD_ACTION': {
      const next = [...state.actions, action.action];
      return { ...state, actions: next, textValue: actionsToText(state.query.date, next) };
    }
    case 'REMOVE_ACTION': {
      const next = state.actions.filter((a) => a.id !== action.id);
      return { ...state, actions: next, textValue: actionsToText(state.query.date, next) };
    }
    case 'UPDATE_ACTION': {
      const isExit = (s: Side) => s === 'sell' || s === 'cover';
      const next = state.actions.map((a) => {
        if (a.id !== action.id) return a;
        if (action.field === 'value')
          return { ...a, value: isExit(a.side) ? Math.min(100, Number(action.val)) : Number(action.val) };
        const newSide = action.val as Side;
        return { ...a, side: newSide, value: isExit(newSide) ? Math.min(100, a.value) : a.value };
      });
      return { ...state, actions: next, textValue: actionsToText(state.query.date, next) };
    }
    case 'CLEAR_ACTIONS':
      return {
        ...state,
        actions: [],
        textValue: state.query.date,
        nextSide: state.tradeMode === 'short' ? 'short' : 'buy',
      };
    case 'SET_TEXT':
      return {
        ...state,
        textValue: action.raw,
        ...(action.parsedDate && action.parsedDate !== state.date ? { date: action.parsedDate } : {}),
        ...(action.parsedActions?.length ? { actions: action.parsedActions } : {}),
      };
    case 'SET_MANUAL_TIME':
      return { ...state, manualTime: action.time };
    case 'SET_VALUE':
      return { ...state, value: action.value };
    case 'SET_START_SHARES':
      return { ...state, startShares: action.startShares };
    case 'SET_NEXT_SIDE':
      return { ...state, nextSide: action.side };
    case 'TOGGLE_TEXT_MODE':
      return {
        ...state,
        textMode: !state.textMode,
        textValue: !state.textMode ? actionsToText(state.query.date, action.currentActions) : state.textValue,
      };
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
  }
}
