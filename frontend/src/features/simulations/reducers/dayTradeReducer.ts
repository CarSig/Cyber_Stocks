import { DateUtils } from '@/utils/date';
import type { Action } from '@/utils/sim';
import { makeSimReducer, initialBaseSimState } from './baseReducer';
import type { BaseSimAction } from './baseReducer';
import { intradayStrategy } from './baseStrategy';

export type DayTradeSimState = ReturnType<typeof initialDayTradeState>;

export type DayTradeSimAction =
  | BaseSimAction<Action>
  | { type: 'LOAD_BARS'; date: string; timeframe: string };

const baseReducer = makeSimReducer(intradayStrategy);

export function initialDayTradeState() {
  const date = DateUtils.lastWeekday(DateUtils.todayStr());
  return {
    ...initialBaseSimState<Action>(date, 'line'),
    date,
    timeframe: '5Min',
    query: { date, timeframe: '5Min' },
  };
}

export function dayTradeReducer(state: DayTradeSimState, action: DayTradeSimAction): DayTradeSimState {
  if (action.type === 'LOAD_BARS') {
    const d = DateUtils.lastWeekday(action.date);
    return { ...state, date: d, query: { date: d, timeframe: action.timeframe }, actions: [], textValue: d };
  }
  if (action.type === 'SET_DATE') return { ...state, date: action.date };
  if (action.type === 'SET_TIMEFRAME') return { ...state, timeframe: action.timeframe };
  return baseReducer(state, action as BaseSimAction<Action>);
}
