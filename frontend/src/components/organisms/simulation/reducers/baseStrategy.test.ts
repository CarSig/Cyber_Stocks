import { describe, it, expect } from 'vitest';
import { intradayStrategy, longTermStrategy } from './baseStrategy';

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
    // Before the fix, passing '' as date caused new Date('T09:30:00-05:00').toISOString() → RangeError
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
});

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
    expect(action).toEqual({ id: 1, date: '2024-01-15', type: 'buy', value: '50' });
  });
});
