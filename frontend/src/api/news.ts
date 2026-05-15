import { apiFetch } from './core';
import type { NewsAnalysisMap, CorrelationResult, LagImpact } from '@/types';

type AnalyzeResponse = { queued: number };
type NewsCorrelationResponse = { correlation?: CorrelationResult; lagImpact?: LagImpact };

export function getAnalysis(ticker: string): Promise<NewsAnalysisMap> {
  return apiFetch<NewsAnalysisMap>(`/news/news-analysis/${ticker}`);
}

export function analyze(ticker: string): Promise<AnalyzeResponse> {
  return apiFetch<AnalyzeResponse>(`/news/news-analyze/${ticker}`, { method: 'POST' });
}

export function getCorrelation(ticker: string, lagDays = 1): Promise<NewsCorrelationResponse> {
  return apiFetch<NewsCorrelationResponse>(`/news/news-correlation/${ticker}?lagDays=${lagDays}`);
}
