import type { LineData, Time } from 'lightweight-charts';
import { calcATR, toSortedOHLC } from '../../utils/series';
import { cssVar } from '../../utils/theme';
import { lineSeriesOverlay } from './lineSeriesOverlay';
import type { ChartPlugin } from '../types';
import type { Quote } from '@/types';

type AtrOverlayOpts = {
  quotes: Quote[];
  /** Rolling window. Default 14. */
  window?: number;
  id?: string;
  label?: string;
  defaultEnabled?: boolean;
  color?: string;
};

/**
 * Average True Range overlay, expressed as % of close.
 * Renders a Line series on its own price scale (id == plugin id).
 */
export function atrOverlay({
  quotes,
  window = 14,
  id = 'atr',
  label,
  defaultEnabled = true,
  color,
}: AtrOverlayOpts): ChartPlugin {
  const pluginLabel = label ?? `ATR${window}%`;
  const first = quotes[0];
  const last = quotes[quotes.length - 1];
  const version = `${window}|${quotes.length}|${first?.date ?? ''}|${last?.date ?? ''}|${last?.close ?? ''}`;
  const data: LineData<Time>[] = calcATR(toSortedOHLC(quotes), window).map((p) => ({
    time: p.time as Time,
    value: p.value,
  }));
  return lineSeriesOverlay({
    id,
    label: pluginLabel,
    defaultEnabled,
    version,
    data,
    color: color ?? cssVar('--color-red'),
    title: pluginLabel,
  });
}
