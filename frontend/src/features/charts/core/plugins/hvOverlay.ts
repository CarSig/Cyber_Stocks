import type { LineData, Time } from 'lightweight-charts';
import { calcHV, toSortedOHLC } from '../../utils/series';
import { cssVar } from '../../utils/theme';
import { lineSeriesOverlay } from './lineSeriesOverlay';
import type { ChartPlugin } from '../types';
import type { Quote } from '@/types';

type HvOverlayOpts = {
  quotes: Quote[];
  /** Rolling window (trading days). Default 20. */
  window?: number;
  id?: string;
  label?: string;
  defaultEnabled?: boolean;
  color?: string;
};

/**
 * Historical Volatility overlay — annualized stdev of log returns, in %.
 * Renders a Line series on its own price scale (id == plugin id) so the HV
 * y-axis doesn't fight other series' price scales.
 */
export function hvOverlay({
  quotes,
  window = 20,
  id = 'hv',
  label,
  defaultEnabled = true,
  color,
}: HvOverlayOpts): ChartPlugin {
  const pluginLabel = label ?? `HV${window}%`;
  const first = quotes[0];
  const last = quotes[quotes.length - 1];
  const version = `${window}|${quotes.length}|${first?.date ?? ''}|${last?.date ?? ''}|${last?.close ?? ''}`;
  const data: LineData<Time>[] = calcHV(toSortedOHLC(quotes), window).map((p) => ({
    time: p.time as Time,
    value: p.value,
  }));
  return lineSeriesOverlay({
    id,
    label: pluginLabel,
    defaultEnabled,
    version,
    data,
    color: color ?? cssVar('--color-amber'),
    title: pluginLabel,
  });
}
