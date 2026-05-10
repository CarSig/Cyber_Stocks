import ThreatIntelShell from "../components/organisms/ThreatIntelShell.jsx";
import { usePaginatedThreatIntel } from "../hooks/usePaginatedThreatIntel.js";

const THREAT_LEVELS = { 1: "High", 2: "Medium", 3: "Low", 4: "Undefined" };
const THREAT_COLORS = { 1: "var(--color-red)", 2: "var(--color-amber)", 3: "var(--color-blue-toggle)", 4: "var(--text-muted)" };

export default function ThreatIntelMisp() {
  const { page, setPage, data, isPending, error, totalPages } =
    usePaginatedThreatIntel("misp", {});

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
      {data?.configured === false && (
        <div className="ti-notice">
          <strong>MISP not configured.</strong> MISP requires a self-hosted instance.
          <ol className="ti-notice-steps">
            <li>Deploy MISP via Docker: <a href="https://github.com/MISP/misp-docker" target="_blank" rel="noreferrer" className="ti-link">misp-docker</a></li>
            <li>Generate an API key in MISP under <em>Administration → API Keys</em></li>
            <li>Add to <code>backend/.env</code>:<br /><code>MISP_URL=http://localhost:8080</code><br /><code>MISP_API_KEY=your_key</code></li>
            <li>Restart the backend</li>
          </ol>
        </div>
      )}

      {data?.configured && (
        <>
          {data.items.length === 0 && !isPending && <p className="ti-empty">No events yet — sync runs daily at 06:00 UTC.</p>}
          <div className="ti-table-wrap">
            <table className="ti-table">
              <thead>
                <tr>
                  <th>Event</th><th>Org</th><th>Threat Level</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const e = item.Event ?? item;
                  const level = e.threat_level_id;
                  return (
                    <tr key={e.uuid ?? e.id}>
                      <td className="ti-name">{e.info}</td>
                      <td>{e.Orgc?.name ?? e.Org?.name ?? "—"}</td>
                      <td>
                        <span style={{ color: THREAT_COLORS[level] ?? "var(--text-muted)" }}>
                          {THREAT_LEVELS[level] ?? "—"}
                        </span>
                      </td>
                      <td className="ti-date">{e.date ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ThreatIntelShell>
  );
}
