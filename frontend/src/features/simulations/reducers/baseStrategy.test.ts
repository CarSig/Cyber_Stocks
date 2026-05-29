import { describe, it, expect, vi } from 'vitest';
import { intradayStrategy, longTermStrategy } from './baseStrategy';
import type { BaseSimState, BaseSimAction } from './baseReducer';
import type { Action } from '@/features/simulations/utils/sim';

// ─── intradayStrategy.createAction ───────────────────────────────────────────

describe('intradayStrategy.createAction', () => {
  it('returns null for non-positive value', () => {
    expect(intradayStrategy.createAction(1, '09:30', 'buy', '0', '2024-01-15')).toBeNull();
    expect(intradayStrategy.createAction(1, '09:30', 'buy', '-5', '2024-01-15')).toBeNull();
  });

  it('returns null for non-finite value', () => {
    expect(intradayStrategy.createAction(1, '09:30', 'buy', 'abc', '2024-01-15')).toBeNull();
  });

  it('produces a valid ISO timestamp when date is provided', () => {
    const action = intradayStrategy.createAction(1, '09:30', 'buy', '100', '2024-01-15');
    expect(action).not.toBeNull();
    expect(() => new Date(action!.timestamp).toISOString()).not.toThrow();
    expect(isNaN(new Date(action!.timestamp).getTime())).toBe(false);
  });

  it('does NOT throw RangeError when date is empty (regression: timeToIso with empty date)', () => {
    expect(() => intradayStrategy.createAction(1, '09:30', 'buy', '100', '')).not.toThrow();
  });

  it('caps exit action value at 100', () => {
    const sell = intradayStrategy.createAction(1, '10:00', 'sell', '200', '2024-01-15');
    expect(sell?.value).toBe(100);
    const cover = intradayStrategy.createAction(1, '10:00', 'cover', '150', '2024-01-15');
    expect(cover?.value).toBe(100);
  });

  it('does not cap entry action value', () => {
    const buy = intradayStrategy.createAction(1, '10:00', 'buy', '500', '2024-01-15');
    expect(buy?.value).toBe(500);
  });

  it('sets correct id, time, and side on created action', () => {
    const action = intradayStrategy.createAction(3, '14:30', 'short', '200', '2024-06-01');
    expect(action?.id).toBe(3);
    expect(action?.time).toBe('14:30');
    expect(action?.side).toBe('short');
    expect(action?.value).toBe(200);
  });
});

// ─── intradayStrategy.updateAction ───────────────────────────────────────────

describe('intradayStrategy.updateAction', () => {
  const base: Action = { id: 1, timestamp: 'T', time: '09:30', side: 'buy', value: 100 };

  it('updates value for buy action (no cap)', () => {
    const updated = intradayStrategy.updateAction(base, 'value', '300');
    expect(updated.value).toBe(300);
    expect(updated.side).toBe('buy');
  });

  it('caps value at 100 when action is a sell', () => {
    const sell: Action = { ...base, side: 'sell', value: 50 };
    const updated = intradayStrategy.updateAction(sell, 'value', '200');
    expect(updated.value).toBe(100);
  });

  it('caps value at 100 when action is a cover', () => {
    const cover: Action = { ...base, side: 'cover', value: 50 };
    const updated = intradayStrategy.updateAction(cover, 'value', '150');
    expect(updated.value).toBe(100);
  });

  it('changes side from buy to sell', () => {
    const updated = intradayStrategy.updateAction(base, 'side', 'sell');
    expect(updated.side).toBe('sell');
  });

  it('caps existing value when switching from buy to sell', () => {
    const bigBuy: Action = { ...base, side: 'buy', value: 500 };
    const updated = intradayStrategy.updateAction(bigBuy, 'side', 'sell');
    expect(updated.side).toBe('sell');
    expect(updated.value).toBe(100);
  });

  it('does not cap value when switching from sell to buy', () => {
    const sell: Action = { ...base, side: 'sell', value: 80 };
    const updated = intradayStrategy.updateAction(sell, 'side', 'buy');
    expect(updated.side).toBe('buy');
    expect(updated.value).toBe(80);
  });
});

// ─── intradayStrategy.toText ──────────────────────────────────────────────────

