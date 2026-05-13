import { Input } from "@/components/ui/input";
import FilterSelect from "@/components/molecules/shared/FilterSelect.jsx";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function NvdFilters({ search, onSearchChange, severity, onSeverityChange, company, onCompanyChange, companiesData, resultCount }) {
  return (
    <>
      <FilterSelect value={company} onChange={onCompanyChange} placeholder="Companies" options={Object.keys(companiesData ?? {})} />
      <Input
        className="ti-search"
        placeholder="Search CVE ID or description…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <FilterSelect value={severity} onChange={onSeverityChange} placeholder="Severity" options={SEVERITIES} />
      {resultCount !== undefined && <span className="ti-count">{resultCount} results</span>}
    </>
  );
}
