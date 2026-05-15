import { apiFetch, qs } from './core.js';

export function getEntityArticles(entityId, signal) {
  return apiFetch(`/intelligence/entities/${encodeURIComponent(entityId)}/articles${qs({ signal })}`);
}

export function getEntitySummary(entityId, signal) {
  return apiFetch(`/intelligence/entities/${encodeURIComponent(entityId)}/summary${qs({ signal })}`);
}

export function getSignals() {
  return apiFetch('/intelligence/signals');
}

export function getEntities() {
  return apiFetch('/intelligence/entities');
}

export function getSentimentCorrelations(lagDays = 1, signal) {
  return apiFetch(`/intelligence/sentiment-correlations${qs({ lagDays, signal })}`);
}
