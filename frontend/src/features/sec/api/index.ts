import { apiFetch, postJson } from '@/api/core';

export type SecFileListing = {
  accession: string;
  files: string[];
  date?: string;
  form?: string;
  cik?: string;
  primaryDoc?: string;
};

export type CoverageRange = { from: string; to: string };

export type CoverageIndex = {
  ticker: string;
  ranges: CoverageRange[];
};

export type SecSyncResult = {
  filesAdded: number;
  skippedFilings: number;
  coveredRanges: CoverageRange[];
  gaps: CoverageRange[];
};

export function getSecTickers(): Promise<string[]> {
  return apiFetch<string[]>('/sec/tickers');
}

export function getSecFiles(ticker: string): Promise<SecFileListing[]> {
  return apiFetch<SecFileListing[]>(`/sec/files/${ticker}`);
}

export function syncSec(ticker: string, dateFrom?: string, dateTo?: string): Promise<SecSyncResult> {
  return postJson<SecSyncResult>('/sec/sync', { ticker, dateFrom, dateTo });
}

export function getSecCoverage(ticker: string): Promise<CoverageIndex> {
  return apiFetch<CoverageIndex>(`/sec/coverage/${ticker}`);
}
