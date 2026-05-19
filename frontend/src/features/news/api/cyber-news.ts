import { apiFetch, qs } from '@/api/core';
import type { NewsArticle, CorrelationResult, CyberNewsTicker, CyberNewsSummary, CyberNewsTopic } from '@/types';

export type CyberNewsCorrelationEntry = {
  ticker: string;
  correlation?: CorrelationResult;
};

export function getTickers(topic?: string): Promise<CyberNewsTicker[]> {
  return apiFetch<CyberNewsTicker[]>(`/cyber-news/tickers${qs({ topic })}`);
}

export function getSummary(ticker: string, topic?: string): Promise<CyberNewsSummary> {
  return apiFetch<CyberNewsSummary>(`/cyber-news/${ticker}/summary${qs({ topic })}`);
}

export function getArticles(ticker: string, topic?: string): Promise<NewsArticle[]> {
  return apiFetch<NewsArticle[]>(`/cyber-news/${ticker}/articles${qs({ topic })}`);
}

export function getTopics(): Promise<CyberNewsTopic[]> {
  return apiFetch<CyberNewsTopic[]>('/cyber-news/topics');
}

export function getRecent(limit = 50): Promise<NewsArticle[]> {
  return apiFetch<NewsArticle[]>(`/cyber-news/recent?limit=${limit}`);
}

export function getCorrelations(lagDays = 1, topic?: string): Promise<CyberNewsCorrelationEntry[]> {
  return apiFetch<CyberNewsCorrelationEntry[]>(`/cyber-news/correlations${qs({ lagDays, topic })}`);
}
