import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getThreatIntelList } from "../api.js";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

const THREAT_LEVELS = { 1: "High", 2: "Medium", 3: "Low", 4: "Undefined" };
const THREAT_COLORS = { 1: "var(--color-red)", 2: "var(--color-amber)", 3: "var(--color-blue-toggle)", 4: "var(--text-muted)" };

export default function ThreatIntelMisp() {
  const [page, setPage] = useState(0);

  const { data, isPending, error } = useQuery({
    queryKey: ["misp", page],
    queryFn: () => getThreatIntelList("misp", { limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    keepPreviousData: true,
  });

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/threat-intel" className="ti-back">← Threat Intel</Link>
        <h1>MISP — Malware Information Sharing Platform</h1>
        {data?.syncedAt && <span className="ti-synced">Synced {new Date(data.syncedAt).toLocaleString()}</span>}
      </div>

      {isPending && <p className="ti-loading">Loading…</p>}
      {error && <p className="ti-error">{error.message}</p>}

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
                  <th>Event</th>
                  <th>Org</th>
                  <th>Threat Level</th>
                  <th>Date</th>
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

          {totalPages > 1 && (
            <div className="ti-pagination">
              <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
              <span className="ti-page-info">Page {page + 1} of {totalPages}</span>
              <Button variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
