import { apiFetch, postJson, qs } from './core.js';

export function getCompanies() {
  return apiFetch('/stocks');
}

export function getTicker(ticker) {
  return apiFetch(`/stocks/${ticker}`);
}

export function getSparklines(tickers) {
  if (!tickers?.length) return Promise.resolve({});
  return apiFetch(`/stocks/sparklines?tickers=${tickers.join(',')}`);
}

export function runSimulation(ticker, actions) {
  return postJson(`/stocks/simulate/${ticker}`, { actions });
}

export function getSimulationPresets(ticker) {
  return apiFetch(`/stocks/simulation-presets/${ticker}`);
}

export function getCorrelationMatrix({ lagDays = 0, windowDays = 90, startDate, endDate } = {}) {
  return apiFetch(`/stocks/correlation-matrix${qs({ lagDays, windowDays, startDate, endDate })}`);
}

export function getCorrelation(tickerA, tickerB, windowDays, lagDays) {
  return apiFetch(`/stocks/correlate/${tickerA}/${tickerB}${qs({ windowDays, lagDays })}`);
}
