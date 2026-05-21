import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
  type SeriesMarker,
} from 'lightweight-charts';
import { makeChartOptions } from '../utils/theme';
import { toSortedOHLC, addCompareOverlay } from '../utils/series';
import { dedupeMarkers, buildOverlayMarkers } from '../utils/markers';
import type { Quote } from '@/types';
import type { OverlayRefs } from './useOverlayRefs';

export type ChartType = 'Candlestick' | 'Bar' | 'Line' | 'Area' | 'Baseline' | 'Histogram';

const SERIES_MAP = {
  Candlestick: CandlestickSeries,
  Bar: BarSeries,
  Line: LineSeries,
  Area: AreaSeries,
  Baseline: BaselineSeries,
  Histogram: HistogramSeries,
} as const;

type QuoteAnalysis = {
  biggestSameDayDiff: Quote & { difference: string };
  biggestNextDayDiff: [Quote, Quote, string];
} | null;

type ResizeConfig = {
  enabled?: boolean;
  minHeight?: number;
  defaultHeight?: number;
  maxHeight?: number;
};

type UseChartInstanceOpts = {
  quotes: Quote[];
  compareQuotes?: Quote[];
  type: ChartType;
  analysis: QuoteAnalysis;
  showAnalysis: boolean;
  overlayRefs: OverlayRefs;
  extraMarkers?: SeriesMarker<Time>[];
  resize?: ResizeConfig;
  /** Called after the chart and primary series are created, before markers/overlays are added.
   *  Use this to add custom series (e.g. HV/ATR lines).
   *  Return a cleanup function that will be called when the chart is destroyed. */
  onChartReady?: (chart: IChartApi, primarySeries: ISeriesApi<SeriesType>) => (() => void) | void;
};

const RESIZE_DEFAULTS = {
  minHeight: 120,
  defaultHeight: 320,
  maxHeight: 700,
} as const;

export function useChartInstance({
  quotes,
  compareQuotes,
  type,
  analysis,
  showAnalysis,
  overlayRefs,
  extraMarkers,
  resize,
  onChartReady,
}: UseChartInstanceOpts) {
  const chartRef = useRef<IChartApi | null>(null);
  const primaryRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Resize logic (optional) ---
  const resizeEnabled = resize?.enabled ?? false;
  const { minHeight, defaultHeight, maxHeight } = { ...RESIZE_DEFAULTS, ...resize };

  const [height, setHeight] = useState(resizeEnabled ? defaultHeight : 0);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(defaultHeight);

  const clamp = useCallback((h: number) => Math.min(maxHeight, Math.max(minHeight, h)), [minHeight, maxHeight]);

  const onHandleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!resizeEnabled) return;
      e.preventDefault();
      setHeight((h) => clamp(h - e.deltaY * 0.5));
    },
    [clamp, resizeEnabled],
  );

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!resizeEnabled) return;
      dragStartY.current = e.clientY;
      dragStartH.current = height;
      e.preventDefault();
    },
    [height, resizeEnabled],
  );

  useEffect(() => {
    if (!resizeEnabled) return;
    function onMouseMove(e: MouseEvent) {
      if (dragStartY.current === null) return;
      const delta = e.clientY - dragStartY.current;
      setHeight(clamp(dragStartH.current + delta));
    }
    function onMouseUp() {
      dragStartY.current = null;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [clamp, resizeEnabled]);

  // Apply height to chart when resize is enabled
  useEffect(() => {
    if (!resizeEnabled) return;
    if (chartRef.current && containerRef.current) {
      chartRef.current.applyOptions({ height, width: containerRef.current.clientWidth });
    }
  }, [height, resizeEnabled]);

  // --- Chart creation ---
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current));
    chartRef.current = chart;

    const primary = chart.addSeries(SERIES_MAP[type]);
    primaryRef.current = primary;
    const sorted = toSortedOHLC(quotes);
    primary.setData(sorted);

    // Allow consumers to add custom series (e.g. HV/ATR lines)
    const chartReadyCleanup = onChartReady?.(chart, primary);

    const minDate = sorted[0]?.time;
    const maxDate = sorted[sorted.length - 1]?.time;
    const inRange = (m: { time: Time }) =>
      (!minDate || String(m.time) >= String(minDate)) && (!maxDate || String(m.time) <= String(maxDate));

    const baseMarkers = dedupeMarkers(
      buildOverlayMarkers(overlayRefs, quotes, analysis, showAnalysis)
        .filter(inRange)
        .sort((a, b) => (a.time < b.time ? -1 : 1)),
    );
    if (baseMarkers.length) createSeriesMarkers(primary, baseMarkers);

    if (compareQuotes?.length) addCompareOverlay(chart, compareQuotes);

    let disposed = false;
    const observer = new ResizeObserver(() => {
      if (!disposed && containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      disposed = true;
      chartReadyCleanup?.();
      primaryRef.current = null;
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [quotes, compareQuotes, type, analysis, showAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update extra markers without recreating the chart
  useEffect(() => {
    if (!primaryRef.current) return;
    createSeriesMarkers(primaryRef.current, extraMarkers ?? []);
  }, [extraMarkers]);

  return {
    chartRef,
    containerRef,
    ...(resizeEnabled
      ? { height, onHandleWheel, onHandleMouseDown }
      : { height: undefined, onHandleWheel: undefined, onHandleMouseDown: undefined }),
  };
}
