export function fmtCompact(n) {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export function fmtVol(n) {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function fmtPct(n) {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(2)}%`;
}

export function changePctOverBars(sorted, bars) {
  if (sorted.length < 2) return null;
  const latest = sorted.at(-1);
  const past = sorted.at(-(bars + 1)) ?? sorted[0];
  if (latest === past) return null;
  const a = past.adjclose ?? past.close;
  const b = latest.adjclose ?? latest.close;
  if (!a) return null;
  return (b - a) / a;
}

export function pearsonLag(a, b, lag) {
  const n = Math.min(a.length, b.length) - Math.abs(lag);
  if (n < 5) return null;
  const sa = lag >= 0 ? a.slice(lag) : a.slice(0, a.length + lag);
  const sb = lag >= 0 ? b.slice(0, b.length - lag) : b.slice(-lag);
  const len = Math.min(sa.length, sb.length);
  const ra = [], rb = [];
  for (let i = 1; i < len; i++) {
    if (sa[i] > 0 && sa[i - 1] > 0) ra.push(Math.log(sa[i] / sa[i - 1]));
    if (sb[i] > 0 && sb[i - 1] > 0) rb.push(Math.log(sb[i] / sb[i - 1]));
  }
  const l = Math.min(ra.length, rb.length);
  if (l < 5) return null;
  const ma = ra.slice(0, l).reduce((s, v) => s + v, 0) / l;
  const mb = rb.slice(0, l).reduce((s, v) => s + v, 0) / l;
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < l; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    va += (ra[i] - ma) ** 2;
    vb += (rb[i] - mb) ** 2;
  }
  const denom = Math.sqrt(va * vb);
  return denom === 0 ? null : num / denom;
}

export function corrColor(v) {
  if (v == null) return "transparent";
  const intensity = Math.abs(v);
  return v > 0 ? `oklch(0.45 ${0.15 * intensity} 150)` : `oklch(0.45 ${0.15 * intensity} 25)`;
}

export const LAG_COLS = [1, 3, 7, 30, 60, 90];
