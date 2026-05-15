import { apiFetch, qs } from './core.js';

export function getStatus() {
  return apiFetch('/threat-intel/status');
}

export function getKev(opts) {
  return getList('kev', opts);
}
export function getNvd(opts) {
  return getList('nvd', opts);
}
export function getOtx(opts) {
  return getList('otx', opts);
}
export function getMisp(opts) {
  return getList('misp', opts);
}

export function getList(
  source,
  { limit = 50, offset = 0, search = '', ransomware = '', severity = '', company = '' } = {},
) {
  return apiFetch(`/threat-intel/list/${source}${qs({ limit, offset, search, ransomware, severity, company })}`);
}

export function getCorrelation(source, ticker, lagDays = 1) {
  return apiFetch(`/threat-intel/correlate/${source}/${ticker}?lagDays=${lagDays}`);
}
