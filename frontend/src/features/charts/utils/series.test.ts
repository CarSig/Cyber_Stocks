import { describe, it, expect } from 'vitest';
import { toSortedOHLC, toSortedClose, calcHV, calcATR } from './series';
import type { Quote } from '@/types';

const q = (date: string, close: number, open = close, high = close, low = close): Quote =>
  ({ date, open, high, low, close, volume: 0, adjClose: close }) as unknown as Quote;

describe('toSortedOHLC', () => {
  it('returns empty array for empty input', () => {
    expect(toSortedOHLC([])).toEqual([]);
  });

  it('filters out quotes with falsy close', () => {
    const result = toSortedOHLC([q('2024-01-01', 0), q('2024-01-02', 100)]);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe('2024-01-02');
  });

  it('sorts by date ascending', () => {
    const result = toSortedOHLC([q('2024-03-01', 10), q('2024-01-01', 20), q('2024-02-01', 30)]);
    expect(result.map((r) => r.time)).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
  });

  it('deduplicates same-day entries, keeping first occurrence', () => {
    const result = toSortedOHLC([q('2024-01-01', 100), q('2024-01-01', 200)]);
    expect(result).toHaveLength(1);
    expect(result[0].close).toBe(100);
  });

  it('includes open, high, low, close, value fields', () => {
    const result = toSortedOHLC([q('2024-01-01', 50, 45, 55, 40)]);
    expect(result[0]).toMatchObject({ time: '2024-01-01', open: 45, high: 55, low: 40, close: 50, value: 50 });
  });

  it('slices date to 10 chars from longer datetime strings', () => {
    const quote = { date: '2024-01-15T10:00:00Z', open: 1, high: 1, low: 1, close: 1, volume: 0 } as unknown as Quote;
    const result = toSortedOHLC([quote]);
    expect(result[0].time).toBe('2024-01-15');
  });
});

describe('toSortedClose', () => {
  it('returns only time and value fields', () => {
    const result = toSortedClose([q('2024-01-01', 75)]);
    expect(result[0]).toEqual({ time: '2024-01-01', value: 75 });
    expect(result[0]).not.toHaveProperty('open');
  });

  it('sorts and dedupes the same way as toSortedOHLC', () => {
    const quotes = [q('2024-02-01', 20), q('2024-01-01', 10), q('2024-01-01', 99)];
    const result = toSortedClose(quotes);
    expect(result.map((r) => r.time)).toEqual(['2024-01-01', '2024-02-01']);
  });
});

// Build a monotonically-increasing price series for predictable log-return tests
function makePrices(count: number, startClose = 100, delta = 1): { time: string; close: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    close: startClose + i * delta,
  }));
}

describe('calcHV', () => {
  it('returns empty array when fewer than window+1 quotes', () => {
    expect(calcHV(makePrices(20), 20)).toEqual([]);
    expect(calcHV(makePrices(19), 20)).toEqual([]);
  });

  it('returns window length entries when exactly window+1 quotes provided', () => {
    expect(calcHV(makePrices(21), 20)).toHaveLength(1);
  });

  it('returns (quotes.length - window) entries for ample data', () => {
    const quotes = makePrices(50);
    expect(calcHV(quotes, 20)).toHaveLength(30);
  });

  it('produces non-negative values', () => {
    const results = calcHV(makePrices(60), 20);
    results.forEach((r) => expect(r.value).toBeGreaterThanOrEqual(0));
  });

  it('attaches the correct time label (last date of each window)', () => {
    const quotes = makePrices(22);
    const result = calcHV(quotes, 20);
    // window=20: first result at index 20, second at 21
    expect(result[0].time).toBe(quotes[20].time);
    expect(result[1].time).toBe(quotes[21].time);
  });

  it('returns 0 volatility for perfectly flat prices', () => {
    const flat = Array.from({ length: 30 }, (_, i) => ({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      close: 100,
    }));
    const result = calcHV(flat, 20);
    result.forEach((r) => expect(r.value).toBe(0));
  });

  it('rounds to 4 decimal places', () => {
    const result = calcHV(makePrices(30), 20);
    result.forEach((r) => expect(r.value).toBe(parseFloat(r.value.toFixed(4))));
  });
});

describe('calcATR', () => {
  it('returns empty array when fewer than window+1 quotes', () => {
    expect(calcATR(makePrices(14), 14)).toEqual([]);
  });

  it('returns (quotes.length - window) entries for ample data', () => {
    const quotes = makePrices(30);
    expect(calcATR(quotes, 14)).toHaveLength(16);
  });

  it('produces non-negative values', () => {
    const results = calcATR(makePrices(50), 14);
    results.forEach((r) => expect(r.value).toBeGreaterThanOrEqual(0));
  });

  it('attaches correct time labels', () => {
    const quotes = makePrices(20);
    const result = calcATR(quotes, 14);
    // First ATR point corresponds to quotes[14]
    expect(result[0].time).toBe(quotes[14].time);
  });

  it('rounds to 4 decimal places', () => {
    const result = calcATR(makePrices(30), 14);
    result.forEach((r) => expect(r.value).toBe(parseFloat(r.value.toFixed(4))));
  });

  it('returns 0 ATR for perfectly flat prices with equal high/low/close', () => {
    const flat = Array.from({ length: 30 }, (_, i) => ({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
    }));
    const result = calcATR(flat, 14);
    result.forEach((r) => expect(r.value).toBe(0));
  });
});
