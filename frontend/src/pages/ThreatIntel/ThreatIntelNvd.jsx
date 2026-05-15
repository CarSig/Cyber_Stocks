import { useState } from 'react';
import ThreatIntelShell from '@/components/organisms/layout/ThreatIntelShell.jsx';
import useFilterWithPageReset from '@/hooks/useFilterWithPageReset.js';
import NvdFilters from '@/components/molecules/threat-intel/nvd/NvdFilters.jsx';
import NvdTable from '@/components/molecules/threat-intel/nvd/NvdTable.jsx';
import { usePaginatedThreatIntel } from '@/hooks/usePaginatedThreatIntel.js';

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
          onSeverityChange={withReset(setSeverity)}
          company={company}
          onCompanyChange={withReset(setCompany)}
          companiesData={companiesData}
          resultCount={data?.total}
        />
      }
    >
      <NvdTable data={data} />
    </ThreatIntelShell>
  );
}
