import { useMemo } from 'react';
import { useSecFiles } from './useSecData';
import { useStock } from '@/features/tickers/hooks/useStock';
import type { Quote } from '@/types';

export type FilingImpact = {
  accession: string;
  date: string;
  form: string;
  baselineClose: number; // last close BEFORE filing date (pre-filing baseline)
  lagClose: number; // close N trading days after filing date
  changePct: number;
  swing: number;
};

export type FormGroup = {
  form: string;
  filings: FilingImpact[];
  avgSwing: number;
  avgChangePct: number;
};

// Returns index of the last quote strictly before `date`, or -1 if none.
function findQuoteBefore(quotes: Quote[], date: string): number {
  let lo = 0;
  let hi = quotes.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (quotes[mid].date < date) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

// Returns index of the first quote on or after `date`, or -1 if none.
function findQuoteOnOrAfter(quotes: Quote[], date: string): number {
  let lo = 0;
  let hi = quotes.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (quotes[mid].date >= date) {
      result = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return result;
}

function avg(vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function useSecFilingImpact(ticker: string, lagDays = 1): FormGroup[] {
  const { data: listings = [] } = useSecFiles(ticker);
  const { allQuotes } = useStock(ticker, {});

  return useMemo(() => {
    if (!listings.length || !allQuotes.length) return [];

    const sorted = [...allQuotes].sort((a, b) => a.date.localeCompare(b.date));

    const impacts: FilingImpact[] = [];

    for (const l of listings) {
      if (!l.date || !l.form) continue;

      // Baseline: last close before the filing date (market hadn't seen the filing yet)
      const baseIdx = findQuoteBefore(sorted, l.date);
      if (baseIdx === -1) continue;

      // First trading day on or after filing date, then +lagDays-1 more = lagDays days of reaction
      const firstReactionIdx = findQuoteOnOrAfter(sorted, l.date);
      if (firstReactionIdx === -1) continue;
      const lagIdx = firstReactionIdx + lagDays - 1;
      if (lagIdx >= sorted.length) continue;

      const baselineClose = sorted[baseIdx].close;
      const lagClose = sorted[lagIdx].close;
      if (baselineClose == null || lagClose == null) continue;

      const changePct = ((lagClose - baselineClose) / baselineClose) * 100;
      const swing = Math.abs(changePct);

      impacts.push({
        accession: l.accession,
        date: l.date,
        form: l.form,
        baselineClose,
        lagClose,
        changePct,
        swing,
      });
    }

    const map = new Map<string, FilingImpact[]>();
    for (const impact of impacts) {
      const group = map.get(impact.form) ?? [];
      group.push(impact);
      map.set(impact.form, group);
    }

    const groups: FormGroup[] = [];
    for (const [form, filings] of map) {
      filings.sort((a, b) => b.date.localeCompare(a.date));
      groups.push({
        form,
        filings,
        avgSwing: avg(filings.map((f) => f.swing)),
        avgChangePct: avg(filings.map((f) => f.changePct)),
      });
    }

    groups.sort((a, b) => b.filings.length - a.filings.length);
    return groups;
  }, [listings, allQuotes, lagDays]);
}
