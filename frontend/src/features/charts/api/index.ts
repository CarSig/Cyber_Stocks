import { apiFetch } from '@/api/core';
import type { SimContext } from '@algo/shared';
import type { AlpacaBarsResponse, IntradayEvent } from '../types';

export type { IntradayEvent } from '../types';

export function getBars(ticker: string, date: string, timeframe = '1Min'): Promise<AlpacaBarsResponse> {
  return apiFetch<AlpacaBarsResponse>(`/alpaca/bars/${encodeURIComponent(ticker)}?date=${date}&timeframe=${timeframe}`);
}

export function getIntradayEvents(): Promise<IntradayEvent[]> {
  return apiFetch<IntradayEvent[]>('/alpaca/events');
}

export function getSimContext(ticker: string): Promise<SimContext> {
  return apiFetch<SimContext>(`/context/${encodeURIComponent(ticker)}`);
}
