import ThreatIntelShell from '@/components/layout/ThreatIntelShell';
import MispTable from '@/features/threat-intel/components/MispTable';
import { usePaginatedThreatIntel } from '@/hooks/usePaginatedThreatIntel';

export default function ThreatIntelMisp() {
  const { page, setPage, data, isPending, error, totalPages } = usePaginatedThreatIntel('misp', {});

  type MispData = {
    configured?: boolean;
    items?: unknown[];
  };

  const mispData = data as MispData | undefined;

  return (
    <ThreatIntelShell
      title="MISP — Malware Information Sharing Platform"
      isPending={isPending}
      error={error}
      data={data}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
    >
      {mispData?.configured === false && (
        <div className="ti-notice">
          <strong>MISP not configured.</strong> MISP requires a self-hosted instance.
          <ol className="ti-notice-steps">
            <li>
              Deploy MISP via Docker:{' '}
              <a href="https://github.com/MISP/misp-docker" target="_blank" rel="noreferrer" className="ti-link">
                misp-docker
              </a>
            </li>
            <li>
              Generate an API key in MISP under <em>Administration → API Keys</em>
            </li>
            <li>
              Add to <code>backend/.env</code>:<br />
              <code>MISP_URL=http://localhost:8080</code>
              <br />
              <code>MISP_API_KEY=your_key</code>
            </li>
            <li>Restart the backend</li>
          </ol>
        </div>
      )}

      {mispData?.configured && (
        <>
          {mispData.items?.length === 0 && !isPending && (
            <p className="ti-empty">No events yet — sync runs daily at 06:00 UTC.</p>
          )}
          <MispTable data={data} />
        </>
      )}
    </ThreatIntelShell>
  );
}
