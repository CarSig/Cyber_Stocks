import { useState } from 'react';
import ThreatIntelShell from '@/components/organisms/layout/ThreatIntelShell.jsx';
import useFilterWithPageReset from '@/hooks/useFilterWithPageReset.js';
import FilterSelect from '@/components/molecules/shared/FilterSelect.jsx';
import OtxPulseTable from '@/components/molecules/threat-intel/otx/OtxPulseTable.jsx';
import { usePaginatedThreatIntel } from '@/hooks/usePaginatedThreatIntel.js';

export default function ThreatIntelOtx() {
  const [company, setCompany] = useState('');

  const { page, setPage, data, isPending, error, totalPages, companiesData } = usePaginatedThreatIntel('otx', {
    company,
  });

  const withReset = useFilterWithPageReset(setPage);

  return (
    <ThreatIntelShell
      title="AlienVault OTX"
      isPending={isPending}
      error={error}
      data={data}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
    >
      {data?.configured === false && (
        <div className="ti-notice">
          <strong>OTX not configured.</strong> Register at{' '}
          <a href="https://otx.alienvault.com" target="_blank" rel="noreferrer" className="ti-link">
            otx.alienvault.com
          </a>{' '}
          (free), then add <code>OTX_API_KEY=your_key</code> to <code>backend/.env</code> and restart.
        </div>
      )}

      {data?.configured && (
        <>
          <div className="ti-filters">
            <FilterSelect
              value={company}
              onChange={withReset(setCompany)}
              placeholder="Companies"
              options={Object.keys(companiesData ?? {})}
            />
            {data && <span className="ti-count">{data.total} results</span>}
          </div>
          {data.items.length === 0 && !isPending && (
            <p className="ti-empty">No pulses yet — sync runs daily at 06:00 UTC.</p>
          )}
          <OtxPulseTable data={data} />
        </>
      )}
    </ThreatIntelShell>
  );
}
