import { cssVar } from '../../utils/theme';
import { toSortedClose } from '../../utils/series';
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
 * Live data: NOT supported. Pass a new id (or unmount/remount the chart) if
 * `quotes` changes. See WARNING on useChart's `plugins` prop.
 */
export function compareOverlay({
  id = 'compare',
  label = 'Compare',
  defaultEnabled = true,
  quotes,
  color,
  priceScaleId,
}: CompareOverlayOpts): ChartPlugin {
  const scaleId = priceScaleId ?? id;
  // Cheap content hash: first+last date+close, plus length. Catches the
  // common case of "ticker swapped, same id" or "quotes refetched".
  const first = quotes[0];
  const last = quotes[quotes.length - 1];
  const version = `${quotes.length}|${first?.date ?? ''}|${first?.close ?? ''}|${last?.date ?? ''}|${last?.close ?? ''}`;
  return {
    id,
    label,
    defaultEnabled,
    version,
    mount: (ctrl) => {
      const series = ctrl.addSeries(
        {
          type: 'Line',
          options: {
            color: color ?? cssVar('--color-amber'),
            lineWidth: 2,
            priceScaleId: scaleId,
          },
        },
        toSortedClose(quotes),
      );
      // Only nudge scaleMargins if this overlay owns its scale; shared scales
      // (e.g. 'right') are configured by the primary series' makeChartOptions.
      if (scaleId !== 'right' && scaleId !== 'left') {
        ctrl.chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      }

      return {
        unmount: () => {
          ctrl.chart.removeSeries(series);
        },
      };
    },
  };
}
