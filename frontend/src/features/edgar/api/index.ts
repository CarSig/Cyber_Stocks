import { apiFetch, postJson } from '@/api/core';
import type { FilingMetadata, FormType } from '@algo/shared';

export type { FilingMetadata, FormType };

export type SecFileListing = {
  accession: string;
  files: string[];
  meta?: FilingMetadata;
};

export type CoverageRange = { from: string; to: string };

export type CoverageIndex = {
  ticker: string;
  ranges: CoverageRange[];
};

export type SecSyncStarted = {
  started: boolean;
  running: boolean;
};

export function getSecTickers(): Promise<string[]> {
  return apiFetch<string[]>('/edgar/tickers');
}

export function getSecFiles(ticker: string): Promise<SecFileListing[]> {
  return apiFetch<SecFileListing[]>(`/edgar/files/${ticker}`);
}

export function syncSec(
  ticker: string,
  dateFrom?: string,
  dateTo?: string,
  formTypes?: FormType[],
  force?: boolean,
): Promise<SecSyncStarted> {
  return postJson<SecSyncStarted>('/edgar/sync', { ticker, dateFrom, dateTo, formTypes, force });
}

export function getSecSyncStatus(ticker: string): Promise<{ running: boolean }> {
  return apiFetch<{ running: boolean }>(`/edgar/sync/status/${ticker}`);
}

export function getSecCoverage(ticker: string): Promise<CoverageIndex> {
  return apiFetch<CoverageIndex>(`/edgar/coverage/${ticker}`);
}

export type Scan801Result = {
  accession: string;
  ticker: string;
  issuer_cik: string;
  filing_date: string;
  report_period: string | null;
  primary_document: string | null;
  items: string[] | null;
  files: string[];
  matched: boolean;
  matched_keywords: string[];
  snippet: string | null;
  ai_real_incident: boolean | null;
  ai_confidence: string | null;
  ai_incident_type: string | null;
  ai_summary: string | null;
};

export function startScan801(): Promise<SecSyncStarted> {
  return postJson<SecSyncStarted>('/edgar/scan/801', {});
}

export function getScan801Status(): Promise<{ running: boolean }> {
  return apiFetch<{ running: boolean }>('/edgar/scan/801/status');
}

export function getScan801Results(): Promise<Scan801Result[]> {
  return apiFetch<Scan801Result[]>('/edgar/scan/801/results');
}
