import { apiFetch } from "./core.js";

export function getAnalysis(ticker) {
  return apiFetch(`/news-analysis/${ticker}`);
}

export function analyze(ticker) {
  return apiFetch(`/news-analyze/${ticker}`, { method: "POST" });
}

export function getCorrelation(ticker, lagDays = 1) {
  return apiFetch(`/news-correlation/${ticker}?lagDays=${lagDays}`);
}
