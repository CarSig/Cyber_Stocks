import type { Side, Action } from '@/utils/sim';
import { DateUtils } from '@/utils/date';

export type SimStrategy<A> = {
  toText: (date: string, actions: A[]) => string;
  createAction: (id: number, label: string, side: string, rawValue: string, date?: string) => A | null;
  updateAction: (action: A, field: 'side' | 'value', val: string) => A;
  getLabel: (action: A) => string;
  defaultSide: (tradeMode: 'long' | 'short') => string;
};

// Shared by DayTradeSimulation and IntradaySimulation (same Action type)
export const intradayStrategy: SimStrategy<Action> = {
  toText: (date, actions) =>
    [
      date,
      ...actions.map((a) => {
        const isExit = a.side === 'sell' || a.side === 'cover';
        return `${a.time}, ${isExit ? -a.value : a.value}`;
      }),
    ].join('\n'),
  createAction: (id, time, side, rawValue, date = '') => {
    const val = Number(rawValue);
    if (!isFinite(val) || val <= 0) return null;
    const isExit = side === 'sell' || side === 'cover';
    return {
      id,
      timestamp: DateUtils.timeToIso(time, date),
      time,
      side: side as Side,
      value: isExit ? Math.min(100, val) : val,
    };
  },
  updateAction: (a, field, val) => {
    const isExit = (s: Side) => s === 'sell' || s === 'cover';
    if (field === 'value') return { ...a, value: isExit(a.side) ? Math.min(100, Number(val)) : Number(val) };
    const newSide = val as Side;
    return { ...a, side: newSide, value: isExit(newSide) ? Math.min(100, a.value) : a.value };
  },
  getLabel: (a) => a.time,
  defaultSide: (mode) => (mode === 'short' ? 'short' : 'buy'),
};

type LongTermAction = { id: number; date: string; type: 'buy' | 'sell' | 'short' | 'cover'; value: string };

const isLongTermExit = (t: LongTermAction['type']) => t === 'sell' || t === 'cover';

export const longTermStrategy: SimStrategy<LongTermAction> = {
  toText: (_date, actions) =>
    actions
      .map((a) => `${a.date}, ${isLongTermExit(a.type) ? -Math.abs(Number(a.value)) : Math.abs(Number(a.value))}`)
      .join('\n'),
  createAction: (id, date, side, rawValue) => {
    const val = Number(rawValue);
    if (!isFinite(val) || val === 0 || !date) return null;
    return { id, date, type: side as LongTermAction['type'], value: String(Math.abs(val)) };
  },
  updateAction: (a, field, val) =>
    field === 'side' ? { ...a, type: val as LongTermAction['type'] } : { ...a, value: val },
  getLabel: (a) => a.date,
  defaultSide: (mode) => (mode === 'short' ? 'short' : 'buy'),
};
