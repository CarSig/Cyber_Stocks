import { apiFetch, postJson, qs } from "./core.js";

export function getCompanies() {
  return apiFetch("/");
}

export function getTicker(ticker) {
  return apiFetch(`/${ticker}`);
}

export function getSparklines(tickers) {
  if (!tickers?.length) return Promise.resolve({});
  return apiFetch(`/sparklines?tickers=${tickers.join(",")}`);
}

export function runSimulation(ticker, actions) {
  return postJson(`/simulate/${ticker}`, { actions });
}

export function getSimulationPresets(ticker) {
  return apiFetch(`/simulation-presets/${ticker}`);
}

export function getCorrelationMatrix({ lagDays = 0, windowDays = 90, startDate, endDate } = {}) {
  return apiFetch(`/correlation-matrix${qs({ lagDays, windowDays, startDate, endDate })}`);
}

export function getCorrelation(tickerA, tickerB, windowDays, lagDays) {
  return apiFetch(`/correlate/${tickerA}/${tickerB}${qs({ windowDays, lagDays })}`);
}
