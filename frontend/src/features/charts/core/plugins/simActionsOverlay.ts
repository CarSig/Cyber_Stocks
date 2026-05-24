import type { Time, SeriesMarker } from 'lightweight-charts';
import type { ChartPlugin } from '../types';
import type { MarkerPoint } from '../../types';

type SimActionsOverlayOpts = {
  markers: MarkerPoint[];
  /** Time on each marker is shifted to chart time externally; pass the
   *  conversion in if needed. Defaults to identity (the consumer pre-shifted). */
  toTime?: (timestamp: string) => Time;
  /** Plugin id. Override if you need multiple overlay sets on one chart. */
  id?: string;
  label?: string;
  defaultEnabled?: boolean;
};

/**
 * Buy/sell markers from a simulation's action list. Buys point up below the
 * bar (green), sells point down above (red). Text is "B $price" / "S Nsh".
 *
 * Mirrors the marker rendering inside the legacy PortfolioChart.
 */
export function simActionsOverlay({
  markers,
  toTime = (ts) => ts as unknown as Time,
  id = 'sim-actions',
  label = 'Trades',
  defaultEnabled = true,
}: SimActionsOverlayOpts): ChartPlugin {
  const version = `${markers.length}|${markers[0]?.timestamp ?? ''}|${markers[markers.length - 1]?.timestamp ?? ''}`;
  return {
    id,
    label,
    defaultEnabled,
    version,
    mount: (ctrl) => {
      const ms: SeriesMarker<Time>[] = markers
        .map((m) => ({
          time: toTime(m.timestamp),
          position: m.side === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
          color: m.side === 'buy' ? '#22c55e' : '#ef4444',
          shape: m.side === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
          text: m.side === 'buy' ? `B $${m.value.toFixed(2)}` : `S ${m.shares.toFixed(2)}sh`,
        }))
        .sort((a, b) => (a.time < b.time ? -1 : 1));
      ctrl.setMarkers(id, ms);
      return { unmount: () => ctrl.setMarkers(id, []) };
    },
  };
}
