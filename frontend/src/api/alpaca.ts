import { apiFetch } from './core';
import type { AlpacaBar } from '@/types';

type AlpacaBarsResponse = { bars: AlpacaBar[]; symbol: string };

export type IntradayEvent = {
  rank: number;
  event: string;
  severity: number;
  ticker: string;
  peers: string[];
  trade_idea: string;
  source: string;
  source_date: string;
  source_time: string;
  source_link: string;
  first_time: string;
  first_date: string;
  first_link: string;
  notes: string;
  chart_date: string;
  chart_time: string;
  after_hours: boolean;
  timing: 'pre-market' | 'post-market' | 'during';
};

export function getBars(ticker: string, date: string, timeframe = '1Min'): Promise<AlpacaBarsResponse> {
  return apiFetch<AlpacaBarsResponse>(`/alpaca/bars/${encodeURIComponent(ticker)}?date=${date}&timeframe=${timeframe}`);
}

export function getIntradayEvents(): Promise<IntradayEvent[]> {
  return apiFetch<IntradayEvent[]>('/alpaca/events');
}
