import type { LineData, Time } from 'lightweight-charts';
import { cssVar } from '../utils/theme';
import { toSortedClose } from '../utils/series';
import { lineSeriesOverlay } from './lineSeriesOverlay';
import type { ChartPlugin } from '../types';
import type { Quote } from '@/types';

type CompareOverlayOpts = {
  /** Stable id; override only if you need multiple compare overlays on one chart. */
  id?: string;
  label?: string;
  defaultEnabled?: boolean;
  quotes: Quote[];
  color?: string;
  /** Price scale to put the overlay on. Defaults to the plugin's id (own scale),
   *  matching the original single-compare behavior. Pass `'right'` to share the
   *  primary series' y-axis — useful when comparing multiple tickers on one chart
   *  and you want them on the same scale. */
  priceScaleId?: string;
};

/**
 * Adds a secondary line series on its own price scale ('compare') so the
 * compared symbol shares the x-axis but not the y-axis with the primary series.
 *
 * Live data: the engine remounts on `version` changes — the content hash below
 * catches "ticker swapped, same id" or "quotes refetched".
 */
export function compareOverlay({
  id = 'compare',
  label = 'Compare',
  defaultEnabled = true,
  quotes,
  color,
  priceScaleId,
}: CompareOverlayOpts): ChartPlugin {
  const first = quotes[0];
  const last = quotes[quotes.length - 1];
  const version = `${quotes.length}|${first?.date ?? ''}|${first?.close ?? ''}|${last?.date ?? ''}|${last?.close ?? ''}`;
  const data: LineData<Time>[] = toSortedClose(quotes).map((p) => ({
    time: p.time as Time,
    value: p.value ?? 0,
  }));
  return lineSeriesOverlay({
    id,
    label,
    defaultEnabled,
    version,
    data,
    color: color ?? cssVar('--color-amber'),
    priceScaleId,
  });
}
