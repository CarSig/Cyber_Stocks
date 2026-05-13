import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThreatIntelShell from "../components/organisms/ThreatIntelShell.jsx";
import { usePaginatedThreatIntel } from "../hooks/usePaginatedThreatIntel.js";
import { formatDate } from "../utils/date.js";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SEVERITY_COLORS = {
  CRITICAL: "var(--color-red)",
  HIGH: "var(--color-amber)",
  MEDIUM: "#f59e0b",
  LOW: "var(--color-blue-toggle)",
};

export default function ThreatIntelNvd() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [company, setCompany] = useState("");

  const { page, setPage, data, isPending, error, totalPages, companiesData } =
    usePaginatedThreatIntel("nvd", { search, severity, company });

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
        <>
          <Select value={company} onValueChange={(v) => { setCompany(v); setPage(0); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All companies" /></SelectTrigger>
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
            <SelectTrigger className="w-40"><SelectValue placeholder="All severities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All severities</SelectItem>
              {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {data && <span className="ti-count">{data.total} results</span>}
        </>
      }
    >
      <div className="ti-table-wrap">
        <table className="ti-table">
          <thead>
            <tr>
              <th>CVE ID</th><th>Severity</th><th>Score</th>
              <th>Description</th><th>Published</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((v) => (
              <tr key={v.id}>
                <td><a href={`https://nvd.nist.gov/vuln/detail/${v.id}`} target="_blank" rel="noreferrer" className="ti-link">{v.id}</a></td>
                <td>
                  <span className="ti-severity" style={{ color: SEVERITY_COLORS[v.severity] ?? "var(--text-muted)" }}>
                    {v.severity}
                  </span>
                </td>
                <td className="ti-score">{v.score ?? "—"}</td>
                <td className="ti-desc">{v.description}</td>
                <td className="ti-date">{formatDate(v.published)}</td>
                <td className="ti-muted">{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ThreatIntelShell>
  );
}
