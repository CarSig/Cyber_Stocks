import { useEffect, useRef } from 'react';
import './charts.css';
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import type { ISeriesApi, SeriesType } from 'lightweight-charts';
import { getTzOffsetSeconds, toTzTime } from './utils/dates';
import { COMPARE_COLORS } from './utils/options';
import { useTimezone } from '@/context/TimezoneContext';
import type { AlpacaBar } from '@/types';

type ChartWithSeriesRefs = {
  _seriesRefs?: ISeriesApi<SeriesType>[];
};

function addSeries(chart: ReturnType<typeof createChart>, chartType: string): ISeriesApi<SeriesType> {
  if (chartType === 'Line') {
    return chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
  }
  if (chartType === 'Area') {
    return chart.addSeries(AreaSeries, {
      lineColor: '#3b82f6',
      topColor: 'rgba(59,130,246,0.3)',
      bottomColor: 'rgba(59,130,246,0)',
    });
  }
  return chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderUpColor: '#22c55e',
    borderDownColor: '#ef4444',
    wickUpColor: '#22c55e',
    wickDownColor: '#ef4444',
  });
}

function buildSeriesData(bars: AlpacaBar[], tzOffsetSeconds: number) {
  return bars.map((b) => ({
    time: toTzTime(b.t, tzOffsetSeconds) as unknown as import('lightweight-charts').Time,
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    value: b.c,
  }));
}

export type CompareBarsEntry = { ticker: string; bars: AlpacaBar[] };

export type IntradayChartProps = {
  bars: AlpacaBar[];
  compareBars: CompareBarsEntry[];
  chartType: string;
};

export default function IntradayChart({ bars, compareBars, chartType }: IntradayChartProps) {
  const { timezone } = useTimezone();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: 'var(--foreground, #e5e7eb)' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.1)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    let disposed = false;
    const ro = new ResizeObserver(() => {
      if (!disposed && containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      disposed = true;
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !bars?.length) return;

    chart.applyOptions({});
    const chartWithRefs = chart as unknown as ChartWithSeriesRefs;
    if (chartWithRefs._seriesRefs) {
      chartWithRefs._seriesRefs.forEach((s) => {
        try {
          chart.removeSeries(s);
        } catch {}
      });
    }
    chartWithRefs._seriesRefs = [];

    const tzOffset = getTzOffsetSeconds(timezone, new Date(bars[0].t));
    const mainSeries = addSeries(chart, chartType);
    mainSeries.setData(buildSeriesData(bars, tzOffset) as Parameters<typeof mainSeries.setData>[0]);
    chartWithRefs._seriesRefs.push(mainSeries);

    compareBars.forEach(({ ticker: cTicker, bars: cBars }, i) => {
      if (!cBars?.length) return;
      const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
      const scaleId = `compare_${i}`;
      const cSeries = chart.addSeries(LineSeries, { color, lineWidth: 2, priceScaleId: scaleId });
      chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      const cTzOffset = getTzOffsetSeconds(timezone, new Date(cBars[0].t));
      cSeries.setData(
        cBars.map((b) => ({
          time: toTzTime(b.t, cTzOffset) as unknown as import('lightweight-charts').Time,
          value: b.c,
        })),
      );
      cSeries.applyOptions({ title: cTicker });
      chartWithRefs._seriesRefs!.push(cSeries);
    });

    chart.timeScale().fitContent();
  }, [bars, compareBars, timezone, chartType]);

  return <div ref={containerRef} className="alpaca-chart-container" />;
}
