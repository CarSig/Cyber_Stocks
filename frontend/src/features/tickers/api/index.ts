import { apiFetch, postJson } from '@/api/core';
import type { TickerData, SimulationAction, SimulationResult, SimulationPresets, SparklineMap } from '@algo/shared';

export function getCompanies(): Promise<Record<string, string>> {
  return apiFetch<Record<string, string>>('/stocks');
}

export function getTicker(ticker: string): Promise<TickerData> {
  return apiFetch<TickerData>(`/stocks/${ticker}`);
}

export function getSparklines(tickers: string[]): Promise<SparklineMap> {
  if (!tickers?.length) return Promise.resolve({});
  return apiFetch<SparklineMap>(`/stocks/sparklines?tickers=${tickers.join(',')}`);
}

export function runSimulation(ticker: string, actions: SimulationAction[]): Promise<SimulationResult> {
  return postJson<SimulationResult>(`/stocks/simulate/${ticker}`, { actions });
}

export function getSimulationPresets(ticker: string): Promise<SimulationPresets> {
  return apiFetch<SimulationPresets>(`/stocks/simulation-presets/${ticker}`);
}
