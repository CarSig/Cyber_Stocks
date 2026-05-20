import { useEffect, useRef, type RefObject } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
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

export type ChartType = 'Candlestick' | 'Bar' | 'Line' | 'Area' | 'Baseline';

const SERIES_MAP = {
  Candlestick: CandlestickSeries,
  Bar: BarSeries,
  Line: LineSeries,
  Area: AreaSeries,
  Baseline: BaselineSeries,
} as const;

type QuoteAnalysis = {
  biggestSameDayDiff: Quote & { difference: string };
  biggestNextDayDiff: [Quote, Quote, string];
} | null;

type UseChartInstanceOpts = {
  quotes: Quote[];
  compareQuotes?: Quote[];
  type: ChartType;
  analysis: QuoteAnalysis;
  showAnalysis: boolean;
  overlayRefs: OverlayRefs;
  extraMarkers?: SeriesMarker<Time>[];
};

export function useChartInstance(
  containerRef: RefObject<HTMLElement | null>,
  { quotes, compareQuotes, type, analysis, showAnalysis, overlayRefs, extraMarkers }: UseChartInstanceOpts,
): RefObject<IChartApi | null> {
  const chartRef = useRef<IChartApi | null>(null);
  const primaryRef = useRef<ISeriesApi<SeriesType> | null>(null);

  // Create/recreate chart when data or type changes — NOT when extraMarkers changes
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current));
    chartRef.current = chart;

    const primary = chart.addSeries(SERIES_MAP[type]);
    primaryRef.current = primary;
    const sorted = toSortedOHLC(quotes);
    primary.setData(sorted);

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

  return chartRef;
}
