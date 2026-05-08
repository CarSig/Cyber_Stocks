import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getThreatIntelList, getCompanies } from "../api.js";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 50;

export default function ThreatIntelOtx() {
  const [page, setPage] = useState(0);
  const [company, setCompany] = useState("");

  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: getCompanies });

  const { data, isPending, error } = useQuery({
    queryKey: ["otx", page, company],
    queryFn: () => getThreatIntelList("otx", { limit: PAGE_SIZE, offset: page * PAGE_SIZE, company }),
    keepPreviousData: true,
  });

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/threat-intel" className="ti-back">← Threat Intel</Link>
        <h1>AlienVault OTX</h1>
        {data?.syncedAt && <span className="ti-synced">Synced {new Date(data.syncedAt).toLocaleString()}</span>}
      </div>

      {isPending && <p className="ti-loading">Loading…</p>}
      {error && <p className="ti-error">{error.message}</p>}

      {data?.configured === false && (
        <div className="ti-notice">
          <strong>OTX not configured.</strong> Register at{" "}
          <a href="https://otx.alienvault.com" target="_blank" rel="noreferrer" className="ti-link">otx.alienvault.com</a>
          {" "}(free), then add <code>OTX_API_KEY=your_key</code> to <code>backend/.env</code> and restart.
        </div>
      )}

      {data?.configured && (
        <>
          <div className="ti-filters">
            <Select value={company} onValueChange={(v) => { setCompany(v); setPage(0); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All companies</SelectItem>
                {Object.keys(companiesData ?? {}).map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            {data && <span className="ti-count">{data.total} results</span>}
          </div>
          {data.items.length === 0 && !isPending && <p className="ti-empty">No pulses yet — sync runs daily at 06:00 UTC.</p>}
          <div className="ti-table-wrap">
            <table className="ti-table">
              <thead>
                <tr>
                  <th>Pulse</th>
                  <th>Tags</th>
                  <th>Indicators</th>
                  <th>TLP</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <a href={`https://otx.alienvault.com/pulse/${p.id}`} target="_blank" rel="noreferrer" className="ti-link ti-pulse-name">
                        {p.name}
                      </a>
                    </td>
                    <td>
                      <div className="ti-tags">
                        {(p.tags ?? []).slice(0, 4).map((t) => <span key={t} className="ti-tag">{t}</span>)}
                      </div>
                    </td>
                    <td>{p.indicators_count ?? 0}</td>
                    <td><span className={`ti-badge ti-badge--tlp-${p.tlp ?? "white"}`}>{p.tlp ?? "white"}</span></td>
                    <td className="ti-date">{p.created ? new Date(p.created).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
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
