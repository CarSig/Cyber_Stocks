import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import StateHandler from '@/components/organisms/shared/StateHandler.jsx';
import { getAuditLog } from '@/api/admin.js';
import FilterSelect from '@/components/molecules/shared/FilterSelect.jsx';
import Pagination from '@/components/molecules/shared/Pagination.jsx';
import Page from '@/components/atoms/Page.jsx';

const ACTION_LABELS = {
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

const ACTION_COLORS = {
  login: 'var(--color-green)',
  register: 'var(--color-blue-toggle)',
  google_auth: 'var(--color-blue-toggle)',
  simulate: 'var(--color-amber)',
  research: 'var(--accent)',
  chat: 'var(--accent)',
};

const PAGE_SIZE = 50;

function formatMeta(meta) {
  if (!meta || !Object.keys(meta).length) return '—';
  return Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

function formatTime(iso) {
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

function AuditTableRow({ entry }) {
  return (
    <tr key={entry.id}>
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

export default function AdminAudit() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isPending, error } = useQuery({
    queryKey: ['audit', page, actionFilter],
    queryFn: () =>
      getAuditLog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const handleActionFilter = (v) => {
    setActionFilter(v);
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
              {data.entries.map((e) => (
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
