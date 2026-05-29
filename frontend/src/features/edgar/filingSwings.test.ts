import { describe, it, expect } from 'vitest';
import { computeFilingSwing } from './filingSwings';
import type { Quote } from '@/types';

function q(date: string, o: number, h: number, l: number, c: number, v?: number): Quote {
  return { date, open: o, high: h, low: l, close: c, volume: v };
}

describe('computeFilingSwing', () => {
  it('returns null when there is no quote before the filing date', () => {
    const quotes = [q('2024-01-02', 100, 101, 99, 100)];
    expect(computeFilingSwing(quotes, '2024-01-01')).toBeNull();
  });

  it('returns null when there is no quote on or after the filing date', () => {
    const quotes = [q('2024-01-01', 100, 101, 99, 100)];
    expect(computeFilingSwing(quotes, '2024-01-05')).toBeNull();
  });

  it('computes signed price change baseline → lag close', () => {
    const quotes = [
      q('2024-01-01', 100, 100, 100, 100), // baseline (before filing)
      q('2024-01-02', 104, 106, 103, 105), // filing day (lag 1)
    ];
    const s = computeFilingSwing(quotes, '2024-01-02', 1)!;
    expect(s.changePct).toBeCloseTo(5, 5); // 100 → 105
    expect(s.swing).toBeCloseTo(5, 5);
  });

  it('honors lagDays for the reaction close', () => {
    const quotes = [
      q('2024-01-01', 100, 100, 100, 100), // baseline
      q('2024-01-02', 100, 100, 100, 102), // filing day
      q('2024-01-03', 100, 100, 100, 110), // +1
    ];
    const s = computeFilingSwing(quotes, '2024-01-02', 2)!; // close 2 days into window
    expect(s.changePct).toBeCloseTo(10, 5); // 100 → 110
  });

  it('intradayPct is filing-day open → close', () => {
    const quotes = [q('2024-01-01', 100, 100, 100, 100), q('2024-01-02', 100, 110, 95, 108)];
    const s = computeFilingSwing(quotes, '2024-01-02', 1)!;
    expect(s.intradayPct).toBeCloseTo(8, 5); // 100 → 108
  });

  it('trueRangePct includes the overnight gap from prior close', () => {
    const quotes = [
      q('2024-01-01', 100, 100, 100, 100), // prev close = 100
      q('2024-01-02', 106, 108, 104, 107), // gaps up; low 104 still > prevClose
    ];
    const s = computeFilingSwing(quotes, '2024-01-02', 1)!;
    // TR = (max(108,100) - min(104,100)) / 100 = (108 - 100)/100 = 8%
    expect(s.trueRangePct).toBeCloseTo(8, 5);
  });

  it('volSpikePct compares filing-day volume to the prior average', () => {
    const quotes = [
      q('2023-12-28', 100, 100, 100, 100, 1000),
      q('2023-12-29', 100, 100, 100, 100, 1000), // baseline window
      q('2024-01-02', 100, 100, 100, 100, 2000), // filing day, 2× prior avg
    ];
    const s = computeFilingSwing(quotes, '2024-01-02', 1)!;
    expect(s.volSpikePct).toBeCloseTo(100, 5); // +100%
  });

  it('volSpikePct is null when filing-day volume is missing', () => {
    const quotes = [
      q('2023-12-29', 100, 100, 100, 100, 1000),
      q('2024-01-02', 100, 100, 100, 100), // no volume
    ];
    const s = computeFilingSwing(quotes, '2024-01-02', 1)!;
    expect(s.volSpikePct).toBeNull();
  });
});
