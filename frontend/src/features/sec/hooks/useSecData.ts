import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSecTickers, getSecFiles, syncSec, getSecCoverage } from '../api';

export function useSecTickers() {
  return useQuery({
    queryKey: ['sec-tickers'],
    queryFn: getSecTickers,
  });
}

export function useSecFiles(ticker: string | null) {
  return useQuery({
    queryKey: ['sec-files', ticker],
    queryFn: () => getSecFiles(ticker!),
    enabled: !!ticker,
  });
}

export function useSecCoverage(ticker: string | null) {
  return useQuery({
    queryKey: ['sec-coverage', ticker],
    queryFn: () => getSecCoverage(ticker!),
    enabled: !!ticker,
  });
}

export function useSecSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, dateFrom, dateTo }: { ticker: string; dateFrom?: string; dateTo?: string }) =>
      syncSec(ticker, dateFrom, dateTo),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sec-sessions', vars.ticker] });
      qc.invalidateQueries({ queryKey: ['sec-files', vars.ticker] });
      qc.invalidateQueries({ queryKey: ['sec-coverage', vars.ticker] });
    },
  });
}
