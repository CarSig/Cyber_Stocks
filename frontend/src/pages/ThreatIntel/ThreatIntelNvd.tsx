import { useState } from 'react';
import ThreatIntelShell from '@/components/organisms/layout/ThreatIntelShell';
import useFilterWithPageReset from '@/hooks/useFilterWithPageReset';
import NvdFilters from '@/components/molecules/threat-intel/nvd/NvdFilters';
import NvdTable from '@/components/molecules/threat-intel/nvd/NvdTable';
import { usePaginatedThreatIntel } from '@/hooks/usePaginatedThreatIntel';

export default function ThreatIntelNvd() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [company, setCompany] = useState('');

  const { page, setPage, data, isPending, error, totalPages, companiesData } = usePaginatedThreatIntel('nvd', {
    search,
    severity,
    company,
  });

  const withReset = useFilterWithPageReset(setPage);

  return (
    <ThreatIntelShell
      title="NVD — National Vulnerability Database"
      isPending={isPending}
      error={error}
      data={data}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      filters={
        <NvdFilters
          search={search}
          onSearchChange={withReset(setSearch)}
          severity={severity}
          onSeverityChange={withReset((v: string | null) => setSeverity(v ?? ''))}
          company={company}
          onCompanyChange={withReset((v: string | null) => setCompany(v ?? ''))}
          companiesData={companiesData}
          resultCount={(data as { total?: number } | undefined)?.total}
        />
      }
    >
      <NvdTable data={data} />
    </ThreatIntelShell>
  );
}
