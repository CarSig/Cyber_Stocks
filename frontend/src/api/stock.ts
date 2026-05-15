import { apiFetch, postJson, qs } from './core';
import type { TickerData, Quote, CorrelationResult, SimulationAction, SimulationResult, SimulationPreset, SparklineData, CorrelationMatrixData } from '@/types';

export function getCompanies(): Promise<Record<string, string>> {
  return apiFetch<Record<string, string>>('/stocks');
}

export function getTicker(ticker: string): Promise<TickerData> {
  return apiFetch<TickerData>(`/stocks/${ticker}`);
}

export function getSparklines(tickers: string[]): Promise<SparklineData> {
  if (!tickers?.length) return Promise.resolve({});
  return apiFetch<SparklineData>(`/stocks/sparklines?tickers=${tickers.join(',')}`);
}

export function runSimulation(ticker: string, actions: SimulationAction[]): Promise<SimulationResult> {
  return postJson<SimulationResult>(`/stocks/simulate/${ticker}`, { actions });
}

export function getSimulationPresets(ticker: string): Promise<SimulationPreset[]> {
  return apiFetch<SimulationPreset[]>(`/stocks/simulation-presets/${ticker}`);
}

export function getCorrelationMatrix(opts: {
  lagDays?: number;
  windowDays?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<CorrelationMatrixData> {
  const { lagDays = 0, windowDays = 90, startDate, endDate } = opts;
  return apiFetch<CorrelationMatrixData>(`/stocks/correlation-matrix${qs({ lagDays, windowDays, startDate, endDate })}`);
}

export function getCorrelation(tickerA: string, tickerB: string, windowDays?: number, lagDays?: number): Promise<CorrelationResult> {
  return apiFetch<CorrelationResult>(`/stocks/correlate/${tickerA}/${tickerB}${qs({ windowDays, lagDays })}`);
}
