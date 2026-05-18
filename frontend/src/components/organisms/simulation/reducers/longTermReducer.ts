import { makeSimReducer, initialBaseSimState } from './baseReducer';
import type { BaseSimAction } from './baseReducer';
import { longTermStrategy } from './baseStrategy';

export type LongTermAction = { id: number; date: string; side: 'buy' | 'sell' | 'short' | 'cover'; value: string };

export type LongTermSimState = ReturnType<typeof initialLongTermState>;

export type LongTermSimAction =
  | BaseSimAction<LongTermAction>
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIMEFRAME'; timeframe: string }
  | { type: 'SET_TRADE_MODE'; mode: 'long' | 'short'; date: string };

const baseReducer = makeSimReducer(longTermStrategy);

export function initialLongTermState() {
  return initialBaseSimState<LongTermAction>('', 'line');
}

export function longTermReducer(state: LongTermSimState, action: LongTermSimAction): LongTermSimState {
  if (action.type === 'SET_DATE') return { ...state };
  if (action.type === 'SET_TIMEFRAME') return { ...state };
  return baseReducer(state, action as BaseSimAction<LongTermAction>);
}
