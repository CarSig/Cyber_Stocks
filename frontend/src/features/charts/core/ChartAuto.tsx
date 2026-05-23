import type { ReactNode } from 'react';
import { useChart } from './useChart';
import { useChartShell } from './useChartShell';
import { ChartContext } from './ChartContext';
import { TypeControls } from './controls/TypeControls';
import { PeriodControls } from './controls/PeriodControls';
import { AutoToggles } from './controls/AutoToggles';
import { ChartModalHost } from './ChartModalHost';
import type { ChartPlugin, ChartType } from './types';
import '../components/charts.css';

type PrimaryDatum = Parameters<typeof useChart>[0]['data'][number];

type ChartAutoProps = {
  data: PrimaryDatum[];
  /** Defaults to 'Area'. */
  defaultType?: ChartType;
  availableTypes?: ChartType[];

  /** Controlled period (days). Pass `onPeriodChange` to make buttons clickable. */
  selectedPeriod?: number | null;
  onPeriodChange?: (days: number) => void;
  availablePeriods?: number[];

  /** Plugins. See WARNING on useChart's `plugins` prop re: live data. */
  plugins?: ChartPlugin[];

  /** Explicit visible-range override. Takes precedence over selectedPeriod. */
  visibleRange?: { from: string; to: string } | null;
  /** Fired when the user pans/zooms the chart. */
  onRangeChange?: (range: { from: string; to: string }) => void;

  /** Free-form JSX rendered alongside the auto-generated toolbar contents
   *  (e.g. a `● TickerName` compare-label, or a custom legend chip). */
  toolbarExtras?: ReactNode;
  /** Hide the auto-rendered period buttons. Use when the consumer renders
   *  its own period UI (e.g. external PeriodButtons component on the page). */
  hidePeriodControls?: boolean;
  /** Hide the auto-rendered type buttons. Use when there's only one valid
   *  type (e.g. a Histogram-only chart). */
  hideTypeControls?: boolean;
};

const DEFAULT_TYPES: ChartType[] = ['Candlestick', 'Bar', 'Line', 'Area'];
const DEFAULT_PERIODS = [1, 7, 30, 90, 365];

/**
 * Batteries-included Chart — the default for ~all use cases.
 *
 * Renders a toolbar (type buttons → period buttons → plugin toggles → extras)
 * automatically from plugin metadata. Reach for ChartManual only when you need
 * a custom toolbar layout.
 */
export function ChartAuto({
  data,
  defaultType = 'Area',
  availableTypes = DEFAULT_TYPES,
  selectedPeriod,
  onPeriodChange,
  availablePeriods = DEFAULT_PERIODS,
  plugins = [],
  visibleRange,
  onRangeChange,
  toolbarExtras,
  hidePeriodControls,
  hideTypeControls,
}: ChartAutoProps) {
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
        <div className="chart-toolbar">
          {!hideTypeControls && <TypeControls />}
          {!hidePeriodControls && onPeriodChange && <PeriodControls />}
          <AutoToggles />
          {toolbarExtras}
        </div>
        <div ref={containerRef} className="chart-container" />
        <ChartModalHost modal={modal} onClose={closeModal} />
      </div>
    </ChartContext.Provider>
  );
}
