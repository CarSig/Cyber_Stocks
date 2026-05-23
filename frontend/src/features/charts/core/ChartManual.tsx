import type { ReactNode } from 'react';
import { useChart } from './useChart';
import { useChartShell } from './useChartShell';
import { ChartContext } from './ChartContext';
import { TypeControls } from './controls/TypeControls';
import { PeriodControls } from './controls/PeriodControls';
import { Toggle } from './controls/Toggle';
import { ChartModalHost } from './ChartModalHost';
import type { ChartPlugin, ChartType } from './types';
import '../components/charts.css';

type PrimaryDatum = Parameters<typeof useChart>[0]['data'][number];

type ChartManualProps = {
  data: PrimaryDatum[];
  defaultType?: ChartType;
  availableTypes?: ChartType[];

  selectedPeriod?: number | null;
  onPeriodChange?: (days: number) => void;
  availablePeriods?: number[];

  /** Plugins. See WARNING on useChart's `plugins` prop re: live data. */
  plugins?: ChartPlugin[];

  /** Explicit visible-range override. Takes precedence over selectedPeriod. */
  visibleRange?: { from: string; to: string } | null;
  /** Fired when the user pans/zooms the chart. */
  onRangeChange?: (range: { from: string; to: string }) => void;

  /** Render-prop: full control over toolbar layout. Receives the sub-components
   *  ready to use, so the consumer just composes them. */
  children?: (parts: ChartManualParts) => ReactNode;
};

export type ChartManualParts = {
  TypeControls: typeof TypeControls;
  PeriodControls: typeof PeriodControls;
  Toggle: typeof Toggle;
};

const DEFAULT_TYPES: ChartType[] = ['Candlestick', 'Bar', 'Line', 'Area'];
const DEFAULT_PERIODS = [1, 7, 30, 90, 365];

const PARTS: ChartManualParts = { TypeControls, PeriodControls, Toggle };

/**
 * Power-user Chart with consumer-owned toolbar layout.
 *
 * Reach for this only when ChartAuto's toolbar shape doesn't fit (split rows,
 * controls in a page header, dynamic toggle labels, etc.). For everything else
 * use ChartAuto — it auto-renders toggles from plugin metadata so you can't
 * forget to expose a plugin.
 *
 *   <ChartManual data={quotes} plugins={[trumpPlugin(posts)]}>
 *     {({ TypeControls, PeriodControls, Toggle }) => (
 *       <div className="chart-toolbar">
 *         <TypeControls />
 *         <PeriodControls />
 *         <Toggle pluginId="trump">Trump</Toggle>
 *       </div>
 *     )}
 *   </ChartManual>
 */
export function ChartManual({
  data,
  defaultType = 'Area',
  availableTypes = DEFAULT_TYPES,
  selectedPeriod,
  onPeriodChange,
  availablePeriods = DEFAULT_PERIODS,
  plugins = [],
  visibleRange,
  onRangeChange,
  children,
}: ChartManualProps) {
  const { ctx, containerRef, modal, closeModal } = useChartShell({
    data,
    defaultType,
    availableTypes,
    selectedPeriod,
    onPeriodChange,
    availablePeriods,
    plugins,
    visibleRange,
    onRangeChange,
  });

  return (
    <ChartContext.Provider value={ctx}>
      <div>
        {children?.(PARTS)}
        <div ref={containerRef} className="chart-container" />
        <ChartModalHost modal={modal} onClose={closeModal} />
      </div>
    </ChartContext.Provider>
  );
}
