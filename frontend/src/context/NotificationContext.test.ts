import { describe, it, expect } from 'vitest';
import { groupByCompany } from './groupByCompany';
import type { AppNotification } from '@/types';

function notif(partial: Partial<AppNotification> & { type: string }): AppNotification {
  return { id: crypto.randomUUID(), read: false, ...partial };
}

describe('groupByCompany', () => {
  it('merges news, filings and price change for the same ticker', () => {
    const result = groupByCompany([
      notif({ type: 'news.analyzed', tickerCounts: [{ ticker: 'MSFT', count: 2 }] }),
      notif({ type: 'edgar.new_filings', changes: [{ ticker: 'MSFT', count: 1 }] }),
      notif({ type: 'stocks.updated', changes: [{ ticker: 'MSFT', changePct: 1.2 }] }),
    ]);
    expect(result).toEqual([{ ticker: 'MSFT', news: 2, filings: 1, changePct: 1.2 }]);
  });

  it('separates multiple tickers and sums repeated counts', () => {
    const result = groupByCompany([
      notif({ type: 'news.analyzed', tickerCounts: [{ ticker: 'MSFT', count: 2 }, { ticker: 'NVDA', count: 1 }] }),
      notif({ type: 'news.analyzed', tickerCounts: [{ ticker: 'MSFT', count: 3 }] }),
    ]);
    const msft = result.find((r) => r.ticker === 'MSFT');
    const nvda = result.find((r) => r.ticker === 'NVDA');
    expect(msft).toMatchObject({ news: 5, filings: 0, changePct: null });
    expect(nvda).toMatchObject({ news: 1 });
  });

  it('uses the newest stocks.updated value (notifications are prepended newest-first)', () => {
    const result = groupByCompany([
      notif({ type: 'stocks.updated', changes: [{ ticker: 'MSFT', changePct: 3.5 }] }), // newest
      notif({ type: 'stocks.updated', changes: [{ ticker: 'MSFT', changePct: -1.0 }] }), // older
    ]);
    expect(result[0].changePct).toBe(3.5);
  });

  it('excludes global events with no ticker breakdown', () => {
    const result = groupByCompany([
      notif({ type: 'news.updated', message: 'News updated for all companies' }),
      notif({ type: 'trump.updated' }),
      notif({ type: 'threatintel.updated' }),
    ]);
    expect(result).toEqual([]);
  });

  it('sorts by total activity, then by absolute price change', () => {
    const result = groupByCompany([
      notif({ type: 'news.analyzed', tickerCounts: [{ ticker: 'LOW', count: 1 }] }),
      notif({ type: 'news.analyzed', tickerCounts: [{ ticker: 'HIGH', count: 3 }] }),
      notif({ type: 'edgar.new_filings', changes: [{ ticker: 'HIGH', count: 2 }] }),
      notif({ type: 'stocks.updated', changes: [{ ticker: 'TIE_A', changePct: 0.5 }] }),
      notif({ type: 'stocks.updated', changes: [{ ticker: 'TIE_B', changePct: -4.0 }] }),
    ]);
    expect(result.map((r) => r.ticker)).toEqual(['HIGH', 'LOW', 'TIE_B', 'TIE_A']);
  });
});
