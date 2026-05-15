import { useState } from 'react';
import ThreatIntelShell from '@/components/organisms/layout/ThreatIntelShell';
import useFilterWithPageReset from '@/hooks/useFilterWithPageReset';
import FilterSelect from '@/components/molecules/shared/FilterSelect';
import OtxPulseTable from '@/components/molecules/threat-intel/otx/OtxPulseTable';
import { usePaginatedThreatIntel } from '@/hooks/usePaginatedThreatIntel';

export default function ThreatIntelOtx() {
  const [company, setCompany] = useState('');

  const { page, setPage, data, isPending, error, totalPages, companiesData } = usePaginatedThreatIntel('otx', {
    company,
  });

  const withReset = useFilterWithPageReset(setPage);

  type OtxData = {
    configured?: boolean;
    total?: number;
    items?: unknown[];
  };

  const otxData = data as OtxData | undefined;

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
      {otxData?.configured === false && (
        <div className="ti-notice">
          <strong>OTX not configured.</strong> Register at{' '}
          <a href="https://otx.alienvault.com" target="_blank" rel="noreferrer" className="ti-link">
            otx.alienvault.com
          </a>{' '}
          (free), then add <code>OTX_API_KEY=your_key</code> to <code>backend/.env</code> and restart.
        </div>
      )}

      {otxData?.configured && (
        <>
          <div className="ti-filters">
            <FilterSelect
              value={company}
              onChange={(v) => withReset(setCompany)(v ?? '')}
              placeholder="Companies"
              options={Object.keys(companiesData ?? {})}
            />
            {otxData && <span className="ti-count">{otxData.total} results</span>}
          </div>
          {otxData.items?.length === 0 && !isPending && (
            <p className="ti-empty">No pulses yet — sync runs daily at 06:00 UTC.</p>
          )}
          <OtxPulseTable data={data} />
        </>
      )}
    </ThreatIntelShell>
  );
}
