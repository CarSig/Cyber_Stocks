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
}: CompareOverlayOpts): ChartPlugin {
  return {
    id,
    label,
    defaultEnabled,
    mount: (ctrl) => {
      const series = ctrl.addSeries(
        {
          type: 'Line',
          options: {
            color: color ?? cssVar('--color-amber'),
            lineWidth: 2,
            priceScaleId: id,
          },
        },
        toSortedClose(quotes),
      );
      ctrl.chart.priceScale(id).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });

      return {
        unmount: () => {
          ctrl.chart.removeSeries(series);
        },
      };
    },
  };
}
