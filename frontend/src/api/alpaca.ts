import { apiFetch } from './core';
import type { AlpacaBar } from '@/types';

type AlpacaBarsResponse = { bars: AlpacaBar[]; symbol: string };

export function getBars(ticker: string, date: string, timeframe = '1Min'): Promise<AlpacaBarsResponse> {
  return apiFetch<AlpacaBarsResponse>(`/alpaca/bars/${encodeURIComponent(ticker)}?date=${date}&timeframe=${timeframe}`);
}
