import { apiFetch, qs } from './core.js';

export function triggerJob(job) {
  return apiFetch(`/admin/trigger/${job}`, { method: 'POST' });
}

export function getAuditLog({ limit = 100, offset = 0, userId, action } = {}) {
  return apiFetch(`/admin/audit${qs({ limit, offset, userId, action })}`);
}
