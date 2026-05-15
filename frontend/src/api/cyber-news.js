import { apiFetch, qs } from './core.js';

export function getTickers(topic) {
  return apiFetch(`/cyber-news/tickers${qs({ topic })}`);
}

export function getSummary(ticker, topic) {
  return apiFetch(`/cyber-news/${ticker}/summary${qs({ topic })}`);
}

export function getArticles(ticker, topic) {
  return apiFetch(`/cyber-news/${ticker}/articles${qs({ topic })}`);
}

export function getTopics() {
  return apiFetch('/cyber-news/topics');
}

export function getRecent(limit = 50) {
  return apiFetch(`/cyber-news/recent?limit=${limit}`);
}

export function getCorrelations(lagDays = 1, topic) {
  return apiFetch(`/cyber-news/correlations${qs({ lagDays, topic })}`);
}