describe('intradayStrategy.toText', () => {
  it('emits date as first line then actions', () => {
    const actions: Action[] = [
      { id: 1, timestamp: 'T', time: '09:30', side: 'buy', value: 100 },
      { id: 2, timestamp: 'T', time: '10:00', side: 'sell', value: 50 },
    ];
    const text = intradayStrategy.toText('2024-01-15', actions);
    const lines = text.split('\n');
    expect(lines[0]).toBe('2024-01-15');
    expect(lines[1]).toBe('09:30, 100');
    expect(lines[2]).toBe('10:00, -50'); // exit → negative
  });

  it('negates value for cover side', () => {
    const actions: Action[] = [{ id: 1, timestamp: 'T', time: '10:30', side: 'cover', value: 75 }];
    const text = intradayStrategy.toText('2024-01-15', actions);
    expect(text).toContain('10:30, -75');
  });

  it('keeps value positive for buy and short', () => {
    const actions: Action[] = [
      { id: 1, timestamp: 'T', time: '09:30', side: 'buy', value: 200 },
      { id: 2, timestamp: 'T', time: '09:45', side: 'short', value: 150 },
    ];
    const text = intradayStrategy.toText('2024-01-15', actions);
    expect(text).toContain('09:30, 200');
    expect(text).toContain('09:45, 150');
  });

  it('emits only date line when actions is empty', () => {
    const text = intradayStrategy.toText('2024-01-15', []);
    expect(text).toBe('2024-01-15');
  });
});

// ─── intradayStrategy metadata ────────────────────────────────────────────────

describe('intradayStrategy metadata', () => {
  it('isIntraday is true', () => {
    expect(intradayStrategy.isIntraday).toBe(true);
  });

  it('getLabel returns time', () => {
    const action: Action = { id: 1, timestamp: 'T', time: '09:30', side: 'buy', value: 100 };
    expect(intradayStrategy.getLabel(action)).toBe('09:30');
  });

  it('getSortKey returns timestamp', () => {
    const action: Action = { id: 1, timestamp: '2024-01-15T14:30:00Z', time: '09:30', side: 'buy', value: 100 };
    expect(intradayStrategy.getSortKey(action)).toBe('2024-01-15T14:30:00Z');
  });

  it('defaultSide returns "short" for short mode', () => {
    expect(intradayStrategy.defaultSide('short')).toBe('short');
  });

  it('defaultSide returns "buy" for long mode', () => {
    expect(intradayStrategy.defaultSide('long')).toBe('buy');
  });

  it('getTextRows returns at least 3', () => {
    expect(intradayStrategy.getTextRows(0)).toBe(3);
    expect(intradayStrategy.getTextRows(1)).toBe(3);
    expect(intradayStrategy.getTextRows(5)).toBe(6);
  });

  it('getTextPlaceholder returns a non-empty string', () => {
    expect(intradayStrategy.getTextPlaceholder().length).toBeGreaterThan(0);
  });
});

// ─── intradayStrategy.buildManual ─────────────────────────────────────────────

describe('intradayStrategy.buildManual', () => {
  function makeState(overrides = {}): BaseSimState<Action> {
    return {
      actions: [],
      tradeMode: 'long',
      textMode: false,
      manualTime: '09:30',
      value: '100',
      nextSide: 'buy',
      startShares: '0',
      textValue: '',
      chartType: 'line',
      ...overrides,
    } as unknown as BaseSimState<Action>;
  }

  it('exposes inputValue from state.manualTime', () => {
    const s = makeState({ manualTime: '10:15' });
    const dispatch = vi.fn();
    const result = intradayStrategy.buildManual(s, dispatch, { inputType: 'time', onAdd: vi.fn() });
    expect(result.inputValue).toBe('10:15');
  });

  it('onInputChange dispatches SET_MANUAL_TIME', () => {
    const dispatch = vi.fn();
    const result = intradayStrategy.buildManual(makeState(), dispatch, { inputType: 'time', onAdd: vi.fn() });
    result.onInputChange('11:00');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MANUAL_TIME', time: '11:00' });
  });

  it('onValueChange dispatches SET_VALUE', () => {
    const dispatch = vi.fn();
    const result = intradayStrategy.buildManual(makeState(), dispatch, { inputType: 'time', onAdd: vi.fn() });
    result.onValueChange('250');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALUE', value: '250' });
  });

  it('onNextSideChange dispatches SET_NEXT_SIDE', () => {
    const dispatch = vi.fn();
    const result = intradayStrategy.buildManual(makeState(), dispatch, { inputType: 'time', onAdd: vi.fn() });
    result.onNextSideChange('sell');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_NEXT_SIDE', side: 'sell' });
  });

  it('exposes extras (inputType, onAdd)', () => {
    const onAdd = vi.fn();
    const result = intradayStrategy.buildManual(makeState(), vi.fn(), { inputType: 'date', onAdd });
    expect(result.inputType).toBe('date');
    expect(result.onAdd).toBe(onAdd);
  });
});

// ─── intradayStrategy.buildActions ───────────────────────────────────────────

