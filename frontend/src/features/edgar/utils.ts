import { FORM_PATTERNS } from './constants';
import type { SecFileListing } from './api';
import type { SeriesMarker, Time } from 'lightweight-charts';

export function getFormStyle(form?: string): { label: string; color: string } {
  return FORM_PATTERNS.find((p) => p.pattern.test(form ?? '')) ?? { label: form ?? '?', color: '#888' };
}

/**
 * Filing-day volume vs the average of the prior trading days, as a signed %
 * (+50 = 50% above the prior average). Returns null when there's no usable data.
 *
 * `volume` arrives from Postgres `bigint` as a STRING via the pg driver, so
 * every value is coerced with Number() — raw arithmetic on the strings would
 * silently concatenate and collapse the ratio toward -100%.
 */
export function volumeSpikePct(
  filingDayVolume: number | string | null | undefined,
  priorVolumes: Array<number | string | null | undefined>,
): number | null {
  const prior = priorVolumes.map((v) => (v != null ? Number(v) : NaN)).filter((v) => Number.isFinite(v));
  if (prior.length === 0) return null;
  const priorAvg = prior.reduce((s, v) => s + v, 0) / prior.length;
  if (priorAvg <= 0) return null;
  const day = filingDayVolume != null ? Number(filingDayVolume) : NaN;
  if (!Number.isFinite(day)) return null;
  return (day / priorAvg - 1) * 100;
}

export function buildFilingMarkers(filings: SecFileListing[]): SeriesMarker<Time>[] {
  // Collapse filings sharing the same day AND form type into a single marker so
  // we don't stack identical dots. The text becomes "N× LABEL" when N > 1.
  // (The constant top scale-margin on the chart reserves room for these labels,
  // so toggling markers on doesn't squeeze the series — see ChartAuto's
  // `topScaleMargin`.)
  const groups = new Map<string, { time: string; label: string; color: string; count: number }>();
  for (const f of filings) {
    const date = f.meta?.filingDate;
    if (!date) continue;
    const { label, color } = getFormStyle(f.meta!.form);
    const key = `${date}|${label}`;
    const existing = groups.get(key);
    if (existing) existing.count++;
    else groups.set(key, { time: date, label, color, count: 1 });
  }

  return [...groups.values()]
    .map((g) => ({
      time: g.time as Time,
      position: 'aboveBar' as const,
      color: g.color,
      shape: 'circle' as const,
      text: g.count > 1 ? `${g.count}× ${g.label}` : g.label,
    }))
    .sort((a, b) => (a.time < b.time ? -1 : 1));
}
