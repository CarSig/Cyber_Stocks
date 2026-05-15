import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPostsForTicker, getCorrelation, getLagImpact } from '@/api/trump';
import { useCorrelationQuery } from './useCorrelationQuery';

export function useTrump(ticker: string) {
  const [lagDays, setLagDays] = useState(1);

  const { data: posts } = useQuery({
    queryKey: ['trump-posts', ticker],
    queryFn: () => getPostsForTicker(ticker),
  });

  const hasData = !!posts?.length;

  const correlation = useCorrelationQuery(
    ['correlate-trump', ticker, lagDays],
    () => getCorrelation(ticker, lagDays),
    hasData,
  );

  const { data: lagImpact } = useCorrelationQuery(
    ['trump-lag-impact', ticker, lagDays],
    () => getLagImpact(ticker, lagDays),
    hasData,
  );

  return {
    posts,
    correlation: correlation.data,
    correlationFetching: correlation.isFetching,
    lagImpact,
    hasData,
    lagDays,
    setLagDays,
  };
}
