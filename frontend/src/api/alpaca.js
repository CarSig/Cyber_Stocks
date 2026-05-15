import { apiFetch } from './core.js';

export function getBars(ticker, date, timeframe = '1Min') {
  return apiFetch(`/alpaca/bars/${encodeURIComponent(ticker)}?date=${date}&timeframe=${timeframe}`);
}
