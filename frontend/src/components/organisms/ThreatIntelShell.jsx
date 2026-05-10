import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "../../utils/date.js";

export default function ThreatIntelShell({ title, isPending, error, data, page, setPage, totalPages, filters, children }) {
  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/threat-intel" className="ti-back">← Threat Intel</Link>
        <h1>{title}</h1>
        {data?.syncedAt && <span className="ti-synced">Synced {formatDateTime(data.syncedAt)}</span>}
      </div>

      {filters && <div className="ti-filters">{filters}</div>}

      {isPending && <p className="ti-loading">Loading…</p>}
      {error && <p className="ti-error">{error.message}</p>}

      {data && (
        <>
          {children}

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
