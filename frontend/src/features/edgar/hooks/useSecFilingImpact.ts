import { useMemo } from 'react';
import { useSecFiles } from './useSecData';
import { useStock } from '@/features/tickers/hooks/useStock';
import { computeFilingSwing, type FilingSwing } from '../filingSwings';

export type FilingImpact = FilingSwing & {
  accession: string;
  date: string;
  form: string;
};

export type FormGroup = {
  form: string;
  filings: FilingImpact[];
  avgSwing: number;
  avgChangePct: number;
  avgIntradayPct: number | null;
  avgTrueRangePct: number | null;
  avgVolSpikePct: number | null;
};

function avg(vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Optional inclusive filing-date window (YYYY-MM-DD). Filings outside it are
 *  excluded before grouping, so counts and averages reflect only the range. */
export type DateRange = { from: string; to: string };

export function useSecFilingImpact(ticker: string, lagDays = 1, dateRange?: DateRange | null): FormGroup[] {
  const { data: listings = [] } = useSecFiles(ticker);
  const { allQuotes } = useStock(ticker, {});

  const from = dateRange?.from ?? null;
  const to = dateRange?.to ?? null;

  return useMemo(() => {
    if (!listings.length || !allQuotes.length) return [];

    const sorted = [...allQuotes].sort((a, b) => a.date.localeCompare(b.date));

    const impacts: FilingImpact[] = [];

    for (const l of listings) {
      if (!l.meta?.filingDate || !l.meta.form) continue;
      const d = l.meta.filingDate;
      if ((from && d < from) || (to && d > to)) continue;
      const swing = computeFilingSwing(sorted, d, lagDays);
      if (!swing) continue;
      impacts.push({ accession: l.accession, date: d, form: l.meta.form, ...swing });
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
      const intradayValues = filings.map((f) => f.intradayPct).filter((v): v is number => v !== null);
      const trValues = filings.map((f) => f.trueRangePct).filter((v): v is number => v !== null);
      const volValues = filings.map((f) => f.volSpikePct).filter((v): v is number => v !== null);
      groups.push({
        form,
        filings,
        avgSwing: avg(filings.map((f) => f.swing)),
        avgChangePct: avg(filings.map((f) => f.changePct)),
        avgIntradayPct: intradayValues.length ? avg(intradayValues) : null,
        avgTrueRangePct: trValues.length ? avg(trValues) : null,
        avgVolSpikePct: volValues.length ? avg(volValues) : null,
      });
    }

    groups.sort((a, b) => b.filings.length - a.filings.length);
    return groups;
  }, [listings, allQuotes, lagDays, from, to]);
}