describe('intradayStrategy.buildActions', () => {
  const actions: Action[] = [
    { id: 1, timestamp: 'T', time: '09:30', side: 'buy', value: 100 },
    { id: 2, timestamp: 'T', time: '10:00', side: 'sell', value: 50 },
  ];

  function makeState(): BaseSimState<Action> {
    return {
      actions,
      tradeMode: 'long',
      textMode: false,
      manualTime: '',
      value: '',
      nextSide: 'buy',
      startShares: '0',
      textValue: '',
      chartType: 'line',
    } as BaseSimState<Action>;
  }

  it('exposes list from state.actions', () => {
    const result = intradayStrategy.buildActions(makeState(), vi.fn());
    expect(result.list).toBe(actions);
  });

  it('onUpdate dispatches UPDATE_ACTION', () => {
    const dispatch = vi.fn();
    const result = intradayStrategy.buildActions(makeState(), dispatch);
    result.onUpdate(1, 'value', '200');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE_ACTION', id: 1, field: 'value', val: '200' }),
    );
  });

  it('onRemove dispatches REMOVE_ACTION', () => {
    const dispatch = vi.fn();
    const result = intradayStrategy.buildActions(makeState(), dispatch);
    result.onRemove(2);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'REMOVE_ACTION', id: 2 }));
  });

  it('labelSlot is undefined when extras not provided', () => {
    const result = intradayStrategy.buildActions(makeState(), vi.fn());
    expect(result.labelSlot).toBeUndefined();
  });

  it('forwards labelSlot from extras', () => {
    const labelSlot = vi.fn();
    const result = intradayStrategy.buildActions(makeState(), vi.fn(), { labelSlot });
    expect(result.labelSlot).toBe(labelSlot);
  });
});

// ─── intradayStrategy.buildToolbar ───────────────────────────────────────────

describe('intradayStrategy.buildToolbar', () => {
  function makeState(textMode = false): BaseSimState<Action> {
    return {
      actions: [],
      tradeMode: 'long',
      textMode,
      manualTime: '',
      value: '',
      nextSide: 'buy',
      startShares: '0',
      textValue: '',
      chartType: 'line',
    } as BaseSimState<Action>;
  }

  const extras = {
    presets: undefined,
    onPreset: vi.fn(),
    onExportPdf: vi.fn(),
    onClear: vi.fn(),
  };

  it('exposes textMode from state', () => {
    expect(intradayStrategy.buildToolbar(makeState(true), vi.fn(), extras).textMode).toBe(true);
    expect(intradayStrategy.buildToolbar(makeState(false), vi.fn(), extras).textMode).toBe(false);
  });

  it('onTextModeToggle dispatches TOGGLE_TEXT_MODE', () => {
    const dispatch = vi.fn();
    const result = intradayStrategy.buildToolbar(makeState(), dispatch, extras);
    result.onTextModeToggle();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'TOGGLE_TEXT_MODE' }));
  });
});

// ─── intradayStrategy.buildOrderControls ─────────────────────────────────────

describe('intradayStrategy.buildOrderControls', () => {
  function makeState(): BaseSimState<Action> & { query: { date: string }; timeframe: string } {
    return {
      actions: [],
      tradeMode: 'long',
      textMode: false,
      manualTime: '',
      value: '500',
      nextSide: 'buy',
      startShares: '10',
      textValue: '',
      chartType: 'line',
      query: { date: '2024-06-01' },
      timeframe: '1D',
    } as unknown as BaseSimState<Action> & { query: { date: string }; timeframe: string };
  }

  const extras = {
    maxDate: '2024-12-31',
    onLoad: vi.fn(),
    showTradeControls: true,
  };

  it('exposes tradeMode, startShares, value, timeframe from state', () => {
    const result = intradayStrategy.buildOrderControls(makeState(), vi.fn(), extras);
    expect(result.tradeMode).toBe('long');
    expect(result.startShares).toBe('10');
    expect(result.value).toBe('500');
    expect(result.timeframe).toBe('1D');
    expect(result.date).toBe('2024-06-01');
  });

  it('onTradeModeChange dispatches SET_TRADE_MODE', () => {
    const dispatch = vi.fn();
    intradayStrategy.buildOrderControls(makeState(), dispatch, extras).onTradeModeChange('short');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_TRADE_MODE', mode: 'short' }));
  });

  it('onStartSharesChange dispatches SET_START_SHARES', () => {
    const dispatch = vi.fn();
    intradayStrategy.buildOrderControls(makeState(), dispatch, extras).onStartSharesChange('5');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_START_SHARES', startShares: '5' });
  });

  it('onValueChange dispatches SET_VALUE', () => {
    const dispatch = vi.fn();
    intradayStrategy.buildOrderControls(makeState(), dispatch, extras).onValueChange('999');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALUE', value: '999' });
  });

  it('onDateChange dispatches SET_DATE', () => {
    const dispatch = vi.fn();
    intradayStrategy.buildOrderControls(makeState(), dispatch, extras).onDateChange('2024-07-04');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DATE', date: '2024-07-04' });
  });

  it('onTimeframeChange dispatches SET_TIMEFRAME', () => {
    const dispatch = vi.fn();
    intradayStrategy.buildOrderControls(makeState(), dispatch, extras).onTimeframeChange('5Min');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TIMEFRAME', timeframe: '5Min' });
  });
});

