import pcorrtest from "@stdlib/stats-pcorrtest";
import type { Quote, LagImpactResult, LagBucket } from "../../../types/index";
import { unprocessable } from "../../errors";

export type DayValue  = { day: string; value: number }
export type DayBucket = { day: string; bucket: "positive" | "negative" | "neutral" }
export type PriceResult = { price: number; day: string }

export type Strategy = {
  readonly source: string;
  readonly lagImpactMode: "grouped" | "single";
  toDayValues(input: unknown): DayValue[];
  toLagImpactInput(input: unknown): DayBucket[] | string[];
}

export function quotesToPriceMap(quotes: Quote[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const q of quotes) {
    if (q.close != null) map.set(q.date.slice(0, 10), q.close);
  }
  return map;
}

export function nearestPrice(priceMap: Map<string, number>, fromDay: string, maxOffset = 4): PriceResult | null {
  for (let i = 0; i <= maxOffset; i++) {
    const d = new Date(fromDay);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const price = priceMap.get(key);
    if (price !== undefined) return { price, day: key };
  }
  return null;
}

type CorrelationOpts = {
  lagDays?: number;
  alpha?: number;
  source?: string;
}

export type CorrelationResult = {
  r: number;
  pValue: number;
  significant: boolean;
  ci: [number, number];
  n: number;
  lagDays: number;
  source: string;
  interpretation: string;
}

export function runCorrelation(
  dayValues: DayValue[],
  quotes: Quote[],
  { lagDays = 1, alpha = 0.05, source = "events" }: CorrelationOpts = {},
): CorrelationResult {
  const priceMap = quotesToPriceMap(quotes);
  const xs: number[] = [];
  const ys: number[] = [];

  for (const { day, value } of [...dayValues].sort((a, b) => (a.day < b.day ? -1 : 1))) {
    const targetDay = new Date(day);
    targetDay.setDate(targetDay.getDate() + lagDays);
    const base   = nearestPrice(priceMap, day);
    const lagged = nearestPrice(priceMap, targetDay.toISOString().slice(0, 10));
    if (!base || !lagged) continue;
    xs.push(value);
    ys.push(((lagged.price - base.price) / base.price) * 100);
  }

  if (xs.length < 4) {
    throw unprocessable(`Not enough overlapping data points (${xs.length}). Need at least 4.`);
  }

  const test = pcorrtest(xs, ys, { alpha });
  const r = test.pcorr as number;
  const p = test.pValue as number;
  const pStr = p < 0.001 ? "< 0.001" : `= ${p.toFixed(3)}`;
  const direction = r >= 0 ? "positive" : "negative";
  const strength = Math.abs(r);

  let interpretation: string;
  if (!(test.rejected as boolean)) {
    interpretation = `No significant correlation between ${source} events and ${lagDays}-day price change (r = ${r.toFixed(3)}, p ${pStr}).`;
  } else if (strength > 0.4) {
    interpretation = `${strength > 0.7 ? "Strong" : "Moderate"} ${direction} correlation (r = ${r.toFixed(3)}, p ${pStr}): ${source} events predict ${lagDays}-day price movement.`;
  } else {
    interpretation = `Weak ${direction} correlation (r = ${r.toFixed(3)}, p ${pStr}): statistically detectable but small effect.`;
  }

  return { r, pValue: p, significant: test.rejected as boolean, ci: test.ci as [number, number], n: xs.length, lagDays, source, interpretation };
}

type LagOpts = { windowDays?: number }

export function runLagImpactGrouped(dayBuckets: DayBucket[], quotes: Quote[], { windowDays = 7 }: LagOpts = {}): LagImpactResult {
  const priceMap = quotesToPriceMap(quotes);
  const groups: Record<string, number[]> = { positive: [], negative: [], neutral: [] };

  for (const { day, bucket } of dayBuckets) {
    const base = nearestPrice(priceMap, day);
    const target = new Date(day);
    target.setDate(target.getDate() + windowDays);
    const lagged = nearestPrice(priceMap, target.toISOString().slice(0, 10));
    if (!base || !lagged) continue;
    const changePct = ((lagged.price - base.price) / base.price) * 100;
    groups[bucket]?.push(changePct);
  }

  const avg = (arr: number[]): number | null => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  return {
    windowDays,
    positive: { n: groups.positive.length, avgChangePct: avg(groups.positive) } as LagBucket,
    negative: { n: groups.negative.length, avgChangePct: avg(groups.negative) } as LagBucket,
    neutral:  { n: groups.neutral.length,  avgChangePct: avg(groups.neutral)  } as LagBucket,
  };
}

export type SingleLagResult = { windowDays: number; n: number; avgChangePct: number | null }

export function runLagImpactSingle(dates: string[], quotes: Quote[], { windowDays = 7 }: LagOpts = {}): SingleLagResult {
  const priceMap = quotesToPriceMap(quotes);
  const rows: number[] = [];

  for (const day of [...new Set(dates)].sort()) {
    const base = nearestPrice(priceMap, day);
    const target = new Date(day);
    target.setDate(target.getDate() + windowDays);
    const lagged = nearestPrice(priceMap, target.toISOString().slice(0, 10));
    if (!base || !lagged) continue;
    rows.push(((lagged.price - base.price) / base.price) * 100);
  }

  const avg = rows.length ? rows.reduce((s, v) => s + v, 0) / rows.length : null;
  return { windowDays, n: rows.length, avgChangePct: avg };
}

export function correlate<T>(rawInput: T, quotes: Quote[], opts: CorrelationOpts, strategy: Strategy): CorrelationResult {
  return runCorrelation(strategy.toDayValues(rawInput), quotes, { source: strategy.source, ...opts });
}

export function lagImpact<T>(rawInput: T, quotes: Quote[], opts: LagOpts, strategy: Strategy): LagImpactResult | SingleLagResult {
  const input = strategy.toLagImpactInput(rawInput);
  return strategy.lagImpactMode === "single"
    ? runLagImpactSingle(input as string[], quotes, opts)
    : runLagImpactGrouped(input as DayBucket[], quotes, opts);
}
