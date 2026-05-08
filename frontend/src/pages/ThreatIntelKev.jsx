import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getThreatIntelList, getCompanies } from "../api.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 50;

function shortDate(iso) {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

export default function ThreatIntelKev() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [ransomware, setRansomware] = useState(false);
  const [company, setCompany] = useState("");

  const { data: companiesData } = useQuery({ queryKey: ["companies"], queryFn: getCompanies });

  const { data, isPending, error } = useQuery({
    queryKey: ["kev", page, search, ransomware, company],
    queryFn: () => getThreatIntelList("kev", { limit: PAGE_SIZE, offset: page * PAGE_SIZE, search, ransomware: ransomware ? "true" : "", company }),
    keepPreviousData: true,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/threat-intel" className="ti-back">← Threat Intel</Link>
        <h1>CISA Known Exploited Vulnerabilities</h1>
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
          placeholder="Search CVE, vendor, product…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <label className="ti-checkbox">
          <input type="checkbox" checked={ransomware} onChange={(e) => { setRansomware(e.target.checked); setPage(0); }} />
          Ransomware only
        </label>
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
                  <th>Vendor</th>
                  <th>Product</th>
                  <th>Name</th>
                  <th>Added</th>
                  <th>Due Date</th>
                  <th>Ransomware</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <tr key={v.cveID}>
                    <td><a href={`https://nvd.nist.gov/vuln/detail/${v.cveID}`} target="_blank" rel="noreferrer" className="ti-link">{v.cveID}</a></td>
                    <td>{v.vendorProject}</td>
                    <td>{v.product}</td>
                    <td className="ti-name">{v.vulnerabilityName}</td>
                    <td className="ti-date">{shortDate(v.dateAdded)}</td>
                    <td className="ti-date">{shortDate(v.dueDate)}</td>
                    <td>
                      {v.knownRansomwareCampaignUse === "Known"
                        ? <span className="ti-badge ti-badge--danger">Known</span>
                        : <span className="ti-badge ti-badge--muted">Unknown</span>}
                    </td>
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
