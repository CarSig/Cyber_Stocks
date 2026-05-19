import { apiFetch, qs } from '@/api/core';
import type { ThreatIntelListResponse, ThreatIntelStatus, CorrelationResult, LagImpactResult } from '@algo/shared';

export type ThreatIntelCorrelationResponse = {
  correlation?: CorrelationResult;
  lagImpact?: LagImpactResult;
};

export type ThreatIntelListOpts = {
  limit?: number;
  offset?: number;
  search?: string;
  ransomware?: string;
  severity?: string;
  company?: string;
};

export function getStatus(): Promise<ThreatIntelStatus> {
  return apiFetch<ThreatIntelStatus>('/threat-intel/status');
}

export function getKev(opts?: ThreatIntelListOpts): Promise<ThreatIntelListResponse> {
  return getList('kev', opts);
}

export function getNvd(opts?: ThreatIntelListOpts): Promise<ThreatIntelListResponse> {
  return getList('nvd', opts);
}

export function getOtx(opts?: ThreatIntelListOpts): Promise<ThreatIntelListResponse> {
  return getList('otx', opts);
}

export function getMisp(opts?: ThreatIntelListOpts): Promise<ThreatIntelListResponse> {
  return getList('misp', opts);
}

export function getList(source: string, opts: ThreatIntelListOpts = {}): Promise<ThreatIntelListResponse> {
  const { limit = 50, offset = 0, search = '', ransomware = '', severity = '', company = '' } = opts;
  return apiFetch<ThreatIntelListResponse>(
    `/threat-intel/list/${source}${qs({ limit, offset, search, ransomware, severity, company })}`,
  );
}

export function getCorrelation(source: string, ticker: string, lagDays = 1): Promise<ThreatIntelCorrelationResponse> {
  return apiFetch<ThreatIntelCorrelationResponse>(`/threat-intel/correlate/${source}/${ticker}?lagDays=${lagDays}`);
}
