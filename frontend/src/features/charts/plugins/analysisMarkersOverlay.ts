import { buildMarkers } from '../utils/markers';
import type { ChartPlugin } from '../types';
import type { QuoteAnalysis } from '../types';

type AnalysisMarkersOverlayOpts = {
  analysis: QuoteAnalysis | null | undefined;
  defaultEnabled?: boolean;
};

/**
 * "Biggest Swings" overlay — three markers from periodAnalysis:
 *   - the bar with the biggest same-day open→close move
 *   - the two consecutive bars with the biggest day-over-day close move
 *
 * Reuses the existing `buildMarkers` helper so visuals match the legacy
 * StockChart exactly.
 */
export function analysisMarkersOverlay({ analysis, defaultEnabled = false }: AnalysisMarkersOverlayOpts): ChartPlugin {
  // Cheap version key: any time `analysis` becomes truthy/falsy or its key
  // dates change, the plugin remounts with the new closure.
  const same = analysis?.biggestSameDayDiff;
  const next0 = analysis?.biggestNextDayDiff?.[0];
  const next1 = analysis?.biggestNextDayDiff?.[1];
  const version = `${same?.date ?? ''}|${next0?.date ?? ''}|${next1?.date ?? ''}`;

  return {
    id: 'analysis',
    label: 'Biggest Swings',
    defaultEnabled,
    version,
    mount: (ctrl) => {
      ctrl.setMarkers('analysis', buildMarkers(analysis ?? null));
      return {
        unmount: () => ctrl.setMarkers('analysis', []),
      };
    },
  };
}
