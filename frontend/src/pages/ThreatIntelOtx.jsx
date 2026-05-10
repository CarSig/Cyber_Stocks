import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThreatIntelShell from "../components/organisms/ThreatIntelShell.jsx";
import { usePaginatedThreatIntel } from "../hooks/usePaginatedThreatIntel.js";
import { formatDate } from "../utils/date.js";

export default function ThreatIntelOtx() {
  const [company, setCompany] = useState("");

  const { page, setPage, data, isPending, error, totalPages, companiesData } =
    usePaginatedThreatIntel("otx", { company });

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
          <strong>OTX not configured.</strong> Register at{" "}
          <a href="https://otx.alienvault.com" target="_blank" rel="noreferrer" className="ti-link">otx.alienvault.com</a>
          {" "}(free), then add <code>OTX_API_KEY=your_key</code> to <code>backend/.env</code> and restart.
        </div>
      )}

      {data?.configured && (
        <>
          <div className="ti-filters">
            <Select value={company} onValueChange={(v) => { setCompany(v); setPage(0); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All companies" /></SelectTrigger>
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
                  <th>Pulse</th><th>Tags</th><th>Indicators</th><th>TLP</th><th>Created</th>
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
                    <td className="ti-date">{formatDate(p.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ThreatIntelShell>
  );
}
