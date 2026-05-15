import { useEffect, useRef } from 'react';
import './charts.css';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { cssVar, makeChartOptions } from './utils/theme.js';
import { toSortedOHLC } from './utils/series.js';
import { attachResizeObserver } from './utils/chartSetup.js';

export default function CandlestickChart({ quotes }) {
  const containerRef = useRef(null);

  useEffect(() => {
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
