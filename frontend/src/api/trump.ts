import { apiFetch } from './core';
import type { TrumpPost, CorrelationResult, LagImpact } from '@/types';

export function getPosts(): Promise<TrumpPost[]> {
  return apiFetch<TrumpPost[]>('/trump/posts');
}

export function getPostsForTicker(ticker: string): Promise<TrumpPost[]> {
  return apiFetch<TrumpPost[]>(`/trump/posts/${ticker}`);
}

export function getCorrelation(ticker: string, lagDays = 1): Promise<CorrelationResult> {
  return apiFetch<CorrelationResult>(`/trump/correlate/${ticker}?lagDays=${lagDays}`);
}

export function getLagImpact(ticker: string, lagDays = 7): Promise<LagImpact> {
  return apiFetch<LagImpact>(`/trump/lag-impact/${ticker}?lagDays=${lagDays}`);
}
