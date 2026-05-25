import { useState } from 'react';
import { useChart } from './useChart';
import { useChartRange } from './hooks/useChartRange';
import { useChartResize } from './hooks/useChartResize';
import { usePluginClickModal, type ModalState } from './usePluginClickModal';
import type { ChartContextValue } from './ChartContext';
import type { ChartPlugin, ChartType, ResizeConfig } from './types';

type PrimaryDatum = Parameters<typeof useChart>[0]['data'][number];

export type ChartShellOpts = {
  data: PrimaryDatum[];
  defaultType: ChartType;
  availableTypes: ChartType[];
  selectedPeriod: number | null | undefined;
  onPeriodChange?: (days: number) => void;
  availablePeriods: number[];
  plugins: ChartPlugin[];
  /** Explicit visible-range override. When set, takes precedence over
   *  `selectedPeriod`. Use for date-picker driven views (e.g. Home compare). */
  visibleRange?: { from: string; to: string } | null;
  /** Fired when the user pans/zooms the chart, AND for synthetic range
   *  changes when buttons or pickers update the range. */
  onRangeChange?: (range: { from: string; to: string }) => void;
  /** Drag/scroll-to-resize support. When `enabled`, the consumer should
   *  render the returned resize handle below the chart container. */
  resize?: ResizeConfig;
};

export type ChartShell = {
  ctx: ChartContextValue;
  containerRef: ReturnType<typeof useChart>['containerRef'];
  modal: ModalState | null;
  closeModal: () => void;
  /** Resize handle wiring. `height` is undefined unless `resize.enabled`. */
  resize: {
    enabled: boolean;
    height: number | undefined;
    onHandleWheel: (e: React.WheelEvent) => void;
    onHandleMouseDown: (e: React.MouseEvent) => void;
  };
};

/**
 * Shared wiring for ChartAuto and ChartManual. Owns chart state (type, enabled
 * map), wires the engine, range hook, and click-modal hook, and assembles the
 * ChartContextValue exposed to controls.
 *
 * Both Chart variants differ ONLY in how they lay out their toolbar — all the
 * stateful plumbing lives here so it can't drift between them.
 */
export function useChartShell(opts: ChartShellOpts): ChartShell {
  const [type, setType] = useState<ChartType>(opts.defaultType);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(opts.plugins.map((p) => [p.id, p.defaultEnabled ?? true])),
  );

  const { containerRef, chartRef, primarySeriesRef, controllerRef } = useChart({
    data: opts.data,
    type,
    plugins: opts.plugins,
    enabled,
  });
  useChartRange(
    chartRef,
    {
      period: opts.selectedPeriod,
      visibleRange: opts.visibleRange,
      onPeriodChange: opts.onPeriodChange,
      onRangeChange: opts.onRangeChange,
    },
    primarySeriesRef,
  );
  const [modal, closeModal] = usePluginClickModal(controllerRef, opts.plugins, enabled);
  const { height, onHandleWheel, onHandleMouseDown } = useChartResize(opts.resize, chartRef, containerRef);
  const resizeEnabled = opts.resize?.enabled ?? false;

  // React Compiler memoizes this implicitly.
  const ctx: ChartContextValue = {
    type,
    setType,
    availableTypes: opts.availableTypes,
    selectedPeriod: opts.selectedPeriod,
    onPeriodChange: opts.onPeriodChange,
    availablePeriods: opts.availablePeriods,
    plugins: opts.plugins,
    enabled,
    toggle: (id, next) =>
      setEnabled((prev) => ({
        ...prev,
        [id]: next ?? !(prev[id] ?? opts.plugins.find((p) => p.id === id)?.defaultEnabled ?? true),
      })),
  };

  return {
    ctx,
    containerRef,
    modal,
    closeModal,
    resize: {
      enabled: resizeEnabled,
      height: resizeEnabled ? height : undefined,
      onHandleWheel,
      onHandleMouseDown,
    },
  };
}
