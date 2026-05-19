import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';

export type ChartSeriesConfig = {
  /** Function to convert a bar's timestamp to a chart time value */
  toTime: (bar: { t: string }) => import('lightweight-charts').Time;
  /** Optional extra series to add after the main one (e.g. peer overlays) */
  extraSeries?: (chart: IChartApi, toTime: (bar: { t: string }) => import('lightweight-charts').Time) => (() => void)[];
  /** Optional tick mark formatter */
  tickMarkFormatter?: (time: number, tickMarkType: number) => string;
  /** Whether time scale should show time (true for intraday) */
  timeVisible?: boolean;
  /** Whether seconds should be visible */
  secondsVisible?: boolean;
};

/**
 * Creates a lightweight-charts price chart inside containerRef.
 * Handles chart creation, series setup (candlestick/area/line), resize observer, and cleanup.
 */
export function usePriceChart(
  containerRef: React.RefObject<HTMLDivElement | null>,
  bars: { t: string; o: number; h: number; l: number; c: number }[],
  chartType: 'line' | 'area' | 'candlestick',
  config: ChartSeriesConfig,
): React.RefObject<{ chart: IChartApi; series: ISeriesApi<SeriesType> } | null> {
  const chartRef = useRef<{ chart: IChartApi; series: ISeriesApi<SeriesType> } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !bars.length) return;

    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(containerRef.current, {
      height: 200,
      layout: { background: { color: 'transparent' }, textColor: cv('--text-primary') || '#e5e7eb' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      timeScale: {
        timeVisible: config.timeVisible ?? true,
        secondsVisible: config.secondsVisible ?? false,
        borderColor: 'rgba(255,255,255,0.1)',
        ...(config.tickMarkFormatter ? { tickMarkFormatter: config.tickMarkFormatter } : {}),
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    const toTime = config.toTime;

    let series: ISeriesApi<SeriesType>;
    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      series.setData(bars.map((b) => ({ time: toTime(b), open: b.o, high: b.h, low: b.l, close: b.c })));
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#22c55e',
        topColor: '#22c55e55',
        bottomColor: '#22c55e00',
        lineWidth: 2,
      });
      series.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    } else {
      series = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2 });
      series.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    }

    chart.timeScale().fitContent();

    // Add extra series (e.g. peer overlays)
    const extraCleanups = config.extraSeries?.(chart, toTime) ?? [];

    chartRef.current = { chart, series };

    const el = containerRef.current;
    let disposed = false;
    const ro = new ResizeObserver(() => {
      if (!disposed && containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(el);

    return () => {
      extraCleanups.forEach((fn) => fn());
      disposed = true;
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartType]);

  return chartRef;
}
