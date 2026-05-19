import { apiFetch, qs } from '@/api/core';
import type {
  IntelligenceArticle,
  CorrelationResult,
  IntelligenceEntity,
  IntelligenceSignal,
  IntelligenceEntitySummary,
} from '@/types';

export type SentimentCorrelationEntry = {
  entityId: string;
  correlation?: CorrelationResult;
};

export function getEntityArticles(entityId: string, signal?: string): Promise<IntelligenceArticle[]> {
  return apiFetch<IntelligenceArticle[]>(
    `/intelligence/entities/${encodeURIComponent(entityId)}/articles${qs({ signal })}`,
  );
}

export function getEntitySummary(entityId: string, signal?: string): Promise<IntelligenceEntitySummary> {
  return apiFetch<IntelligenceEntitySummary>(
    `/intelligence/entities/${encodeURIComponent(entityId)}/summary${qs({ signal })}`,
  );
}

export function getSignals(): Promise<IntelligenceSignal[]> {
  return apiFetch<IntelligenceSignal[]>('/intelligence/signals');
}

export function getEntities(): Promise<IntelligenceEntity[]> {
  return apiFetch<IntelligenceEntity[]>('/intelligence/entities');
}

export function getSentimentCorrelations(lagDays = 1, signal?: string): Promise<SentimentCorrelationEntry[]> {
  return apiFetch<SentimentCorrelationEntry[]>(`/intelligence/sentiment-correlations${qs({ lagDays, signal })}`);
}
