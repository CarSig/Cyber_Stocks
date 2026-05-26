import type { RefObject, Dispatch, MutableRefObject } from 'react';
import type { Action } from '@/features/simulations/utils/sim';
import type { AlpacaBar } from '@/types';
import type { BaseSimAction } from '../reducers/baseReducer';
import type { ChartSeriesConfig } from './usePriceChart';
import { usePriceChart } from './usePriceChart';
import { useActionPopovers } from './useActionPopovers';
import { useCrosshairTracker } from './useCrosshairTracker';
import { useSimChartClick } from './useSimChartClick';
import { useActionMarkers } from './useActionMarkers';
import type { ChartType } from '../components/ChartTypeToggle';

type Opts = {
  containerRef: RefObject<HTMLDivElement | null>;
  bars: AlpacaBar[];
  chartType: ChartType;
  chartConfig: ChartSeriesConfig;
  toIso: (t: unknown) => string;
  actionsRef: MutableRefObject<Action[]>;
  valueRef: MutableRefObject<string>;
  tradeModeRef: MutableRefObject<'long' | 'short'>;
  nextIdRef: MutableRefObject<number>;
  dispatch: Dispatch<BaseSimAction<Action>>;
  date: string;
  tradeMode: 'long' | 'short';
  fmtTime: (iso: string) => string;
  actions: Action[];
  extraDeps?: unknown[];
  onAfterAttach?: () => (() => void) | void;
};

export function useIntradayChart({
  containerRef,
  bars,
  chartType,
  chartConfig,
  toIso,
  actionsRef,
  valueRef,
  tradeModeRef,
  nextIdRef,
  dispatch,
  date,
  tradeMode,
  fmtTime,
  actions,
  extraDeps,
  onAfterAttach,
}: Opts) {
  const chartRef = usePriceChart(containerRef, bars, chartType, chartConfig);

  const { popover, nodes: popoverNodes } = useActionPopovers(dispatch, nextIdRef, date, tradeMode, fmtTime);

  const getHoveredIso = useCrosshairTracker(chartRef, toIso, [bars, chartType, ...(extraDeps ?? [])]);

  useSimChartClick(
    containerRef,
    chartRef,
    bars,
    chartType,
    {
      actionsRef,
      valueRef,
      tradeModeRef,
      nextIdRef,
      dispatch,
      date,
      fmtLabel: fmtTime,
      createAction: (id, iso, label, side, val) => ({ id, timestamp: iso, time: label, side, value: val }),
      onPopoverOpen: popover.openAdd,
      onEditPopoverOpen: popover.openEdit,
      getHoveredIso,
      onAfterAttach,
    },
    extraDeps,
  );

  useActionMarkers(chartRef, actions);

  return { chartRef, popoverNodes };
}
