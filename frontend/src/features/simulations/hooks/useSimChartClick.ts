import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, RefObject } from 'react';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import type { AlpacaBar } from '@/types';
import type { BaseSimAction } from '../reducers/baseReducer';
import { attachSimChartClick } from '../utils';

type ChartRef = { chart: IChartApi; series: ISeriesApi<SeriesType> };

type Side = 'buy' | 'sell' | 'short' | 'cover';

type Options<A extends { id: number }> = {
  actionsRef: MutableRefObject<A[]>;
  valueRef: MutableRefObject<string>;
  tradeModeRef: MutableRefObject<'long' | 'short'>;
  nextIdRef: MutableRefObject<number>;
  dispatch: Dispatch<BaseSimAction<A>>;
  date: string;
  fmtLabel: (iso: string) => string;
  createAction: (id: number, iso: string, label: string, side: Side, value: number) => A;
  onPopoverOpen: (iso: string, x: number, y: number, side: Side, value: string) => void;
  onEditPopoverOpen: (action: A, x: number, y: number) => void;
  getHoveredIso: () => string | null;
  onAfterAttach?: () => (() => void) | void;
};

export function useSimChartClick<A extends { id: number }>(
  containerRef: RefObject<HTMLDivElement | null>,
  chartRef: RefObject<ChartRef | null>,
  bars: AlpacaBar[],
  chartType: string,
  opts: Options<A>,
  extraDeps: unknown[] = [],
) {
  const {
    actionsRef,
    valueRef,
    tradeModeRef,
    nextIdRef,
    dispatch,
    date,
    fmtLabel,
    createAction,
    onPopoverOpen,
    onEditPopoverOpen,
    getHoveredIso,
    onAfterAttach,
  } = opts;

  useEffect(() => {
    if (!containerRef.current || !chartRef.current || !bars.length) return;

    const cleanup = attachSimChartClick(containerRef.current, {
      chart: chartRef.current.chart,
      getHoveredIso,
      actionsRef: actionsRef as MutableRefObject<A[]>,
      valueRef,
      tradeModeRef,
      nextIdRef,
      dispatch,
      date,
      fmtLabel,
      createAction,
      onPopoverOpen,
      onEditPopoverOpen,
    });

    const cleanupExtra = onAfterAttach?.() ?? (() => {});

    return () => {
      cleanup();
      cleanupExtra();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartRef, chartType, date, ...extraDeps]);
}
