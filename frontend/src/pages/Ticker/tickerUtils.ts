export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export function fmtVol(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(2)}%`;
}

type QuoteEntry = { date: string; close: number; adjclose?: number };

export function changePctOverBars(sorted: QuoteEntry[], bars: number): number | null {
  if (sorted.length < 2) return null;
  const latest = sorted.at(-1);
  const past = sorted.at(-(bars + 1)) ?? sorted[0];
  if (latest === past || !latest || !past) return null;
  const a = past.adjclose ?? past.close;
  const b = latest.adjclose ?? latest.close;
  if (!a) return null;
  return (b - a) / a;
}
