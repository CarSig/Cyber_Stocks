import { useState } from 'react';
import { Input } from '@/components/ui/input';
import FilterSelect from '@/components/molecules/shared/FilterSelect';
import ThreatIntelShell from '@/components/organisms/layout/ThreatIntelShell';
import { usePaginatedThreatIntel } from '@/hooks/usePaginatedThreatIntel';
import useFilterWithPageReset from '@/hooks/useFilterWithPageReset';
import { formatDate } from '@/utils/date';

export default function ThreatIntelKev() {
  const [search, setSearch] = useState('');
  const [ransomware, setRansomware] = useState(false);
  const [company, setCompany] = useState('');

  const { page, setPage, data, isPending, error, totalPages, companiesData } = usePaginatedThreatIntel('kev', {
    search,
    ransomware: ransomware ? 'true' : '',
    company,
  });

  const withReset = useFilterWithPageReset(setPage);

  return (
    <ThreatIntelShell
      title="CISA Known Exploited Vulnerabilities"
      isPending={isPending}
      error={error}
      data={data}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      filters={
        <>
          <FilterSelect
            value={company}
            onChange={(v) => withReset(setCompany)(v ?? '')}
            placeholder="Companies"
            options={Object.keys(companiesData ?? {})}
          />
          <Input
            className="ti-search"
            placeholder="Search CVE, vendor, product…"
            value={search}
            onChange={(e) => withReset(setSearch)(e.target.value)}
          />
          <label className="ti-checkbox">
            <input
              type="checkbox"
              checked={ransomware}
              onChange={(e) => withReset(setRansomware)(e.target.checked)}
            />
            Ransomware only
          </label>
          {data && <span className="ti-count">{(data as { total: number }).total} results</span>}
        </>
      }
    >
      <div className="ti-table-wrap">
        <table className="ti-table">
          <thead>
            <tr>
              <th>CVE ID</th>
              <th>Vendor</th>
              <th>Product</th>
              <th>Name</th>
              <th>Added</th>
              <th>Due Date</th>
              <th>Ransomware</th>
            </tr>
          </thead>
          <tbody>
            {(data as { items?: Array<Record<string, unknown>> } | undefined)?.items?.map((v) => (
              <tr key={v.cveID as string}>
                <td>
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${v.cveID}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ti-link"
                  >
                    {v.cveID as string}
                  </a>
                </td>
                <td>{v.vendorProject as string}</td>
                <td>{v.product as string}</td>
                <td className="ti-name">{v.vulnerabilityName as string}</td>
                <td className="ti-date">{formatDate(v.dateAdded as string)}</td>
                <td className="ti-date">{formatDate(v.dueDate as string)}</td>
                <td>
                  {v.knownRansomwareCampaignUse === 'Known' ? (
                    <span className="ti-badge ti-badge--danger">Known</span>
                  ) : (
                    <span className="ti-badge ti-badge--muted">Unknown</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ThreatIntelShell>
  );
}
