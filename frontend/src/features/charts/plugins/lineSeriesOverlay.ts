import type { LineData, LineWidth, Time } from 'lightweight-charts';
import type { ChartPlugin } from '../types';

type LineSeriesOverlayOpts = {
  /** Plugin id. Used as default priceScaleId (own scale) and as the
   *  remount key in pluginsKey. */
  id: string;
  /** Toolbar toggle text. Omit to suppress the toggle (behavior-only plugin). */
  label?: string;
  /** Initial enabled state. Defaults to false. */
  defaultEnabled?: boolean;
  /** Content-hash key so the engine remounts when the closed-over data
   *  changes for the same id. Compute in the consumer; the factory doesn't
   *  hash because the consumer has richer info (window size, value field). */
  version?: string;

  /** Pre-shaped data, ready for setData(). */
  data: LineData<Time>[];
  /** Resolved color string (cssVar already called by consumer). */
  color: string;
  /** Defaults to 2. */
  lineWidth?: LineWidth;
  /** Series title (shows in chart legend). */
  title?: string;

  /** Price scale id. Defaults to plugin `id` (own scale). Pass `'right'` /
   *  `'left'` to share the primary series' scale (multi-ticker compare). */
  priceScaleId?: string;
  /** Apply `{ top: 0.1, bottom: 0.1 }` to the owned price scale on mount.
   *  Auto-skipped for shared `'right'`/`'left'` scales (configured by the
   *  primary series' theme options). Defaults to true. */
  applyScaleMargins?: boolean;
};

/**
 * Low-level factory for "add a Line series on a price scale" plugins.
 * Intended as an internal building block for domain plugins like
 * hvOverlay / atrOverlay / compareOverlay. Reach for those first; only
 * use this directly when you have a one-off Line overlay with no natural
 * domain home (e.g. inline in a consumer file).
 */
export function lineSeriesOverlay(opts: LineSeriesOverlayOpts): ChartPlugin {
  const scaleId = opts.priceScaleId ?? opts.id;
  const sharedScale = scaleId === 'right' || scaleId === 'left';
  const applyMargins = (opts.applyScaleMargins ?? true) && !sharedScale;

  return {
    id: opts.id,
    label: opts.label,
    defaultEnabled: opts.defaultEnabled ?? false,
    version: opts.version,
    mount: (ctrl) => {
      if (!opts.data.length) return { unmount: () => undefined };
      const series = ctrl.addSeries(
        {
          type: 'Line',
          options: {
            color: opts.color,
            lineWidth: (opts.lineWidth ?? 2) as LineWidth,
            priceScaleId: scaleId,
            title: opts.title,
          },
        },
        opts.data,
      );
      if (applyMargins) {
        ctrl.chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      }
      return {
        unmount: () => {
          try {
            ctrl.chart.removeSeries(series);
          } catch {
            /* chart already destroyed */
          }
        },
      };
    },
  };
}
