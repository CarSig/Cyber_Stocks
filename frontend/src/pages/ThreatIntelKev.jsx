import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThreatIntelShell from "../components/organisms/ThreatIntelShell.jsx";
import { usePaginatedThreatIntel } from "../hooks/usePaginatedThreatIntel.js";
import { formatDate } from "../utils/date.js";

export default function ThreatIntelKev() {
  const [search, setSearch] = useState("");
  const [ransomware, setRansomware] = useState(false);
  const [company, setCompany] = useState("");

  const { page, setPage, data, isPending, error, totalPages, companiesData } =
    usePaginatedThreatIntel("kev", { search, ransomware: ransomware ? "true" : "", company });

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
          <Select value={company} onValueChange={(v) => { setCompany(v); setPage(0); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All companies" /></SelectTrigger>
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
        </>
      }
    >
      <div className="ti-table-wrap">
        <table className="ti-table">
          <thead>
            <tr>
              <th>CVE ID</th><th>Vendor</th><th>Product</th><th>Name</th>
              <th>Added</th><th>Due Date</th><th>Ransomware</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((v) => (
              <tr key={v.cveID}>
                <td><a href={`https://nvd.nist.gov/vuln/detail/${v.cveID}`} target="_blank" rel="noreferrer" className="ti-link">{v.cveID}</a></td>
                <td>{v.vendorProject}</td>
                <td>{v.product}</td>
                <td className="ti-name">{v.vulnerabilityName}</td>
                <td className="ti-date">{formatDate(v.dateAdded)}</td>
                <td className="ti-date">{formatDate(v.dueDate)}</td>
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
    </ThreatIntelShell>
  );
}
