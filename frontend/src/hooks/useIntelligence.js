import { useQuery } from "@tanstack/react-query";
import {
  getIntelligenceEntityArticles,
  getIntelligenceEntitySummary,
  getIntelligenceSignals,
  getIntelligenceEntities,
  getIntelligenceSentimentCorrelations,
} from "../api.js";

export function useEntityIntelligence(entityId) {
  const articles = useQuery({
    queryKey: ["intelligence-articles", entityId],
    queryFn: () => getIntelligenceEntityArticles(entityId),
    enabled: !!entityId,
    placeholderData: (prev) => prev,
  });

  const summary = useQuery({
    queryKey: ["intelligence-summary", entityId],
    queryFn: () => getIntelligenceEntitySummary(entityId),
    enabled: !!entityId,
    retry: false,
    placeholderData: (prev) => prev,
  });

  return { articles, summary };
}

export function useGlobalSignals() {
  return useQuery({
    queryKey: ["intelligence-signals"],
    queryFn: getIntelligenceSignals,
    placeholderData: (prev) => prev,
  });
}

export function useBackendEntities() {
  return useQuery({
    queryKey: ["intelligence-entities"],
    queryFn: getIntelligenceEntities,
    placeholderData: (prev) => prev,
  });
}

export function useAllSentimentCorrelations(lagDays = 1) {
  return useQuery({
    queryKey: ["intelligence-sentiment-correlations", lagDays],
    queryFn: () => getIntelligenceSentimentCorrelations(lagDays),
    retry: false,
    placeholderData: (prev) => prev,
  });
}
