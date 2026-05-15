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

export function addCompareOverlay(chart: IChartApi, compareQuotes: Quote[]): void {
  const compare = chart.addSeries(LineSeries, {
    color: cssVar('--color-amber'),
    lineWidth: 2,
    priceScaleId: 'compare',
  });
  compare.setData(toSortedOHLC(compareQuotes));
  chart.priceScale('compare').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
}
