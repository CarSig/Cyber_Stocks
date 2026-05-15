import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getTicker, getCompanies, getCorrelation } from '@/api/stock.js';
import { withLsCache } from '@/utils/lsCache.js';

function percentageDiff(a, b) {
  return (((b - a) / a) * 100).toFixed(2) + '%';
}

function analyzeQuotes(quotes) {
  const parsed = quotes
    .filter((q) => q.open != null && q.close != null)
    .map((q) => ({ open: q.open, close: q.close, date: q.date }));
  if (parsed.length < 2) return null;

  const biggestSameDayDiff = parsed.reduce((best, cur) =>
    Math.abs(cur.open - cur.close) > Math.abs(best.open - best.close) ? cur : best,
  );

  const bestIdx = parsed.reduce((best, _, i) => {
    if (i === parsed.length - 1) return best;
    return Math.abs(parsed[i + 1].close - parsed[i].close) > Math.abs(parsed[best + 1].close - parsed[best].close)
      ? i
      : best;
  }, 0);

  const day1 = parsed[bestIdx];
  const day2 = parsed[bestIdx + 1];
  return {
    biggestSameDayDiff: {
      ...biggestSameDayDiff,
      difference: percentageDiff(biggestSameDayDiff.open, biggestSameDayDiff.close),
    },
    biggestNextDayDiff: [day1, day2, percentageDiff(day1.close, day2.close)],
  };
}

function filterByPeriod(quotes, days) {
  if (!days) return quotes;
  const cutoff = new Date(Date.now() - days * 86400000);
  return quotes.filter((q) => new Date(q.date) >= cutoff);
}

const TICKER_TTL = 60 * 60 * 1000;

export function useStock(ticker, { compareTicker, period } = {}) {
  const { data, error, isPending } = useQuery({
    queryKey: ['ticker', ticker],
    queryFn: withLsCache(`ticker_${ticker}`, TICKER_TTL, () => getTicker(ticker)),
    staleTime: TICKER_TTL,
    gcTime: TICKER_TTL,
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: withLsCache('companies', TICKER_TTL, getCompanies),
    staleTime: TICKER_TTL,
    gcTime: TICKER_TTL,
  });

  const { data: compareData } = useQuery({
    queryKey: ['ticker', compareTicker],
    queryFn: withLsCache(`ticker_${compareTicker}`, TICKER_TTL, () => getTicker(compareTicker)),
    enabled: !!compareTicker,
    staleTime: TICKER_TTL,
    gcTime: TICKER_TTL,
  });

  const allQuotes = useMemo(() => data?.history?.quotes ?? [], [data]);
  const compareQuotes = useMemo(() => compareData?.history?.quotes ?? [], [compareData]);
  const periodAnalysis = useMemo(() => analyzeQuotes(filterByPeriod(allQuotes, period)), [allQuotes, period]);

  return {
    data,
    error,
    isPending,
    allQuotes,
    compareQuotes,
    periodAnalysis,
    news: data?.news,
    summary: data?.summary,
    companies,
  };
}

export function useCorrelation(ticker, compareTicker, period, lagDays) {
  return useQuery({
    queryKey: ['correlate', ticker, compareTicker, period, lagDays],
    queryFn: () => getCorrelation(ticker, compareTicker, period, lagDays),
    enabled: !!compareTicker,
    placeholderData: (prev) => prev,
  });
}
