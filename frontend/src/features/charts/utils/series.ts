import { LineSeries, type IChartApi } from 'lightweight-charts';
import { cssVar } from './theme';
import type { Quote } from '@/types';

type ChartPoint = { time: string; open?: number; high?: number; low?: number; close?: number; value?: number };

function toSorted(quotes: Quote[], ...fields: string[]): ChartPoint[] {
  const seen = new Set<string>();
  return quotes
    .filter((q) => q.close)
    .map((q) => {
      const base: ChartPoint = { time: String(q.date).slice(0, 10) };
      for (const f of fields) {
        if (f === 'value') base.value = q.close;
        else (base as Record<string, unknown>)[f] = (q as unknown as Record<string, unknown>)[f];
      }
      return base;
    })
    .sort((a, b) => a.time.localeCompare(b.time))
    .filter((q) => !seen.has(q.time) && seen.add(q.time));
}

export const toSortedOHLC = (quotes: Quote[]): ChartPoint[] =>
  toSorted(quotes, 'open', 'high', 'low', 'close', 'value');
export const toSortedClose = (quotes: Quote[]): ChartPoint[] => toSorted(quotes, 'value');

type OhlcEntry = { time: string; open?: number; high?: number; low?: number; close?: number };

export function calcHV(quotes: OhlcEntry[], window = 20): { time: string; value: number }[] {
  if (quotes.length < window + 1) return [];
  const result: { time: string; value: number }[] = [];
  for (let i = window; i < quotes.length; i++) {
    const slice = quotes.slice(i - window, i + 1);
    const logReturns: number[] = [];
    for (let j = 1; j < slice.length; j++) {
      const prev = slice[j - 1].close ?? 0;
      const curr = slice[j].close ?? 0;
      if (prev > 0 && curr > 0) logReturns.push(Math.log(curr / prev));
    }
    if (!logReturns.length) continue;
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / logReturns.length;
    result.push({ time: quotes[i].time, value: parseFloat((Math.sqrt(variance * 252) * 100).toFixed(4)) });
  }
  return result;
}

export function calcATR(quotes: OhlcEntry[], window = 14): { time: string; value: number }[] {
  if (quotes.length < window + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < quotes.length; i++) {
    const high = quotes[i].high ?? 0,
      low = quotes[i].low ?? 0,
      prevClose = quotes[i - 1].close ?? 0;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const result: { time: string; value: number }[] = [];
  for (let i = window - 1; i < trs.length; i++) {
    const atr = trs.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0) / window;
    const close = quotes[i + 1].close ?? 0;
    if (close > 0) result.push({ time: quotes[i + 1].time, value: parseFloat(((atr / close) * 100).toFixed(4)) });
  }
  return result;
}

export function addCompareOverlay(chart: IChartApi, compareQuotes: Quote[]): void {
  const compare = chart.addSeries(LineSeries, {
    color: cssVar('--color-amber'),
    lineWidth: 2,
    priceScaleId: 'compare',
  });
  compare.setData(toSortedOHLC(compareQuotes));
  chart.priceScale('compare').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
}
