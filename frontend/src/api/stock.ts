import { apiFetch, postJson, qs } from './core';
import type {
  TickerData,
  CorrelationResult,
  SimulationAction,
  SimulationResult,
  SimulationPresets,
  SparklineMap,
  CorrelationMatrixData,
} from '@algo/shared';

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

export function getCorrelationMatrix(
  opts: {
    lagDays?: number;
    windowDays?: number;
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<CorrelationMatrixData> {
  const { lagDays = 0, windowDays = 90, startDate, endDate } = opts;
  return apiFetch<CorrelationMatrixData>(
    `/stocks/correlation-matrix${qs({ lagDays, windowDays, startDate, endDate })}`,
  );
}

export function getCorrelation(
  tickerA: string,
  tickerB: string,
  windowDays?: number,
  lagDays?: number,
): Promise<CorrelationResult> {
  return apiFetch<CorrelationResult>(`/stocks/correlate/${tickerA}/${tickerB}${qs({ windowDays, lagDays })}`);
}
