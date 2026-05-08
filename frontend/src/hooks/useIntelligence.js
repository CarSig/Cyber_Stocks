import { useQuery } from "@tanstack/react-query";
import {
  getIntelligenceEntityArticles,
  getIntelligenceEntitySummary,
  getIntelligenceSignals,
  getIntelligence2EntityArticles,
  getIntelligence2EntitySummary,
  getIntelligence2Signals,
  getIntelligence2Entities,
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

export function useEntityIntelligence2(entityId) {
  const articles = useQuery({
    queryKey: ["intelligence2-articles", entityId],
    queryFn: () => getIntelligence2EntityArticles(entityId),
    enabled: !!entityId,
    placeholderData: (prev) => prev,
  });

  const summary = useQuery({
    queryKey: ["intelligence2-summary", entityId],
    queryFn: () => getIntelligence2EntitySummary(entityId),
    enabled: !!entityId,
    retry: false,
    placeholderData: (prev) => prev,
  });

  return { articles, summary };
}

export function useGlobalSignals2() {
  return useQuery({
    queryKey: ["intelligence2-signals"],
    queryFn: getIntelligence2Signals,
    placeholderData: (prev) => prev,
  });
}

export function useBackendEntities() {
  return useQuery({
    queryKey: ["intelligence2-entities"],
    queryFn: getIntelligence2Entities,
    placeholderData: (prev) => prev,
  });
}