// ─── longTermStrategy.createAction ───────────────────────────────────────────

describe('longTermStrategy.createAction', () => {
  it('returns null for zero or non-finite value', () => {
    expect(longTermStrategy.createAction(1, '2024-01-15', 'buy', '0')).toBeNull();
    expect(longTermStrategy.createAction(1, '2024-01-15', 'buy', 'abc')).toBeNull();
  });

  it('returns null when date is empty', () => {
    expect(longTermStrategy.createAction(1, '', 'buy', '100')).toBeNull();
  });

  it('creates a valid long-term action', () => {
    const action = longTermStrategy.createAction(1, '2024-01-15', 'buy', '50');
    expect(action).toEqual({ id: 1, date: '2024-01-15', side: 'buy', value: '50' });
  });

  it('stores absolute value regardless of sign', () => {
    const action = longTermStrategy.createAction(1, '2024-01-15', 'sell', '-100');
    expect(action?.value).toBe('100');
  });

  it('accepts short and cover sides', () => {
    expect(longTermStrategy.createAction(1, '2024-01-15', 'short', '200')?.side).toBe('short');
    expect(longTermStrategy.createAction(1, '2024-01-15', 'cover', '50')?.side).toBe('cover');
  });
});

// ─── longTermStrategy.updateAction ───────────────────────────────────────────

describe('longTermStrategy.updateAction', () => {
  const base = { id: 1, date: '2024-01-15', side: 'buy' as const, value: '100' };

  it('updates value field', () => {
    const updated = longTermStrategy.updateAction(base, 'value', '200');
    expect(updated.value).toBe('200');
    expect(updated.side).toBe('buy');
  });

  it('updates side field', () => {
    const updated = longTermStrategy.updateAction(base, 'side', 'sell');
    expect(updated.side).toBe('sell');
    expect(updated.value).toBe('100');
  });
});

// ─── longTermStrategy.toText ──────────────────────────────────────────────────

describe('longTermStrategy.toText', () => {
  it('formats buy actions with positive value', () => {
    const actions = [{ id: 1, date: '2024-01-15', side: 'buy' as const, value: '100' }];
    expect(longTermStrategy.toText('', actions)).toBe('2024-01-15, 100');
  });

  it('formats sell actions with negative value', () => {
    const actions = [{ id: 1, date: '2024-01-15', side: 'sell' as const, value: '50' }];
    expect(longTermStrategy.toText('', actions)).toBe('2024-01-15, -50');
  });

  it('formats cover actions with negative value', () => {
    const actions = [{ id: 1, date: '2024-01-15', side: 'cover' as const, value: '75' }];
    expect(longTermStrategy.toText('', actions)).toBe('2024-01-15, -75');
  });

  it('returns empty string for no actions', () => {
    expect(longTermStrategy.toText('2024-01-15', [])).toBe('');
  });

  it('joins multiple actions with newlines', () => {
    const actions = [
      { id: 1, date: '2024-01-10', side: 'buy' as const, value: '100' },
      { id: 2, date: '2024-06-01', side: 'sell' as const, value: '50' },
    ];
    const lines = longTermStrategy.toText('', actions).split('\n');
    expect(lines).toHaveLength(2);
  });
});

// ─── longTermStrategy metadata ────────────────────────────────────────────────

describe('longTermStrategy metadata', () => {
  const action = { id: 1, date: '2024-03-20', side: 'buy' as const, value: '100' };

  it('isIntraday is false', () => {
    expect(longTermStrategy.isIntraday).toBe(false);
  });

  it('getLabel returns date', () => {
    expect(longTermStrategy.getLabel(action)).toBe('2024-03-20');
  });

  it('getSortKey returns date', () => {
    expect(longTermStrategy.getSortKey(action)).toBe('2024-03-20');
  });

  it('defaultSide returns "short" for short mode', () => {
    expect(longTermStrategy.defaultSide('short')).toBe('short');
  });

  it('defaultSide returns "buy" for long mode', () => {
    expect(longTermStrategy.defaultSide('long')).toBe('buy');
  });

  it('getTextRows returns at least 3', () => {
    expect(longTermStrategy.getTextRows(0)).toBe(3);
    expect(longTermStrategy.getTextRows(4)).toBe(5);
  });

  it('getTextPlaceholder returns a non-empty string', () => {
    expect(longTermStrategy.getTextPlaceholder().length).toBeGreaterThan(0);
  });
});
