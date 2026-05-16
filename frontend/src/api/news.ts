import { apiFetch } from './core';
import type { NewsAnalysisMap, CorrelationResult, LagImpactResult } from '@algo/shared';

type AnalyzeResponse = { queued: number };
type NewsCorrelationResponse = { correlation?: CorrelationResult; lagImpact?: LagImpactResult };

export function getAnalysis(ticker: string): Promise<NewsAnalysisMap> {
  return apiFetch<NewsAnalysisMap>(`/news/analysis/${ticker}`);
}

export function analyze(ticker: string): Promise<AnalyzeResponse> {
  return apiFetch<AnalyzeResponse>(`/news/analyze/${ticker}`, { method: 'POST' });
}

export function getCorrelation(ticker: string, lagDays = 1): Promise<NewsCorrelationResponse> {
  return apiFetch<NewsCorrelationResponse>(`/news/correlation/${ticker}?lagDays=${lagDays}`);
}
