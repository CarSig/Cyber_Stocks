export function pearsonLag(a: number[], b: number[], lag: number): number | null {
  const n = Math.min(a.length, b.length) - Math.abs(lag);
  if (n < 5) return null;
  const sa = lag >= 0 ? a.slice(lag) : a.slice(0, a.length + lag);
  const sb = lag >= 0 ? b.slice(0, b.length - lag) : b.slice(-lag);
  const len = Math.min(sa.length, sb.length);
  const ra: number[] = [],
    rb: number[] = [];
  for (let i = 1; i < len; i++) {
    if (sa[i] > 0 && sa[i - 1] > 0) ra.push(Math.log(sa[i] / sa[i - 1]));
    if (sb[i] > 0 && sb[i - 1] > 0) rb.push(Math.log(sb[i] / sb[i - 1]));
  }
  const l = Math.min(ra.length, rb.length);
  if (l < 5) return null;
  const ma = ra.slice(0, l).reduce((s, v) => s + v, 0) / l;
  const mb = rb.slice(0, l).reduce((s, v) => s + v, 0) / l;
  let num = 0,
    va = 0,
    vb = 0;
  for (let i = 0; i < l; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    va += (ra[i] - ma) ** 2;
    vb += (rb[i] - mb) ** 2;
  }
  const denom = Math.sqrt(va * vb);
  return denom === 0 ? null : num / denom;
}

export function corrColor(v: number | null | undefined): string {
  if (v == null) return 'transparent';
  const intensity = Math.abs(v);
  return v > 0 ? `oklch(0.45 ${0.15 * intensity} 150)` : `oklch(0.45 ${0.15 * intensity} 25)`;
}

export const LAG_COLS = [1, 3, 7, 30, 60, 90];

export function fmtPct(pct: number | null | undefined): string {
  return pct != null ? pct.toFixed(2) + '%' : '—';
}
