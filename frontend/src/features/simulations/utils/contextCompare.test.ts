import { describe, it, expect } from 'vitest';
import { pairEvents, accuracy } from './contextCompare';
import type { GradedEvent } from '@algo/shared';

const ev = (date: string, category: string, grade: number): GradedEvent => ({
  date,
  category,
  grade,
  description: `${category} @ ${date}`,
});

describe('pairEvents', () => {
  it('matches actual and predicted on same date + category', () => {
    const actual = [ev('2024-07-19', 'breach', 10)];
    const predicted = [ev('2024-07-19', 'breach', 8)];
    const pairs = pairEvents(actual, predicted);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].actual?.grade).toBe(10);
    expect(pairs[0].predicted?.grade).toBe(8);
  });

  it('falls back to date-only match when category differs', () => {
    const pairs = pairEvents([ev('2024-08-28', 'earnings', 7)], [ev('2024-08-28', 'guidance', 6)]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].actual && pairs[0].predicted).toBeTruthy();
  });

  it('flags a predicted-only event as a miss (actual=null)', () => {
    const pairs = pairEvents([], [ev('2024-09-15', 'regulatory', 5)]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].actual).toBeNull();
    expect(pairs[0].predicted?.grade).toBe(5);
  });

  it('flags an unpredicted actual as extra (predicted=null)', () => {
    const pairs = pairEvents([ev('2024-07-22', 'sentiment', 8)], []);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].predicted).toBeNull();
    expect(pairs[0].actual?.grade).toBe(8);
  });

  it('consumes each prediction at most once and sorts by date', () => {
    const actual = [ev('2024-07-19', 'breach', 10), ev('2024-07-19', 'breach', 9)];
    const predicted = [ev('2024-07-19', 'breach', 8)];
    const pairs = pairEvents(actual, predicted);
    // first actual takes the prediction; second is left as extra
    const matched = pairs.filter((p) => p.actual && p.predicted);
    const extra = pairs.filter((p) => p.actual && !p.predicted);
    expect(matched).toHaveLength(1);
    expect(extra).toHaveLength(1);
    expect(pairs.map((p) => p.date)).toEqual([...pairs.map((p) => p.date)].sort());
  });
});

describe('accuracy', () => {
  it('counts matched/missed/extra and mean abs grade delta', () => {
    const actual = [ev('2024-07-19', 'breach', 10), ev('2024-08-28', 'earnings', 7)];
    const predicted = [
      ev('2024-07-19', 'breach', 8), // matched, |Δ|=2
      ev('2024-08-28', 'earnings', 6), // matched, |Δ|=1
      ev('2024-09-15', 'regulatory', 5), // predicted-only
    ];
    const acc = accuracy(pairEvents(actual, predicted));
    expect(acc.matched).toBe(2);
    expect(acc.missed).toBe(1);
    expect(acc.extra).toBe(0);
    expect(acc.meanAbsDelta).toBeCloseTo(1.5);
  });

  it('returns null meanAbsDelta when nothing matched', () => {
    const acc = accuracy(pairEvents([], [ev('2024-01-01', 'macro', 4)]));
    expect(acc.matched).toBe(0);
    expect(acc.meanAbsDelta).toBeNull();
  });
});
