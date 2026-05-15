import { LineSeries } from 'lightweight-charts';
import { cssVar } from './theme.js';

function toSorted(quotes, ...fields) {
  const seen = new Set();
  return quotes
    .filter((q) => q.close)
    .map((q) => {
      const base = { time: String(q.date).slice(0, 10) };
      for (const f of fields) base[f] = f === 'value' ? (q.value ?? q.close) : q[f];
      return base;
    })
    .sort((a, b) => a.time.localeCompare(b.time))
    .filter((q) => !seen.has(q.time) && seen.add(q.time));
}

export const toSortedOHLC = (quotes) => toSorted(quotes, 'open', 'high', 'low', 'close', 'value');
export const toSortedClose = (quotes) => toSorted(quotes, 'value');

export function addCompareOverlay(chart, compareQuotes) {
  const compare = chart.addSeries(LineSeries, {
    color: cssVar('--color-amber'),
    lineWidth: 2,
    priceScaleId: 'compare',
  });
  compare.setData(toSortedOHLC(compareQuotes));
  chart.priceScale('compare').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
}
