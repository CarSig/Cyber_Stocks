import type { AppNotification } from '@/types';

export type CompanyActivity = {
  ticker: string;
  news: number;
  filings: number;
  changePct: number | null; // latest stocks.updated value, null if none
};

/**
 * Rolls up notifications into a per-company tally. The three relevant event
 * types fire at different times but carry per-ticker breakdowns; this merges
 * whatever is currently held in state into one row per ticker. Notifications
 * are prepended (newest first), so the first stocks.updated match wins.
 */
export function groupByCompany(notifications: AppNotification[]): CompanyActivity[] {
  const map = new Map<string, CompanyActivity>();
  const get = (ticker: string): CompanyActivity => {
    let row = map.get(ticker);
    if (!row) {
      row = { ticker, news: 0, filings: 0, changePct: null };
      map.set(ticker, row);
    }
    return row;
  };

  for (const n of notifications) {
    if (n.type === 'news.analyzed') {
      const counts = n.tickerCounts as Array<{ ticker: string; count: number }> | undefined;
      counts?.forEach(({ ticker, count }) => {
        get(ticker).news += count;
      });
    } else if (n.type === 'edgar.new_filings') {
      const changes = n.changes as Array<{ ticker: string; count: number }> | undefined;
      changes?.forEach(({ ticker, count }) => {
        get(ticker).filings += count;
      });
    } else if (n.type === 'stocks.updated') {
      const changes = n.changes as Array<{ ticker: string; changePct: number }> | undefined;
      changes?.forEach(({ ticker, changePct }) => {
        const row = get(ticker);
        if (row.changePct === null) row.changePct = changePct; // newest wins
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const byActivity = b.news + b.filings - (a.news + a.filings);
    if (byActivity !== 0) return byActivity;
    return Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0);
  });
}
