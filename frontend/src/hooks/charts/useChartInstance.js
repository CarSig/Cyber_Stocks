import { useEffect, useRef } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
} from 'lightweight-charts';
import { makeChartOptions } from '@/components/organisms/charts/utils/theme.js';
import { toSortedOHLC, addCompareOverlay } from '@/components/organisms/charts/utils/series.js';
import { dedupeMarkers, buildOverlayMarkers } from '@/components/organisms/charts/utils/markers.js';

const SERIES_MAP = {
  Candlestick: CandlestickSeries,
  Bar: BarSeries,
  Line: LineSeries,
  Area: AreaSeries,
  Baseline: BaselineSeries,
};

// Creates and tears down the Lightweight Charts instance. Rebuilds when quotes,
// type, or analysis overlay changes. Overlay data is read via refs so toggling
// overlays does not rebuild the chart.
export function useChartInstance(containerRef, { quotes, compareQuotes, type, analysis, showAnalysis, overlayRefs }) {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current));
    chartRef.current = chart;

    // Primary series + data
    const primary = chart.addSeries(SERIES_MAP[type]);
    const sorted = toSortedOHLC(quotes);
    primary.setData(sorted);

    // Overlay markers, clipped to the date range of the primary series
    const minDate = sorted[0]?.time;
    const maxDate = sorted[sorted.length - 1]?.time;
    const inRange = (m) => (!minDate || m.time >= minDate) && (!maxDate || m.time <= maxDate);
    const markers = dedupeMarkers(
      buildOverlayMarkers(overlayRefs, quotes, analysis, showAnalysis)
        .filter(inRange)
        .sort((a, b) => (a.time < b.time ? -1 : 1)),
    );
    if (markers.length) createSeriesMarkers(primary, markers);

    // Optional compare overlay on a separate price scale
    if (compareQuotes?.length) addCompareOverlay(chart, compareQuotes);

    // Resize observer keeps chart width in sync with container
    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      chartRef.current = null;
      observer.disconnect();
      chart.remove();
    };
  }, [quotes, compareQuotes, type, analysis, showAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  return chartRef;
}
