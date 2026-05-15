import { apiFetch } from "./core.js";

export function getPosts() {
  return apiFetch("/trump-posts");
}

export function getPostsForTicker(ticker) {
  return apiFetch(`/trump-posts/${ticker}`);
}

export function getCorrelation(ticker, lagDays = 1) {
  return apiFetch(`/correlate-trump/${ticker}?lagDays=${lagDays}`);
}

export function getLagImpact(ticker, lagDays = 7) {
  return apiFetch(`/trump-lag-impact/${ticker}?lagDays=${lagDays}`);
}
