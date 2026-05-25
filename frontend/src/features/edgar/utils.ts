import { FORM_PATTERNS } from './constants';
import type { SecFileListing } from './api';
import type { SeriesMarker, Time } from 'lightweight-charts';

export function getFormStyle(form?: string): { label: string; color: string } {
  return FORM_PATTERNS.find((p) => p.pattern.test(form ?? '')) ?? { label: form ?? '?', color: '#888' };
}

export function buildFilingMarkers(filings: SecFileListing[]): SeriesMarker<Time>[] {
  return filings
    .filter((f) => f.date)
    .map((f) => ({
      time: f.date! as Time,
      position: 'aboveBar' as const,
      color: getFormStyle(f.form).color,
      shape: 'circle' as const,
      text: getFormStyle(f.form).label,
    }))
    .sort((a, b) => (a.time < b.time ? -1 : 1));
}
