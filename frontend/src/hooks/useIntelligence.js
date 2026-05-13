import { useQuery } from "@tanstack/react-query";
import {
  getIntelligenceEntityArticles,
  getIntelligenceEntitySummary,
  getIntelligenceSignals,
  getIntelligenceEntities,
  getIntelligenceSentimentCorrelations,
} from "@/api.js";

export function useEntityIntelligence(entityId, signal) {
  const articles = useQuery({
    queryKey: ["intelligence-articles", entityId, signal],
    queryFn: () => getIntelligenceEntityArticles(entityId, signal),
    enabled: !!entityId,
  });

  const summary = useQuery({
    queryKey: ["intelligence-summary", entityId, signal],
    queryFn: () => getIntelligenceEntitySummary(entityId, signal),
    enabled: !!entityId,
    retry: false,
  });

  return { articles, summary };
}

export function useGlobalSignals() {
  return useQuery({
    queryKey: ["intelligence-signals"],
    queryFn: getIntelligenceSignals,
  });
}

export function useBackendEntities() {
  return useQuery({
    queryKey: ["intelligence-entities"],
    queryFn: getIntelligenceEntities,
  });
}

export function useAllSentimentCorrelations(lagDays = 1, signal) {
  return useQuery({
    queryKey: ["intelligence-sentiment-correlations", lagDays, signal],
    queryFn: () => getIntelligenceSentimentCorrelations(lagDays, signal),
    retry: false,
  });
}
