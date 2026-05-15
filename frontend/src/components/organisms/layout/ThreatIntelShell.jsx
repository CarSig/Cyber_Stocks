import { Link } from 'react-router-dom';
import { formatDateTime } from '@/utils/date.js';
import Pagination from '@/components/molecules/shared/Pagination.jsx';

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
}) {
  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/threat-intel" className="ti-back">
          ← Threat Intel
        </Link>
        <h1>{title}</h1>
        {data?.syncedAt && <span className="ti-synced">Synced {formatDateTime(data.syncedAt)}</span>}
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
