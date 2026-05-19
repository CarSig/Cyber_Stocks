import { useQuery } from '@tanstack/react-query';
import { getTickers, getSummary, getArticles, getTopics, getRecent, getCorrelations } from '../api/cyber-news';

export function useCyberNewsTickers(topic?: string) {
  return useQuery({
    queryKey: ['cyber-news-tickers', topic],
    queryFn: () => getTickers(topic),
  });
}

export function useCyberNewsSummary(ticker: string, topic?: string) {
  return useQuery({
    queryKey: ['cyber-news-summary', ticker, topic],
    queryFn: () => getSummary(ticker, topic),
    enabled: !!ticker,
    retry: false,
  });
}

export function useCyberNewsArticles(ticker: string, topic?: string) {
  return useQuery({
    queryKey: ['cyber-news-articles', ticker, topic],
    queryFn: () => getArticles(ticker, topic),
    enabled: !!ticker,
  });
}

export function useCyberNewsTopics() {
  return useQuery({
    queryKey: ['cyber-news-topics'],
    queryFn: getTopics,
  });
}

export function useCyberNewsRecent(limit = 50) {
  return useQuery({
    queryKey: ['cyber-news-recent', limit],
    queryFn: () => getRecent(limit),
  });
}

export function useCyberNewsCorrelations(lagDays = 1, topic?: string) {
  return useQuery({
    queryKey: ['cyber-news-correlations', lagDays, topic],
    queryFn: () => getCorrelations(lagDays, topic),
    retry: false,
  });
}
