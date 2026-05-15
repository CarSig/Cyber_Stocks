import { apiFetch } from './core.js';

export function getAnalysis(ticker) {
  return apiFetch(`/news/news-analysis/${ticker}`);
}

export function analyze(ticker) {
  return apiFetch(`/news/news-analyze/${ticker}`, { method: 'POST' });
}

export function getCorrelation(ticker, lagDays = 1) {
  return apiFetch(`/news/news-correlation/${ticker}?lagDays=${lagDays}`);
}
