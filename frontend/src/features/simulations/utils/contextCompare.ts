import type { GradedEvent } from '@algo/shared';

export type Pair = {
  date: string;
  category: string;
  actual: GradedEvent | null;
  predicted: GradedEvent | null;
};

export type Accuracy = {
  matched: number;
  /** predicted, but no actual counterpart */
  missed: number;
  /** happened, but never predicted */
  extra: number;
  meanAbsDelta: number | null;
};

/**
 * Pair actual company events against predicted events.
 * Match by (date + category) first, then fall back to date alone so near-misses
 * still align. Each prediction is consumed at most once.
 */
export function pairEvents(actual: GradedEvent[], predicted: GradedEvent[]): Pair[] {
  const key = (e: GradedEvent) => `${e.date}::${e.category}`;
  const predByKey = new Map(predicted.map((e) => [key(e), e]));
  const predByDate = new Map(predicted.map((e) => [e.date, e]));
  const usedPred = new Set<GradedEvent>();
  const pairs: Pair[] = [];

  for (const a of actual) {
    let p = predByKey.get(key(a)) ?? null;
    if (!p || usedPred.has(p)) {
      const byDate = predByDate.get(a.date);
      p = byDate && !usedPred.has(byDate) ? byDate : null;
    }
    if (p) usedPred.add(p);
    pairs.push({ date: a.date, category: a.category, actual: a, predicted: p });
  }
  for (const p of predicted) {
    if (!usedPred.has(p)) {
      pairs.push({ date: p.date, category: p.category, actual: null, predicted: p });
    }
  }
  return pairs.sort((x, y) => x.date.localeCompare(y.date));
}

export function accuracy(pairs: Pair[]): Accuracy {
  const matched = pairs.filter((p) => p.actual && p.predicted);
  const deltas = matched.map((p) => Math.abs(p.actual!.grade - p.predicted!.grade));
  return {
    matched: matched.length,
    missed: pairs.filter((p) => !p.actual && p.predicted).length,
    extra: pairs.filter((p) => p.actual && !p.predicted).length,
    meanAbsDelta: deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null,
  };
}
