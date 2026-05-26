import { describe, it, expect } from 'vitest';
import { pearsonLag, corrColor, fmtPct, LAG_COLS } from './index';

// ─── pearsonLag ───────────────────────────────────────────────────────────────

describe('pearsonLag', () => {
  const flat = Array.from({ length: 20 }, () => 100);
  const rising = Array.from({ length: 20 }, (_, i) => 100 + i);

  it('returns null when effective sample size < 5', () => {
    expect(pearsonLag([100, 101, 102, 103], [100, 101, 102, 103], 0)).toBeNull();
  });

  it('returns null for zero variance (flat series)', () => {
    expect(pearsonLag(flat, flat, 0)).toBeNull();
  });

  it('returns null when lag >= series length', () => {
    expect(pearsonLag(rising, rising, 20)).toBeNull();
  });

  it('returns 1 for perfectly correlated series at lag 0', () => {
    const a = [100, 102, 105, 103, 108, 110, 115, 112, 118, 120];
    const result = pearsonLag(a, a, 0);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(1, 5);
  });

  it('returns negative correlation for inversely moving series', () => {
    const a = [100, 102, 105, 103, 108, 110, 115, 112, 118, 120];
    const b = a.map((v) => 200 - v);
    const result = pearsonLag(a, b, 0);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(-0.5);
  });

  it('result is bounded in [-1, 1]', () => {
    const a = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const b = Array.from({ length: 30 }, (_, i) => 100 + Math.cos(i) * 10);
    const result = pearsonLag(a, b, 0);
    if (result !== null) {
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it('handles positive lag without throwing', () => {
    const a = [100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107];
    expect(() => pearsonLag(a, a, 1)).not.toThrow();
    const result = pearsonLag(a, a, 1);
    // Result should be a finite number or null — not NaN
    if (result !== null) expect(isFinite(result)).toBe(true);
  });

  it('handles negative lag without throwing', () => {
    const a = [100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107];
    expect(() => pearsonLag(a, a, -1)).not.toThrow();
    const result = pearsonLag(a, a, -1);
    if (result !== null) expect(isFinite(result)).toBe(true);
  });

  it('filters out non-positive prices in log-return calculation', () => {
    const a = [0, 100, 102, 105, 103, 108, 110, 115, 112, 118, 120];
    const b = [100, 102, 105, 103, 108, 110, 115, 112, 118, 120, 125];
    // Should not throw even with leading zero
    expect(() => pearsonLag(a, b, 0)).not.toThrow();
  });
});

// ─── corrColor ────────────────────────────────────────────────────────────────

describe('corrColor', () => {
  it('returns transparent for null', () => {
    expect(corrColor(null)).toBe('transparent');
  });

  it('returns transparent for undefined', () => {
    expect(corrColor(undefined)).toBe('transparent');
  });

  it('returns oklch green-ish for positive correlation', () => {
    const color = corrColor(0.8);
    expect(color).toContain('oklch');
    expect(color).toContain('150'); // hue for green
  });

  it('returns oklch red-ish for negative correlation', () => {
    const color = corrColor(-0.8);
    expect(color).toContain('oklch');
    expect(color).toContain('25'); // hue for red
  });

  it('scales intensity with absolute value', () => {
    const weak = corrColor(0.2);
    const strong = corrColor(0.9);
    // Both are oklch — extract the chroma value (second number)
    const chromaWeak = parseFloat(weak.match(/oklch\([^ ]+ ([^ ]+) /)?.[1] ?? '0');
    const chromaStrong = parseFloat(strong.match(/oklch\([^ ]+ ([^ ]+) /)?.[1] ?? '0');
    expect(chromaStrong).toBeGreaterThan(chromaWeak);
  });

  it('returns 0 chroma for correlation = 0', () => {
    const color = corrColor(0);
    const chroma = parseFloat(color.match(/oklch\([^ ]+ ([^ ]+) /)?.[1] ?? '1');
    expect(chroma).toBe(0);
  });
});

// ─── fmtPct ───────────────────────────────────────────────────────────────────

describe('fmtPct (correlations)', () => {
  it('returns — for null', () => {
    expect(fmtPct(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(fmtPct(undefined)).toBe('—');
  });

  it('formats a positive number to 2 decimal places with % suffix', () => {
    expect(fmtPct(0.75)).toBe('0.75%');
  });

  it('formats a negative number', () => {
    expect(fmtPct(-1.23)).toBe('-1.23%');
  });

  it('formats zero', () => {
    expect(fmtPct(0)).toBe('0.00%');
  });
});

// ─── LAG_COLS ─────────────────────────────────────────────────────────────────

describe('LAG_COLS', () => {
  it('is a non-empty array of positive numbers', () => {
    expect(LAG_COLS.length).toBeGreaterThan(0);
    LAG_COLS.forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('is sorted ascending', () => {
    const sorted = [...LAG_COLS].sort((a, b) => a - b);
    expect(LAG_COLS).toEqual(sorted);
  });
});
