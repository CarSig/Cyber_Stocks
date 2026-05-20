import { FORM_COLORS } from './constants';
import type { SecFileListing } from './api';
import type { SeriesMarker, Time } from 'lightweight-charts';

function filingColor(form?: string): string {
  return FORM_COLORS.find((f) => f.pattern.test(form ?? ''))?.color ?? '#888';
}

function filingLabel(form?: string): string {
  return FORM_COLORS.find((f) => f.pattern.test(form ?? ''))?.label ?? form ?? '?';
}

export function buildFilingMarkers(filings: SecFileListing[]): SeriesMarker<Time>[] {
  return filings
    .filter((f) => f.date)
    .map((f) => ({
      time: f.date! as Time,
      position: 'aboveBar' as const,
      color: filingColor(f.form),
      shape: 'circle' as const,
      text: filingLabel(f.form),
    }))
    .sort((a, b) => (a.time < b.time ? -1 : 1));
}
