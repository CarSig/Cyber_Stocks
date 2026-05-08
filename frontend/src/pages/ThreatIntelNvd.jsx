import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getThreatIntelList, getCompanies } from "../api.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 50;
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEVERITY_COLORS = {
  CRITICAL: "var(--color-red)",
  HIGH: "var(--color-amber)",
  MEDIUM: "#f59e0b",
  LOW: "var(--color-blue-toggle)",
};

export default function ThreatIntelNvd() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [company, setCompany] = useState("");

  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: getCompanies });

  const { data, isPending, error } = useQuery({
    queryKey: ["nvd", page, search, severity, company],
    queryFn: () => getThreatIntelList("nvd", { limit: PAGE_SIZE, offset: page * PAGE_SIZE, search, severity, company }),
    keepPreviousData: true,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/threat-intel" className="ti-back">← Threat Intel</Link>
        <h1>NVD — National Vulnerability Database</h1>
        {data?.syncedAt && <span className="ti-synced">Synced {new Date(data.syncedAt).toLocaleString()}</span>}
      </div>

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
        <Input
          className="ti-search"
          placeholder="Search CVE ID or description…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All severities</SelectItem>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {data && <span className="ti-count">{data.total} results</span>}
      </div>

      {isPending && <p className="ti-loading">Loading…</p>}
      {error && <p className="ti-error">{error.message}</p>}

      {data && (
        <>
          <div className="ti-table-wrap">
            <table className="ti-table">
              <thead>
                <tr>
                  <th>CVE ID</th>
                  <th>Severity</th>
                  <th>Score</th>
                  <th>Description</th>
                  <th>Published</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <tr key={v.id}>
                    <td><a href={`https://nvd.nist.gov/vuln/detail/${v.id}`} target="_blank" rel="noreferrer" className="ti-link">{v.id}</a></td>
                    <td>
                      <span className="ti-severity" style={{ color: SEVERITY_COLORS[v.severity] ?? "var(--text-muted)" }}>
                        {v.severity}
                      </span>
                    </td>
                    <td className="ti-score">{v.score ?? "—"}</td>
                    <td className="ti-desc">{v.description}</td>
                    <td className="ti-date">{v.published ? new Date(v.published).toLocaleDateString() : "—"}</td>
                    <td className="ti-muted">{v.status}</td>
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
