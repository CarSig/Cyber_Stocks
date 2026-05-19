import type { SimStrategy } from './baseStrategy';

export type BaseSimState<A> = {
  actions: A[];
  nextSide: string;
  value: string;
  startShares: string;
  manualTime: string;
  textMode: boolean;
  textValue: string;
  chartType: 'line' | 'area' | 'candlestick';
  tradeMode: 'long' | 'short';
};

export type BaseSimAction<A> =
  | { type: 'ADD_ACTION'; action: A; date: string }
  | { type: 'REMOVE_ACTION'; id: number; date: string }
  | { type: 'UPDATE_ACTION'; id: number; field: 'side' | 'value'; val: string; date: string }
  | { type: 'SET_ACTIONS'; actions: A[]; textValue: string }
  | { type: 'CLEAR_ACTIONS'; date: string }
  | { type: 'SET_TEXT'; raw: string; parsedDate?: string; parsedActions?: A[] }
  | { type: 'SET_CHART_TYPE'; chartType: 'line' | 'area' | 'candlestick' }
  | { type: 'SET_TRADE_MODE'; mode: 'long' | 'short'; date: string }
  | { type: 'TOGGLE_TEXT_MODE'; date: string }
  | { type: 'SET_VALUE'; value: string }
  | { type: 'SET_START_SHARES'; startShares: string }
  | { type: 'SET_NEXT_SIDE'; side: string }
  | { type: 'SET_MANUAL_TIME'; time: string }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIMEFRAME'; timeframe: string };

export function makeSimReducer<A extends { id: number }>(strategy: SimStrategy<A>) {
  return function baseSimReducer<S extends BaseSimState<A>>(state: S, action: BaseSimAction<A>): S {
    switch (action.type) {
      case 'ADD_ACTION': {
        const next = [...state.actions, action.action];
        return { ...state, actions: next, textValue: strategy.toText(action.date, next) };
      }
      case 'REMOVE_ACTION': {
        const next = state.actions.filter((a) => a.id !== action.id);
        return { ...state, actions: next, textValue: strategy.toText(action.date, next) };
      }
      case 'UPDATE_ACTION': {
        const next = state.actions.map((a) =>
          a.id !== action.id ? a : strategy.updateAction(a, action.field, action.val),
        );
        return { ...state, actions: next, textValue: strategy.toText(action.date, next) };
      }
      case 'SET_ACTIONS':
        return { ...state, actions: action.actions, textValue: action.textValue };
      case 'CLEAR_ACTIONS':
        return {
          ...state,
          actions: [],
          textValue: action.date,
          nextSide: strategy.defaultSide(state.tradeMode),
        };
      case 'SET_TEXT':
        return {
          ...state,
          textValue: action.raw,
          ...(action.parsedDate && action.parsedDate !== (state as unknown as { date?: string }).date
            ? { date: action.parsedDate }
            : {}),
          ...(action.parsedActions?.length ? { actions: action.parsedActions } : {}),
        };
      case 'SET_CHART_TYPE':
        return { ...state, chartType: action.chartType };
      case 'SET_TRADE_MODE':
        return {
          ...state,
          tradeMode: action.mode,
          nextSide: strategy.defaultSide(action.mode),
          actions: [],
          textValue: action.date,
        };
      case 'TOGGLE_TEXT_MODE':
        return {
          ...state,
          textMode: !state.textMode,
          textValue: !state.textMode ? strategy.toText(action.date, state.actions) : state.textValue,
        };
      case 'SET_VALUE':
        return { ...state, value: action.value };
      case 'SET_START_SHARES':
        return { ...state, startShares: action.startShares };
      case 'SET_NEXT_SIDE':
        return { ...state, nextSide: action.side };
      case 'SET_MANUAL_TIME':
        return { ...state, manualTime: action.time };
      default:
        return state;
    }
  };
}

export function initialBaseSimState<A>(
  date: string,
  chartType: 'line' | 'area' | 'candlestick' = 'line',
): BaseSimState<A> {
  return {
    actions: [],
    nextSide: 'buy',
    value: '100',
    startShares: '0',
    manualTime: '',
    textMode: false,
    textValue: date,
    chartType,
    tradeMode: 'long',
  };
}
