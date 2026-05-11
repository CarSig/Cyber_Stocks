import { useEffect, useRef, useState } from "react";
import "./charts.css";
import { createChart, LineSeries, AreaSeries } from "lightweight-charts";
import { daysAgoString, todayString } from "./chartUtils.js";
import ChartToggleButton from "../../atoms/ChartToggleButton.jsx";
import ChartSep from "../../atoms/ChartSep.jsx";

const CHART_TYPES = ["Line", "Area"];

// Historical Volatility: annualised rolling stddev of log returns (window days)
function calcHV(quotes, window = 20) {
  if (quotes.length < window + 1) return [];
  const result = [];
  for (let i = window; i < quotes.length; i++) {
    const slice = quotes.slice(i - window, i + 1);
    const logReturns = [];
    for (let j = 1; j < slice.length; j++) {
      if (slice[j - 1].close > 0 && slice[j].close > 0)
        logReturns.push(Math.log(slice[j].close / slice[j - 1].close));
    }
    if (!logReturns.length) continue;
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / logReturns.length;
    const hv = Math.sqrt(variance * 252) * 100; // annualised %
    result.push({ time: quotes[i].time, value: parseFloat(hv.toFixed(4)) });
  }
  return result;
}

// ATR: 14-day Average True Range as % of close
function calcATR(quotes, window = 14) {
  if (quotes.length < window + 1) return [];
  const trs = [];
  for (let i = 1; i < quotes.length; i++) {
    const high = quotes[i].high, low = quotes[i].low, prevClose = quotes[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const result = [];
  for (let i = window - 1; i < trs.length; i++) {
    const slice = trs.slice(i - window + 1, i + 1);
    const atr = slice.reduce((a, b) => a + b, 0) / window;
    const close = quotes[i + 1].close;
    if (close > 0) result.push({ time: quotes[i + 1].time, value: parseFloat(((atr / close) * 100).toFixed(4)) });
  }
  return result;
}

function toSorted(quotes) {
  const seen = new Set();
  return quotes
    .filter((q) => q.close && q.high && q.low)
    .map((q) => ({ time: new Date(q.date).toISOString().slice(0, 10), open: q.open, high: q.high, low: q.low, close: q.close }))
    .sort((a, b) => (a.time < b.time ? -1 : 1))
    .filter((q) => { if (seen.has(q.time)) return false; seen.add(q.time); return true; });
}

export default function VolatilityChart({ quotes, period, onPeriodChange, visibleRange, onRangeChange }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);
  const [type, setType] = useState("Line");
  const [showHV, setShowHV] = useState(true);
  const [showATR, setShowATR] = useState(true);

  useEffect(() => { periodRef.current = period; }, [period]);
  useEffect(() => { visibleRangeRef.current = visibleRange; }, [visibleRange]);

  useEffect(() => {
    if (!containerRef.current || !quotes?.length) return;
    const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 200,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
      timeScale: { timeVisible: true },
    });
    chartRef.current = chart;

    const sorted = toSorted(quotes);
    const SeriesType = type === "Area" ? AreaSeries : LineSeries;

    if (showHV) {
      const hvData = calcHV(sorted);
      if (hvData.length) {
        const hvSeries = chart.addSeries(SeriesType, { color: cv("--color-amber"), lineWidth: 2, title: "HV20%" });
        hvSeries.setData(hvData);
      }
    }

    if (showATR) {
      const atrData = calcATR(sorted);
      if (atrData.length) {
        const atrSeries = chart.addSeries(SeriesType, { color: cv("--color-red"), lineWidth: 2, title: "ATR14%" });
        atrSeries.setData(atrData);
      }
    }

    skipRangeRef.current = true;
    if (visibleRangeRef.current) {
      chart.timeScale().setVisibleRange(visibleRangeRef.current);
    } else if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current), to: todayString() });
    }

    const rangeTimer = setTimeout(() => {
      skipRangeRef.current = false;
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
        onRangeChange?.({ from: range.from, to: range.to });
        const days = Math.round((new Date(range.to) - new Date(range.from)) / 86400000);
        onPeriodChange?.(days);
      });
    }, 150);

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(rangeTimer);
      chartRef.current = null;
      observer.disconnect();
      chart.remove();
    };
  }, [quotes, type, showHV, showATR]);

  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (visibleRange) {
      chartRef.current.timeScale().setVisibleRange(visibleRange);
    } else if (period === null) {
      chartRef.current.timeScale().fitContent();
    } else {
      chartRef.current.timeScale().setVisibleRange({ from: daysAgoString(period), to: todayString() });
    }
    setTimeout(() => { skipRangeRef.current = false; }, 150);
  }, [period, visibleRange]);

  return (
    <div>
      <div className="chart-toolbar">
        {CHART_TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-chart${type === t ? " active" : ""}`}>
            {t}
          </button>
        ))}
        <ChartSep />
        <ChartToggleButton active={showHV} onClick={() => setShowHV((v) => !v)}>HV20</ChartToggleButton>
        <ChartToggleButton active={showATR} onClick={() => setShowATR((v) => !v)}>ATR14</ChartToggleButton>
        <span className="chart-series-label" style={{ color: "var(--color-amber)", marginLeft: 8 }}>— HV20%</span>
        <span className="chart-series-label" style={{ color: "var(--color-red)", marginLeft: 8 }}>— ATR14%</span>
      </div>
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
