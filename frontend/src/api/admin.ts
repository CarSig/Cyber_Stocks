import { apiFetch, qs } from './core';
import type { AuditLogEntry } from '@/types';

type AuditLogResponse = {
  entries: AuditLogEntry[];
  total: number;
};

type AuditLogOpts = {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
};

export function triggerJob(job: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/admin/trigger/${job}`, { method: 'POST' });
}

export function getAuditLog(opts: AuditLogOpts = {}): Promise<AuditLogResponse> {
  const { limit = 100, offset = 0, userId, action } = opts;
  return apiFetch<AuditLogResponse>(`/admin/audit${qs({ limit, offset, userId, action })}`);
}
