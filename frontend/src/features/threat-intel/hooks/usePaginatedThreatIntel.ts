import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getList } from '../api';
import { getCompanies } from '@/features/tickers/api';

export const PAGE_SIZE = 50;

type ThreatIntelFilters = {
  search?: string;
  ransomware?: string;
  severity?: string;
  company?: string;
};

export function usePaginatedThreatIntel(source: string, filters: ThreatIntelFilters) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number(searchParams.get('page') ?? 0));

  function setPage(value: number | ((prev: number) => number)): void {
    const next = typeof value === 'function' ? value(page) : value;
    setSearchParams(
      (prev) => {
        prev.set('page', String(next));
        return prev;
      },
      { replace: true },
    );
  }

  const { data: companiesData } = useQuery({ queryKey: ['companies'], queryFn: getCompanies });

  const { data, isPending, error } = useQuery({
    queryKey: [source, page, ...Object.values(filters)],
    queryFn: () => getList(source, { limit: PAGE_SIZE, offset: page * PAGE_SIZE, ...filters }),
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return { page, setPage, data, isPending, error, totalPages, companiesData };
}
