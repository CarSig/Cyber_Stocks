import { apiFetch, qs } from './core';
import type { PaginatedAudit } from '@algo/shared';

type AuditLogOpts = {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
};

export function triggerJob(job: string): Promise<{ triggered: string; at: string }> {
  return apiFetch<{ triggered: string; at: string }>(`/admin/trigger/${job}`, { method: 'POST' });
}

export function getAuditLog(opts: AuditLogOpts = {}): Promise<PaginatedAudit> {
  const { limit = 100, offset = 0, userId, action } = opts;
  return apiFetch<PaginatedAudit>(`/admin/audit${qs({ limit, offset, userId, action })}`);
}
