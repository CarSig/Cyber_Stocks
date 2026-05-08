import { useEffect, useRef } from "react";
import "./charts.css";
import { createChart, CandlestickSeries } from "lightweight-charts";

export default function CandlestickChart({ quotes }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: {
        vertLines: { color: cv("--surface-3") },
        horzLines: { color: cv("--surface-3") },
      },
      timeScale: { timeVisible: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: cv("--candle-up"),
      downColor: cv("--candle-down"),
      borderVisible: false,
      wickUpColor: cv("--candle-up"),
      wickDownColor: cv("--candle-down"),
    });

    const seen = new Set();
    const data = quotes
      .filter((q) => q.open && q.high && q.low && q.close)
      .map((q) => ({ time: new Date(q.date).toISOString().slice(0, 10), open: q.open, high: q.high, low: q.low, close: q.close }))
      .sort((a, b) => (a.time < b.time ? -1 : 1))
      .filter((q) => { if (seen.has(q.time)) return false; seen.add(q.time); return true; });

    series.setData(data);
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [quotes]);

  return <div ref={containerRef} className="chart-container" />;
}
