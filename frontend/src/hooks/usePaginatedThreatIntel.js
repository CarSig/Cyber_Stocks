import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getList } from "@/api/threat-intel.js";
import { getCompanies } from "@/api/stock.js";

const PAGE_SIZE = 50;

export function usePaginatedThreatIntel(source, filters) {
  const [page, setPage] = useState(0);

  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: getCompanies });

  const { data, isPending, error } = useQuery({
    queryKey: [source, page, ...Object.values(filters)],
    queryFn: () => getList(source, { limit: PAGE_SIZE, offset: page * PAGE_SIZE, ...filters }),
    keepPreviousData: true,
  });

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return { page, setPage, data, isPending, error, totalPages, companiesData };
}

export { PAGE_SIZE };
