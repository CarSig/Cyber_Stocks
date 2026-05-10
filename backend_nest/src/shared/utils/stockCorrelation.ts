import pcorrtest from "@stdlib/stats-pcorrtest";
import type { Quote } from "../../types/index";

type StockCorrelateOptions = {
  field?: string;
  windowDays?: number | null;
  rollingWindow?: number;
  alpha?: number;
}

function quotesToMap(quotes: Quote[], field = "adjclose"): Map<string, number> {
  const map = new Map<string, number>();
  for (const q of quotes) {
    const qr = q as unknown as Record<string, unknown>;
    if (!q.date || qr[field] == null) continue;
    const day = (typeof q.date === "string" ? q.date : (q.date as Date).toISOString()).slice(0, 10);
    map.set(day, parseFloat(String(qr[field])));
  }
  return map;
}

function overlappingDates(mapA: Map<string, number>, mapB: Map<string, number>, windowDays: number | null = null): string[] {
  let dates = [...mapA.keys()].filter((d) => mapB.has(d)).sort();
  if (windowDays && dates.length > 0) {
    const latest = new Date(dates[dates.length - 1]);
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - windowDays);
    dates = dates.filter((d) => new Date(d) >= cutoff);
  }
  return dates;
}

function rollingCorrelation(x: number[], y: number[], dates: string[] | null = null, window = 30) {
  if (x.length !== y.length) throw new Error("Arrays must be equal length");
  const results: { index: number; date: string | null; r: number; pValue: number }[] = [];
  for (let i = window - 1; i < x.length; i++) {
    const xw = x.slice(i - window + 1, i + 1);
    const yw = y.slice(i - window + 1, i + 1);
    const out = pcorrtest(xw, yw);
    results.push({ index: i, date: dates ? dates[i] : null, r: out.pcorr as number, pValue: out.pValue as number });
  }
  return results;
}

export function correlate(quotesA: Quote[], quotesB: Quote[], options: StockCorrelateOptions = {}) {
  const { field = "adjclose", windowDays = null, rollingWindow = 30, alpha = 0.05 } = options;
  const mapA = quotesToMap(quotesA, field);
  const mapB = quotesToMap(quotesB, field);
  const dates = overlappingDates(mapA, mapB, windowDays);

  if (dates.length < 4) {
    throw new Error(`Only ${dates.length} overlapping dates found. Need at least 4 to run pcorrtest.`);
  }

  const pricesA = dates.map((d) => mapA.get(d)!);
  const pricesB = dates.map((d) => mapB.get(d)!);
  const test = pcorrtest(pricesA, pricesB, { alpha });
  const normalizedA = pricesA.map((v) => (v / pricesA[0] - 1) * 100);
  const normalizedB = pricesB.map((v) => (v / pricesB[0] - 1) * 100);
  const rolling = dates.length >= rollingWindow ? rollingCorrelation(pricesA, pricesB, dates, rollingWindow) : [];

  const r = test.pcorr as number;
  const p = test.pValue as number;
  const strength = Math.abs(r);
  const direction = r >= 0 ? "positive" : "negative";
  const pStr = p < 0.001 ? "< 0.001" : `= ${p.toFixed(3)}`;
  let interpretation: string;
  if (!(test.rejected as boolean)) {
    interpretation = `No statistically significant correlation (r = ${r.toFixed(3)}, p ${pStr}). Result may be due to chance.`;
  } else if (strength > 0.7) {
    interpretation = `Strong ${direction} correlation (r = ${r.toFixed(3)}, p ${pStr}). The two stocks move ${r > 0 ? "together" : "inversely"} with high consistency.`;
  } else if (strength > 0.4) {
    interpretation = `Moderate ${direction} correlation (r = ${r.toFixed(3)}, p ${pStr}). Meaningful but noisy relationship.`;
  } else {
    interpretation = `Weak ${direction} correlation (r = ${r.toFixed(3)}, p ${pStr}). Statistically detectable but practically small.`;
  }

  return {
    r, pValue: p,
    significant: test.rejected as boolean,
    ci: test.ci as [number, number],
    statistic: test.statistic as number,
    alpha: test.alpha as number,
    rejected: test.rejected as boolean,
    summary: (test.print as () => string)(),
    n: dates.length, dates, pricesA, pricesB, normalizedA, normalizedB, rolling, interpretation,
  };
}

export { rollingCorrelation, quotesToMap, overlappingDates };
