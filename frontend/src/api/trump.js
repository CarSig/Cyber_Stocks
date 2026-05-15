import { apiFetch } from './core.js';

export function getPosts() {
  return apiFetch('/trump/trump-posts');
}

export function getPostsForTicker(ticker) {
  return apiFetch(`/trump/trump-posts/${ticker}`);
}

export function getCorrelation(ticker, lagDays = 1) {
  return apiFetch(`/trump/correlate-trump/${ticker}?lagDays=${lagDays}`);
}

export function getLagImpact(ticker, lagDays = 7) {
  return apiFetch(`/trump/trump-lag-impact/${ticker}?lagDays=${lagDays}`);
}
