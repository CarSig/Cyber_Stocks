import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getTicker } from '@/features/tickers/api';
import type { TickerData } from '@/types';
import { computeFilingSwing, type FilingSwing } from '../filingSwings';

const TICKER_TTL = 6 * 60 * 60 * 1000;

export type SwingRow = {
  /** Stable key to look the result up by (e.g. accession). */
  key: string;
  ticker: string;
  filingDate: string;
};

/**
 * Price/volume/volatility swings for a list of filings that may span MANY
 * tickers (e.g. the cross-company scanned-incident list). Quotes are fetched
 * once per distinct ticker via useQueries — sharing the ['ticker', t] cache
 * with useStock — then `computeFilingSwing` is applied per row.
 *
 * Returns a Map keyed by `row.key`. Rows whose ticker is still loading or has
 * no usable coverage are simply absent from the map.
 */
export function useFilingSwings(rows: SwingRow[], lagDays = 1): Map<string, FilingSwing> {
  const tickers = useMemo(() => [...new Set(rows.map((r) => r.ticker))], [rows]);

  const results = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['ticker', t],
      queryFn: () => getTicker(t),
      staleTime: TICKER_TTL,
      gcTime: TICKER_TTL,
    })),
  });

  // `results` gets a fresh array identity every render, so memo on a string
  // digest of the data we actually read (advances only when a query resolves).
  const dataKey = results.map((r) => r.dataUpdatedAt).join('|');

  // Sorted-quote arrays keyed by ticker, computed once per data change.
  const sortedByTicker = useMemo(() => {
    const m = new Map<string, TickerData['history']['quotes']>();
    tickers.forEach((t, i) => {
      const quotes = results[i]?.data?.history?.quotes;
      if (quotes?.length) m.set(t, [...quotes].sort((a, b) => a.date.localeCompare(b.date)));
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers, dataKey]);

  return useMemo(() => {
    const out = new Map<string, FilingSwing>();
    for (const row of rows) {
      const sorted = sortedByTicker.get(row.ticker);
      if (!sorted) continue;
      const swing = computeFilingSwing(sorted, row.filingDate, lagDays);
      if (swing) out.set(row.key, swing);
    }
    return out;
  }, [rows, sortedByTicker, lagDays]);
}
