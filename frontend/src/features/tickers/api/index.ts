import { apiFetch, postJson, BASE } from '@/api/core';
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

export function streamResearch(
  ticker: string,
  onSection: (section: string) => void,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): () => void {
  const token = localStorage.getItem('auth_token') ?? '';
  const es = new EventSource(`${BASE}/research/${ticker}?token=${encodeURIComponent(token)}`);
  es.onmessage = (e: MessageEvent<string>) => {
    const msg = JSON.parse(e.data) as {
      section?: string;
      text?: string;
      sectionDone?: boolean;
      done?: boolean;
      error?: string;
    };
    if (msg.section) onSection(msg.section);
    else if (msg.text) onText(msg.text);
    else if (msg.sectionDone) onText('\n\n');
    else if (msg.done) {
      onDone();
      es.close();
    } else if (msg.error) {
      onError(msg.error);
      es.close();
    }
  };
  es.onerror = () => {
    onError('Connection error');
    es.close();
  };
  return () => es.close();
}
