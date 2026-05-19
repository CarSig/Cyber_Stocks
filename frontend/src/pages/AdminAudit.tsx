import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import StateHandler from '@/components/common/StateHandler';
import { getAuditLog } from '@/api/admin';
import FilterSelect from '@/components/common/FilterSelect';
import Pagination from '@/components/common/Pagination';
import Page from '@/components/common/Page';
import type { AuditEntry as AuditLogEntry } from '@algo/shared';

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  register: 'Register',
  google_auth: 'Google Auth',
  view_ticker: 'View Ticker',
  correlate: 'Correlate',
  simulate: 'Simulate',
  research: 'Research',
  chat: 'Chat',
  trump_correlation: 'Trump Correlation',
  trump_weekly_impact: 'Trump Weekly Impact',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'var(--color-green)',
  register: 'var(--color-blue-toggle)',
  google_auth: 'var(--color-blue-toggle)',
  simulate: 'var(--color-amber)',
  research: 'var(--accent)',
  chat: 'var(--accent)',
};

const PAGE_SIZE = 50;

function formatMeta(meta: Record<string, unknown> | null | undefined): string {
  if (!meta || !Object.keys(meta).length) return '—';
  return Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

function AuditTableHead() {
  return (
    <thead>
      <tr>
        <th>Time</th>
        <th>User</th>
        <th>Role</th>
        <th>Action</th>
        <th>Details</th>
      </tr>
    </thead>
  );
}

type AuditEntry = AuditLogEntry & {
  username?: string;
  role?: string;
  meta?: Record<string, unknown>;
};

type AuditTableRowProps = {
  entry: AuditEntry;
};

function AuditTableRow({ entry }: AuditTableRowProps) {
  return (
    <tr>
      <td className="audit-time">{formatTime(entry.timestamp)}</td>
      <td className="audit-user">{entry.username}</td>
      <td>{entry.role === 'admin' && <span className="navbar-role">admin</span>}</td>
      <td>
        <span className="audit-action" style={{ color: ACTION_COLORS[entry.action] ?? 'var(--text-faint)' }}>
          {ACTION_LABELS[entry.action] ?? entry.action}
        </span>
      </td>
      <td className="audit-meta">{formatMeta(entry.meta)}</td>
    </tr>
  );
}

type AuditData = {
  total: number;
  entries: AuditEntry[];
};

export default function AdminAudit() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isPending, error } = useQuery<AuditData>({
    queryKey: ['audit', page, actionFilter],
    queryFn: () =>
      getAuditLog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const handleActionFilter = (v: string | null) => {
    setActionFilter(v ?? '');
    setPage(0);
  };

  return (
    <Page title="Audit Log">
      <FilterSelect
        value={actionFilter}
        onChange={handleActionFilter}
        placeholder="Actions"
        options={Object.entries(ACTION_LABELS).map(([val, label]) => ({ label, value: val }))}
      />
      {data && <span className="audit-total">{data.total} entries</span>}

      <StateHandler isPending={isPending} error={error}>
        <div className="audit-table-wrap">
          <table className="audit-table">
            <AuditTableHead />
            <tbody>
              {data?.entries.map((e) => (
                <AuditTableRow key={e.id} entry={e} />
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} setPage={setPage} totalPages={totalPages} />
      </StateHandler>
    </Page>
  );
}
