import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeedbackList, reviewFeedback } from '@/api/admin';
import type { FeedbackEntry, FeedbackStatus } from '@/api/admin';
import StateHandler from '@/components/common/StateHandler';
import FilterSelect from '@/components/common/FilterSelect';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import Page from '@/components/common/Page';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Implemented', value: 'implemented' },
  { label: 'Failed', value: 'failed' },
];

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  pending: 'var(--color-amber, #f59e0b)',
  approved: 'var(--color-green, #10b981)',
  rejected: 'var(--color-red, #ef4444)',
  implemented: 'var(--color-blue, #3b82f6)',
  failed: 'var(--color-red, #ef4444)',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

// ── Review modal ─────────────────────────────────────────────────────────────

type ReviewModalProps = {
  entry: FeedbackEntry;
  onClose: () => void;
};

function ReviewModal({ entry, onClose }: ReviewModalProps) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<FeedbackStatus>(entry.status);
  const [comment, setComment] = useState(entry.dev_comment ?? '');

  const mutation = useMutation({
    mutationFn: () => reviewFeedback(entry.id, status, comment || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dom-feedback'] });
      onClose();
    },
  });

  return (
    <div className="af-backdrop" onClick={onClose}>
      <div
        className="af-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Review feedback"
      >
        <div className="af-modal-header">
          <span className="af-modal-title">Review Feedback</span>
          <button className="af-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="af-modal-body">
          <div className="af-meta-box">
            <div className="af-meta-row">
              <span className="af-meta-k">Element</span>
              <span className="af-meta-v">
                &lt;{entry.tag_name}&gt; {entry.css_selector}
              </span>
            </div>
            <div className="af-meta-row">
              <span className="af-meta-k">Page</span>
              <span className="af-meta-v">{entry.page_url}</span>
            </div>
            <div className="af-meta-row">
              <span className="af-meta-k">Submitted</span>
              <span className="af-meta-v">{formatTime(entry.created_at)}</span>
            </div>
          </div>

          <div className="af-field">
            <span className="af-label">Message</span>
            <p className="af-message-text">{entry.message}</p>
          </div>

          <div className="af-field">
            <span className="af-label">Status</span>
            <div className="af-status-group">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                const color = active ? STATUS_COLORS[opt.value as FeedbackStatus] : undefined;
                return (
                  <button
                    key={opt.value}
                    className={`af-status-btn${active ? ' af-status-btn--active' : ''}`}
                    style={color ? { borderColor: color, color } : undefined}
                    onClick={() => setStatus(opt.value as FeedbackStatus)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="af-field">
            <label className="af-label" htmlFor="af-comment">
              Dev comment (optional)
            </label>
            <textarea
              id="af-comment"
              className="af-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Internal note…"
              rows={3}
            />
          </div>

          {entry.ai_comment && (
            <div className="af-field">
              <span className="af-label">AI comment</span>
              <p className="af-ai-comment">{entry.ai_comment}</p>
            </div>
          )}
        </div>

        <div className="af-modal-footer">
          {mutation.isError && <span className="af-error">Failed to save</span>}
          <div className="af-btn-group">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .af-backdrop {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center;
        }
        .af-modal {
          background: #18181b; border: 1px solid #27272a; border-radius: 12px;
          width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 48px);
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          font-family: system-ui, sans-serif;
        }
        .af-modal-header {
          padding: 14px 20px; border-bottom: 1px solid #27272a;
          display: flex; align-items: center; justify-content: space-between;
        }
        .af-modal-title { font-weight: 700; font-size: 14px; color: #f4f4f5; }
        .af-close-btn {
          background: none; border: none; color: #71717a; cursor: pointer;
          font-size: 14px; padding: 2px 6px; border-radius: 4px;
        }
        .af-close-btn:hover { color: #f4f4f5; background: #27272a; }
        .af-modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .af-meta-box { background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 4px 0; }
        .af-meta-row { display: grid; grid-template-columns: 80px 1fr; padding: 5px 12px; gap: 8px; font-size: 12px; }
        .af-meta-k { color: #71717a; }
        .af-meta-v { color: #a1a1aa; font-family: monospace; word-break: break-all; }
        .af-field { display: flex; flex-direction: column; gap: 6px; }
        .af-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a; }
        .af-message-text { margin: 0; color: #e4e4e7; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
        .af-status-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .af-status-btn {
          background: #09090b; border: 1px solid #3f3f46; color: #71717a;
          padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
          cursor: pointer; transition: border-color 0.15s, color 0.15s;
        }
        .af-status-btn--active { background: #09090b; font-weight: 700; }
        .af-textarea {
          background: #09090b; border: 1px solid #27272a; border-radius: 8px;
          color: #f4f4f5; font-size: 13px; padding: 8px 12px; resize: vertical;
          font-family: system-ui, sans-serif; outline: none;
        }
        .af-textarea:focus { border-color: #3b82f6; }
        .af-modal-footer {
          padding: 12px 20px; border-top: 1px solid #27272a;
          display: flex; align-items: center; justify-content: flex-end; gap: 8px;
        }
        .af-btn-group { display: flex; gap: 8px; }
        .af-error { color: #f87171; font-size: 12px; flex: 1; }
        .af-ai-comment {
          margin: 0; font-size: 12px; color: #3b82f6; font-style: italic;
          background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2);
          border-radius: 6px; padding: 8px 10px; line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

type RowProps = { entry: FeedbackEntry; onReview: (e: FeedbackEntry) => void; onInspect: (e: FeedbackEntry) => void };

function FeedbackRow({ entry, onReview, onInspect }: RowProps) {
  return (
    <tr>
      <td className="af-td af-td-time">{formatTime(entry.created_at)}</td>
      <td className="af-td af-td-user">{entry.submitted_by}</td>
      <td className="af-td">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="af-tag">&lt;{entry.tag_name}&gt;</span>
          <span className="af-selector">{entry.css_selector}</span>
          <button
            className="af-eye-btn"
            onClick={() => onInspect(entry)}
            title="Go to element on page"
            aria-label="Inspect element"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>
      </td>
      <td className="af-td af-td-msg">
        {entry.message.slice(0, 80)}
        {entry.message.length > 80 ? '…' : ''}
      </td>
      <td className="af-td">
        <span className="af-status-badge" style={{ color: STATUS_COLORS[entry.status] }}>
          {entry.status}
        </span>
      </td>
      <td className="af-td af-td-comment">{entry.dev_comment ?? '—'}</td>
      <td className="af-td af-td-ai-comment">
        {entry.ai_comment ? <span style={{ color: '#3b82f6', fontStyle: 'italic' }}>{entry.ai_comment}</span> : '—'}
      </td>
      <td className="af-td">
        <Button size="sm" variant="outline" onClick={() => onReview(entry)}>
          Review
        </Button>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminFeedback() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewing, setReviewing] = useState<FeedbackEntry | null>(null);

  function handleInspect(entry: FeedbackEntry) {
    const url = new URL(entry.page_url);
    const base = `${url.pathname}${url.search ? url.search + '&' : '?'}`;
    navigate(`${base}inspect=${encodeURIComponent(entry.css_selector)}`);
  }

  const { data, isPending, error } = useQuery({
    queryKey: ['dom-feedback', page, statusFilter],
    queryFn: () =>
      getFeedbackList({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, status: statusFilter as FeedbackStatus | '' }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <Page title="DOM Feedback">
      <style>{`
        .af-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .af-total { font-size: 12px; color: var(--text-faint, #71717a); }
        .af-table-wrap { overflow-x: auto; }
        .af-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .af-table th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint, #71717a);
          border-bottom: 1px solid var(--border, #27272a); }
        .af-td { padding: 10px 12px; border-bottom: 1px solid var(--border, #1e1e1e); vertical-align: top; }
        .af-td-time { white-space: nowrap; color: var(--text-faint, #71717a); font-size: 12px; }
        .af-td-user { white-space: nowrap; font-size: 12px; color: var(--text, #e4e4e7); }
        .af-tag { font-family: monospace; color: #3b82f6; font-size: 12px; margin-right: 4px; }
        .af-selector { font-family: monospace; font-size: 11px; color: var(--text-faint, #71717a); }
        .af-td-msg { max-width: 260px; color: var(--text, #e4e4e7); }
        .af-status-badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .af-td-comment { font-size: 12px; color: var(--text-faint, #71717a); max-width: 180px; }
        .af-td-ai-comment { font-size: 12px; max-width: 180px; }
        .af-eye-btn {
          background: none; border: none; color: #52525b; cursor: pointer;
          padding: 2px; border-radius: 4px; display: inline-flex; align-items: center;
          transition: color 0.15s;flex-shrink: 0;
        }
        .af-eye-btn:hover { color: #3b82f6; }
      `}</style>

      <div className="af-toolbar">
        <FilterSelect
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v ?? '');
            setPage(0);
          }}
          placeholder="All statuses"
          options={STATUS_OPTIONS}
        />
        {data && <span className="af-total">{data.total} entries</span>}
      </div>

      <StateHandler isPending={isPending} error={error}>
        <div className="af-table-wrap">
          <table className="af-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Element</th>
                <th>Message</th>
                <th>Status</th>
                <th>Dev Comment</th>
                <th>AI Comment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.entries.map((e) => (
                <FeedbackRow key={e.id} entry={e} onReview={setReviewing} onInspect={handleInspect} />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} setPage={setPage} totalPages={totalPages} />
      </StateHandler>

      {reviewing && <ReviewModal entry={reviewing} onClose={() => setReviewing(null)} />}
    </Page>
  );
}
