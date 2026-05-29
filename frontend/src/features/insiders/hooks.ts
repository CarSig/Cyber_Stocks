import { useQuery } from '@tanstack/react-query';
import {
  getInsiderCompanies,
  getCompanyInsiders,
  getCompanyAggregate,
  getAllInsiders,
  getLeaderboard,
  getPerson,
  getPersonAggregate,
} from './api';
export type { InsiderLeaderboardResponse } from './api';

export function useInsiderCompanies() {
  return useQuery({ queryKey: ['insider-companies'], queryFn: getInsiderCompanies });
}

export function useCompanyInsiders(ticker: string | null) {
  return useQuery({
    queryKey: ['insider-company', ticker],
    queryFn: () => getCompanyInsiders(ticker!),
    enabled: !!ticker,
  });
}

export function useCompanyAggregate(ticker: string | null) {
  return useQuery({
    queryKey: ['insider-company-agg', ticker],
    queryFn: () => getCompanyAggregate(ticker!),
    enabled: !!ticker,
  });
}

export function useAllInsiders() {
  return useQuery({ queryKey: ['insider-all'], queryFn: getAllInsiders });
}

export function useLeaderboard() {
  return useQuery({ queryKey: ['insider-leaderboard'], queryFn: getLeaderboard });
}

export function usePerson(personCik: string | null) {
  return useQuery({
    queryKey: ['insider-person', personCik],
    queryFn: () => getPerson(personCik!),
    enabled: !!personCik,
  });
}

export function usePersonAggregate(personCik: string | null) {
  return useQuery({
    queryKey: ['insider-person-agg', personCik],
    queryFn: () => getPersonAggregate(personCik!),
    enabled: !!personCik,
  });
}
