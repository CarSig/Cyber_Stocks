import { describe, it, expect } from 'vitest';
import { fmtCompact, fmtVol, fmtPct, changePctOverBars } from './tickerUtils';

// ─── fmtCompact ───────────────────────────────────────────────────────────────

describe('fmtCompact', () => {
  it('returns — for null', () => expect(fmtCompact(null)).toBe('—'));
  it('returns — for undefined', () => expect(fmtCompact(undefined)).toBe('—'));

  it('formats trillions', () => expect(fmtCompact(2.5e12)).toBe('$2.50T'));
  it('formats billions', () => expect(fmtCompact(1.23e9)).toBe('$1.23B'));
  it('formats millions', () => expect(fmtCompact(4.56e6)).toBe('$4.56M'));

  it('falls back to toLocaleString for small numbers', () => {
    const result = fmtCompact(999);
    expect(result).toContain('$');
    expect(result).toContain('999');
  });

  it('trillion threshold: 1e12 exactly formats as T', () => {
    expect(fmtCompact(1e12)).toBe('$1.00T');
  });

  it('billion threshold: 1e9 exactly formats as B', () => {
    expect(fmtCompact(1e9)).toBe('$1.00B');
  });

  it('million threshold: 1e6 exactly formats as M', () => {
    expect(fmtCompact(1e6)).toBe('$1.00M');
  });

  it('999_999 does not format as M', () => {
    expect(fmtCompact(999_999)).not.toContain('M');
  });
});

// ─── fmtVol ───────────────────────────────────────────────────────────────────

describe('fmtVol', () => {
  it('returns — for null', () => expect(fmtVol(null)).toBe('—'));
  it('returns — for undefined', () => expect(fmtVol(undefined)).toBe('—'));

  it('formats billions', () => expect(fmtVol(2.5e9)).toBe('2.50B'));
  it('formats millions', () => expect(fmtVol(1.5e6)).toBe('1.50M'));
  it('formats thousands with 1 decimal', () => expect(fmtVol(5500)).toBe('5.5K'));

  it('falls back to string for small numbers', () => {
    expect(fmtVol(999)).toBe('999');
  });

  it('no $ prefix (unlike fmtCompact)', () => {
    expect(fmtVol(1e9)).not.toContain('$');
  });

  it('1e9 exactly formats as B', () => {
    expect(fmtVol(1e9)).toBe('1.00B');
  });

  it('1e6 exactly formats as M', () => {
    expect(fmtVol(1e6)).toBe('1.00M');
  });

  it('1000 exactly formats as K', () => {
    expect(fmtVol(1000)).toBe('1.0K');
  });
});

// ─── fmtPct ───────────────────────────────────────────────────────────────────

describe('fmtPct (tickers)', () => {
  it('returns — for null', () => expect(fmtPct(null)).toBe('—'));
  it('returns — for undefined', () => expect(fmtPct(undefined)).toBe('—'));

  it('prefixes positive values with +', () => {
    expect(fmtPct(0.05)).toBe('+5.00%');
  });

  it('does not add + for negative values', () => {
    expect(fmtPct(-0.03)).toBe('-3.00%');
  });

  it('formats zero with + prefix', () => {
    expect(fmtPct(0)).toBe('+0.00%');
  });

  it('multiplies by 100 (input is a ratio, not a percentage)', () => {
    expect(fmtPct(1)).toBe('+100.00%');
  });

  it('rounds to 2 decimal places', () => {
    expect(fmtPct(0.12345)).toBe('+12.35%');
  });
});

// ─── changePctOverBars ────────────────────────────────────────────────────────

describe('changePctOverBars', () => {
  const quotes = [
    { date: '2024-01-01', close: 100 },
    { date: '2024-01-02', close: 110 },
    { date: '2024-01-03', close: 105 },
    { date: '2024-01-04', close: 115 },
    { date: '2024-01-05', close: 120 },
  ];

  it('returns null for fewer than 2 entries', () => {
    expect(changePctOverBars([], 1)).toBeNull();
    expect(changePctOverBars([{ date: '2024-01-01', close: 100 }], 1)).toBeNull();
  });

  it('returns null when latest === past (only 1 bar and bars=0)', () => {
    // sorted.at(-1) === sorted.at(-(0+1)) = sorted[0] when length is 1 — handled above
    // when bars >= length-1, fallback is sorted[0], same as latest only if length=1
    expect(changePctOverBars([{ date: '2024-01-01', close: 100 }], 0)).toBeNull();
  });

  it('computes percent change over N bars', () => {
    // latest = 120 (index 4), past = at(-(1+1)) = at(-2) = index 3 = 115
    const result = changePctOverBars(quotes, 1);
    expect(result).toBeCloseTo((120 - 115) / 115, 5);
  });

  it('uses first element when bars >= series length', () => {
    // past = sorted[0] = 100, latest = 120
    const result = changePctOverBars(quotes, 100);
    expect(result).toBeCloseTo((120 - 100) / 100, 5);
  });

  it('prefers adjclose over close when present', () => {
    const q = [
      { date: '2024-01-01', close: 100, adjclose: 90 },
      { date: '2024-01-02', close: 110, adjclose: 99 },
    ];
    const result = changePctOverBars(q, 1);
    expect(result).toBeCloseTo((99 - 90) / 90, 5);
  });

  it('returns null when past close is 0', () => {
    const q = [
      { date: '2024-01-01', close: 0 },
      { date: '2024-01-02', close: 100 },
    ];
    expect(changePctOverBars(q, 1)).toBeNull();
  });

  it('result is negative when price falls', () => {
    const q = [
      { date: '2024-01-01', close: 150 },
      { date: '2024-01-02', close: 100 },
    ];
    const result = changePctOverBars(q, 1);
    expect(result).toBeLessThan(0);
  });
});
