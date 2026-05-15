import { useEffect, useRef } from 'react';
import './charts.css';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { cssVar, makeChartOptions } from './utils/theme';
import { toSortedOHLC } from './utils/series';
import { attachResizeObserver } from './utils/chartSetup';
import type { Quote } from '@/types';

type CandlestickChartProps = { quotes: Quote[] };

export default function CandlestickChart({ quotes }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current));

    const series = chart.addSeries(CandlestickSeries, {
      upColor: cssVar('--candle-up'),
      downColor: cssVar('--candle-down'),
      borderVisible: false,
      wickUpColor: cssVar('--candle-up'),
      wickDownColor: cssVar('--candle-down'),
    });

    series.setData(toSortedOHLC(quotes));
    chart.timeScale().fitContent();

    const observer = attachResizeObserver(chart, containerRef);
    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [quotes]);

  return <div ref={containerRef} className="chart-container" />;
}
