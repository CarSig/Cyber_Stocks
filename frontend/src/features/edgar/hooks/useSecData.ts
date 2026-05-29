import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSecTickers, getSecFiles, syncSec, getSecCoverage, getSecSyncStatus, startScan801, getScan801Status, getScan801Results } from '../api';

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

/** Polls whether a sync is in flight for the ticker, so a freshly-loaded page can re-attach to it. */
export function useSecSyncStatus(ticker: string | null) {
  return useQuery({
    queryKey: ['sec-sync-status', ticker],
    queryFn: () => getSecSyncStatus(ticker!),
    enabled: !!ticker,
    refetchInterval: (query) => (query.state.data?.running ? 3000 : false),
  });
}

import { getSecFiles as _getSecFiles } from '../api';
import type { SecFileListing } from '../api';
import type { FormType } from '../api';

/** Fetches files for every ticker in parallel. Returns a flat list tagged with ticker. */
export function useAllSecFiles(tickers: string[]): {
  data: (SecFileListing & { ticker: string })[];
  isPending: boolean;
} {
  const results = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['sec-files', t],
      queryFn: () => _getSecFiles(t),
      enabled: tickers.length > 0,
    })),
  });

  const isPending = results.some((r) => r.isPending);
  const data = results.flatMap((r, i) =>
    (r.data ?? []).map((listing) => ({ ...listing, ticker: tickers[i] })),
  );

  return { data, isPending };
}

type SyncVars = {
  ticker: string;
  dateFrom?: string;
  dateTo?: string;
  formTypes?: FormType[];
  force?: boolean;
};

export function useSecSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, dateFrom, dateTo, formTypes, force }: SyncVars) =>
      syncSec(ticker, dateFrom, dateTo, formTypes, force),
    // Sync runs async on the server; results land via the SSE progress stream.
    // Only kick the status query so polling/progress can pick it up.
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['sec-sync-status', vars.ticker] });
    },
  });
}

export function useScan801() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => startScan801(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sec-scan801-status'] });
    },
  });
}

export function useScan801Status() {
  return useQuery({
    queryKey: ['sec-scan801-status'],
    queryFn: getScan801Status,
    refetchInterval: (query) => (query.state.data?.running ? 3000 : false),
  });
}

export function useScan801Results() {
  return useQuery({
    queryKey: ['sec-scan801-results'],
    queryFn: getScan801Results,
  });
}
