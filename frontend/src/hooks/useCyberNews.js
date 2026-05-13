import { useQuery } from "@tanstack/react-query";
import {
  getCyberNewsTickers,
  getCyberNewsSummary,
  getCyberNewsArticles,
  getCyberNewsTopics,
  getCyberNewsRecent,
  getCyberNewsCorrelations,
} from "@/api.js";

export function useCyberNewsTickers(topic) {
  return useQuery({
    queryKey: ["cyber-news-tickers", topic],
    queryFn: () => getCyberNewsTickers(topic),
  });
}

export function useCyberNewsSummary(ticker, topic) {
  return useQuery({
    queryKey: ["cyber-news-summary", ticker, topic],
    queryFn: () => getCyberNewsSummary(ticker, topic),
    enabled: !!ticker,
    retry: false,
  });
}

export function useCyberNewsArticles(ticker, topic) {
  return useQuery({
    queryKey: ["cyber-news-articles", ticker, topic],
    queryFn: () => getCyberNewsArticles(ticker, topic),
    enabled: !!ticker,
  });
}

export function useCyberNewsTopics() {
  return useQuery({
    queryKey: ["cyber-news-topics"],
    queryFn: getCyberNewsTopics,
  });
}

export function useCyberNewsRecent(limit = 50) {
  return useQuery({
    queryKey: ["cyber-news-recent", limit],
    queryFn: () => getCyberNewsRecent(limit),
  });
}

export function useCyberNewsCorrelations(lagDays = 1, topic) {
  return useQuery({
    queryKey: ["cyber-news-correlations", lagDays, topic],
    queryFn: () => getCyberNewsCorrelations(lagDays, topic),
    retry: false,
  });
}
