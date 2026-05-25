import React from 'react';
import { Input } from '@/components/ui/input';
import FilterSelect from '@/components/common/filters/FilterSelect';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

type NvdFiltersProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  severity?: string;
  onSeverityChange?: (value: string | null) => void;
  company?: string;
  onCompanyChange?: (value: string | null) => void;
  companiesData?: Record<string, unknown>;
  resultCount?: number;
};

export default function NvdFilters({
  search,
  onSearchChange,
  severity,
  onSeverityChange,
  company,
  onCompanyChange,
  companiesData,
  resultCount,
}: NvdFiltersProps) {
  return (
    <>
      <FilterSelect
        value={company}
        onChange={onCompanyChange}
        placeholder="Companies"
        options={Object.keys(companiesData ?? {})}
      />
      <Input
        className="ti-search"
        placeholder="Search CVE ID or description…"
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange?.(e.target.value)}
      />
      <FilterSelect value={severity} onChange={onSeverityChange} placeholder="Severity" options={SEVERITIES} />
      {resultCount !== undefined && <span className="ti-count">{resultCount} results</span>}
    </>
  );
}
