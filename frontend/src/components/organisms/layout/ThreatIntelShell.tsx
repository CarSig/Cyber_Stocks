import React from 'react';
import { Link } from 'react-router-dom';
import { DateUtils } from '@/utils/date';
import Pagination from '@/components/molecules/shared/Pagination';
import type { ThreatIntelListResponse } from '@/types';

type ThreatIntelShellProps = {
  title: string;
  isPending: boolean;
  error: Error | null;
  data: ThreatIntelListResponse | undefined;
  page: number;
  setPage: (value: number | ((prev: number) => number)) => void;
  totalPages: number;
  filters?: React.ReactNode;
  children: React.ReactNode;
};

export default function ThreatIntelShell({
  title,
  isPending,
  error,
  data,
  page,
  setPage,
  totalPages,
  filters,
  children,
}: ThreatIntelShellProps) {
  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/threat-intel" className="ti-back">
          ← Threat Intel
        </Link>
        <h1>{title}</h1>
        {data?.syncedAt && <span className="ti-synced">Synced {DateUtils.formatDateTime(data.syncedAt)}</span>}
      </div>

      {filters && <div className="ti-filters">{filters}</div>}

      {isPending && <p className="ti-loading">Loading…</p>}
      {error && <p className="ti-error">{error.message}</p>}

      {data && (
        <>
          {children}
          <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
