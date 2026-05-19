import { useQuery } from '@tanstack/react-query';
import { getEntityArticles, getEntitySummary, getSignals, getEntities, getSentimentCorrelations } from '../api';

export function useEntityIntelligence(entityId: string | null, signal?: string) {
  const articles = useQuery({
    queryKey: ['intelligence-articles', entityId, signal],
    queryFn: () => getEntityArticles(entityId!, signal),
    enabled: !!entityId,
  });

  const summary = useQuery({
    queryKey: ['intelligence-summary', entityId, signal],
    queryFn: () => getEntitySummary(entityId!, signal),
    enabled: !!entityId,
    retry: false,
  });

  return { articles, summary };
}

export function useGlobalSignals() {
  return useQuery({
    queryKey: ['intelligence-signals'],
    queryFn: getSignals,
  });
}

export function useBackendEntities() {
  return useQuery({
    queryKey: ['intelligence-entities'],
    queryFn: getEntities,
  });
}

export function useAllSentimentCorrelations(lagDays = 1, signal?: string) {
  return useQuery({
    queryKey: ['intelligence-sentiment-correlations', lagDays, signal],
    queryFn: () => getSentimentCorrelations(lagDays, signal),
    retry: false,
  });
}
