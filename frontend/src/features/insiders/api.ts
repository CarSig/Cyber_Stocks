import { apiFetch } from '@/api/core';
import type {
  InsiderCompanySummary,
  InsiderImpactAggregate,
  InsiderLeaderboardResponse,
  InsiderRow,
  PersonDetail,
} from '@algo/shared';

export type { InsiderCompanySummary, InsiderImpactAggregate, InsiderLeaderboardResponse, InsiderRow, PersonDetail };

export function getInsiderCompanies(): Promise<InsiderCompanySummary[]> {
  return apiFetch<InsiderCompanySummary[]>('/insiders/companies');
}

export function getCompanyInsiders(ticker: string): Promise<InsiderRow[]> {
  return apiFetch<InsiderRow[]>(`/insiders/company/${ticker}`);
}

export function getCompanyAggregate(ticker: string): Promise<InsiderImpactAggregate> {
  return apiFetch<InsiderImpactAggregate>(`/insiders/company/${ticker}/aggregate`);
}

export function getAllInsiders(): Promise<InsiderRow[]> {
  return apiFetch<InsiderRow[]>('/insiders/all');
}

export function getLeaderboard(): Promise<InsiderLeaderboardResponse> {
  return apiFetch<InsiderLeaderboardResponse>('/insiders/leaderboard');
}

export function getPerson(personCik: string): Promise<PersonDetail> {
  return apiFetch<PersonDetail>(`/insiders/person/${personCik}`);
}

export function getPersonAggregate(personCik: string): Promise<InsiderImpactAggregate> {
  return apiFetch<InsiderImpactAggregate>(`/insiders/person/${personCik}/aggregate`);
}
