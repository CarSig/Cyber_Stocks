import { describe, it, expect } from 'vitest';
import { parseIntradayText, parseLongTermText } from './parseSimText';

// ─── parseIntradayText ────────────────────────────────────────────────────────

describe('parseIntradayText', () => {
  const DATE = '2024-01-15';

  it('returns empty for blank input', () => {
    const result = parseIntradayText('', DATE);
    expect(result.parsedDate).toBeNull();
    expect(result.actions).toEqual([]);
  });

  it('parses a single buy action', () => {
    const { actions } = parseIntradayText('09:30, 100', DATE);
    expect(actions).toHaveLength(1);
    expect(actions[0].side).toBe('buy');
    expect(actions[0].value).toBe(100);
    expect(actions[0].time).toBe('09:30');
  });

  it('parses a sell action (negative number)', () => {
    const { actions } = parseIntradayText('10:00, -50', DATE);
    expect(actions).toHaveLength(1);
    expect(actions[0].side).toBe('sell');
    expect(actions[0].value).toBe(50);
  });

  it('caps sell value at 100', () => {
    const { actions } = parseIntradayText('10:00, -200', DATE);
    expect(actions[0].value).toBe(100);
  });

  it('does not cap buy value', () => {
    const { actions } = parseIntradayText('09:30, 5000', DATE);
    expect(actions[0].value).toBe(5000);
  });

  it('extracts date from first line if YYYY-MM-DD', () => {
    const raw = '2024-03-20\n09:30, 100';
    const { parsedDate, actions } = parseIntradayText(raw, DATE);
    expect(parsedDate).toBe('2024-03-20');
    expect(actions).toHaveLength(1);
  });

  it('uses fallback date when first line is not a date', () => {
    const { parsedDate } = parseIntradayText('09:30, 100', DATE);
    expect(parsedDate).toBeNull();
  });

  it('skips lines with wrong format', () => {
    const raw = 'garbage\n09:30, 100\nalso garbage';
    const { actions } = parseIntradayText(raw, DATE);
    expect(actions).toHaveLength(1);
  });

  it('skips lines where value is 0', () => {
    const { actions } = parseIntradayText('09:30, 0', DATE);
    expect(actions).toHaveLength(0);
  });

  it('skips lines where value is NaN', () => {
    const { actions } = parseIntradayText('09:30, abc', DATE);
    expect(actions).toHaveLength(0);
  });

  it('skips lines where time is not a valid HH:MM (bad hours)', () => {
    // "xx:30" → h = NaN → skipped
    const { actions } = parseIntradayText('xx:30, 100', DATE);
    expect(actions).toHaveLength(0);
  });

  it('skips lines where time minutes are not numeric', () => {
    const { actions } = parseIntradayText('09:zz, 100', DATE);
    expect(actions).toHaveLength(0);
  });

  it('skips lines with wrong format (no comma)', () => {
    const { actions } = parseIntradayText('09:30 100', DATE);
    expect(actions).toHaveLength(0);
  });

  it('assigns unique ids to each action', () => {
    const raw = '09:30, 100\n10:00, -50\n11:00, 200';
    const { actions } = parseIntradayText(raw, DATE);
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces a valid ISO timestamp for each action', () => {
    const { actions } = parseIntradayText('09:30, 100', DATE);
    expect(isNaN(new Date(actions[0].timestamp).getTime())).toBe(false);
  });

  it('parses multiple actions', () => {
    const raw = '09:30, 100\n10:15, -25\n11:00, 500';
    const { actions } = parseIntradayText(raw, DATE);
    expect(actions).toHaveLength(3);
    expect(actions.map((a) => a.side)).toEqual(['buy', 'sell', 'buy']);
  });
});

// ─── parseLongTermText ────────────────────────────────────────────────────────

describe('parseLongTermText', () => {
  it('returns empty for blank input', () => {
    expect(parseLongTermText('').actions).toEqual([]);
  });

  it('parses a single buy line', () => {
    const { actions } = parseLongTermText('2024-01-10, 100');
    expect(actions).toHaveLength(1);
    expect(actions[0].date).toBe('2024-01-10');
    expect(actions[0].side).toBe('buy');
    expect(actions[0].value).toBe('100');
  });

  it('parses a sell line (negative number)', () => {
    const { actions } = parseLongTermText('2024-06-01, -50');
    expect(actions[0].side).toBe('sell');
    expect(actions[0].value).toBe('50');
  });

  it('skips lines with zero value', () => {
    expect(parseLongTermText('2024-01-01, 0').actions).toHaveLength(0);
  });

  it('skips lines with non-numeric value', () => {
    expect(parseLongTermText('2024-01-01, abc').actions).toHaveLength(0);
  });

  it('skips lines with wrong format (no comma)', () => {
    expect(parseLongTermText('2024-01-01 100').actions).toHaveLength(0);
  });

  it('skips blank lines', () => {
    const raw = '2024-01-01, 100\n\n2024-02-01, -50';
    expect(parseLongTermText(raw).actions).toHaveLength(2);
  });

  it('assigns unique ids', () => {
    const raw = '2024-01-01, 100\n2024-02-01, 200\n2024-03-01, -50';
    const { actions } = parseLongTermText(raw);
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves the date string verbatim', () => {
    const { actions } = parseLongTermText('2024-12-31, 100');
    expect(actions[0].date).toBe('2024-12-31');
  });

  it('stores value as string (not number)', () => {
    const { actions } = parseLongTermText('2024-01-01, 123');
    expect(typeof actions[0].value).toBe('string');
  });
});
