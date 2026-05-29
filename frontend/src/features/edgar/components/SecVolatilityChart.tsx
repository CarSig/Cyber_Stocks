import { useMemo } from 'react';
import type { LineData, Time } from 'lightweight-charts';
import { ChartAuto, atrOverlay, PRICE_SCALE_MIN_WIDTH, type ChartPlugin } from '@/features/charts';
import { calcHV, toSortedOHLC } from '@/features/charts/utils/series';
import type { Quote } from '@/types';
import SecChartPanel from './SecChartPanel';

type Props = {
  quotes: Quote[] | undefined;
  visibleRange: { from: string; to: string } | null;
  onRangeChange: (range: { from: string; to: string }) => void;
  /** Filing-marker overlay(s) to render alongside the HV/ATR lines. */
  filingPlugins?: ChartPlugin[];
};

/**
 * HV / ATR volatility chart. HV is the primary series (so filing markers have a
 * populated series to anchor to — markers don't render on an empty series);
 * ATR is an overlay on its own price scale. Shown by default; collapsible.
 */
export default function SecVolatilityChart({ quotes, visibleRange, onRangeChange, filingPlugins = [] }: Props) {
  const hvData = useMemo<LineData<Time>[]>(
    () => calcHV(toSortedOHLC(quotes ?? [])).map((p) => ({ time: p.time as Time, value: p.value })),
    [quotes],
  );

  const plugins: ChartPlugin[] = useMemo(
    () => [atrOverlay({ quotes: quotes ?? [] }), ...filingPlugins],
    [quotes, filingPlugins],
  );

  return (
    <SecChartPanel title="Volatility — HV / ATR">
      <ChartAuto
        data={hvData}
        defaultType="Line"
        availableTypes={['Line']}
        hideTypeControls
        hidePeriodControls
        visibleRange={visibleRange}
        onRangeChange={onRangeChange}
        plugins={plugins}
        topScaleMargin={0.18}
        priceScaleMinWidth={PRICE_SCALE_MIN_WIDTH}
        toolbarExtras={<span className="chart-series-label chart-series-label-ml">HV20%</span>}
      />
    </SecChartPanel>
  );
}
