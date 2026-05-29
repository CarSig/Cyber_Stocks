import { apiFetch, qs } from './core';
import type { PaginatedAudit } from '@algo/shared';

type AuditLogOpts = {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
};

export function runMigrations(): Promise<{ ok: boolean; at: string }> {
  return apiFetch<{ ok: boolean; at: string }>('/admin/run-migrations', { method: 'POST' });
}

export function triggerJob(job: string): Promise<{ triggered: string; at: string }> {
  return apiFetch<{ triggered: string; at: string }>(`/admin/trigger/${job}`, { method: 'POST' });
}

export function invalidateTickerCache(ticker: string): Promise<{ invalidated: string; at: string }> {
  return apiFetch<{ invalidated: string; at: string }>(`/admin/cache/invalidate/${ticker}`, { method: 'POST' });
}

export function getAuditLog(opts: AuditLogOpts = {}): Promise<PaginatedAudit> {
  const { limit = 100, offset = 0, userId, action } = opts;
  return apiFetch<PaginatedAudit>(`/admin/audit${qs({ limit, offset, userId, action })}`);
}

// ── DOM Feedback ──────────────────────────────────────────────────────────────

export type FeedbackStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'failed';

export type FeedbackEntry = {
  id: string;
  message: string;
  tag_name: string;
  element_id: string;
  classes: string[];
  css_selector: string;
  dom_path: string[];
  inner_text: string;
  page_url: string;
  bounding_rect: { top: number; left: number; width: number; height: number };
  submitted_by: string;
  status: FeedbackStatus;
  dev_comment: string | null;
  ai_comment: string | null;
  created_at: string;
  updated_at: string;
};

type FeedbackListOpts = {
  limit?: number;
  offset?: number;
  status?: FeedbackStatus | '';
};

export function getFeedbackList(opts: FeedbackListOpts = {}): Promise<{ total: number; entries: FeedbackEntry[] }> {
  const { limit = 50, offset = 0, status } = opts;
  return apiFetch(`/inspect-dom-capture/feedback${qs({ limit, offset, status: status || undefined })}`);
}

export function reviewFeedback(id: string, status: FeedbackStatus, dev_comment?: string): Promise<FeedbackEntry> {
  return apiFetch(`/inspect-dom-capture/feedback/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, dev_comment }),
  });
}
