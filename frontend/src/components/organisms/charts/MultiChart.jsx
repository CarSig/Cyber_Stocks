import { useEffect, useRef, useState } from "react";
import "./charts.css";
import { createChart, LineSeries, createSeriesMarkers } from "lightweight-charts";
import DatePicker from "../../atoms/DatePicker.jsx";
import { daysAgoString, todayString, toSortedClose } from "./chartUtils.js";
import { buildMarkers } from "./chartMarkers.js";
import PeriodButtons from "../../molecules/PeriodButtons.jsx";
import ChartToggleButton from "../../atoms/ChartToggleButton.jsx";
import ChartSep from "../../atoms/ChartSep.jsx";

const COLOR_VARS = ["--series-1","--series-2","--series-3","--series-4","--series-5","--series-6","--series-7","--series-8","--series-9","--series-10"];
const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const COLORS = COLOR_VARS.map(cv);


export default function MultiChart({ series, rangeFrom, rangeTo, onRangeChange }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const skipRangeRef = useRef(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activePeriod, setActivePeriod] = useState(null);

  // Sync external range changes to chart without recreating it
  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (rangeFrom && rangeTo) {
      chartRef.current.timeScale().setVisibleRange({ from: rangeFrom, to: rangeTo });
    } else {
      chartRef.current.timeScale().fitContent();
    }
    setTimeout(() => { skipRangeRef.current = false; }, 150);
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    if (!series.length) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
      timeScale: { timeVisible: true },
    });
    chartRef.current = chart;

    series.forEach(({ quotes, analysis }, i) => {
      const color = COLORS[i % COLORS.length];
      const s = chart.addSeries(LineSeries, { color, lineWidth: 2 });
      s.setData(toSortedClose(quotes));
      if (showAnalysis) createSeriesMarkers(s, buildMarkers(analysis, color));
    });

    skipRangeRef.current = true;
    if (rangeFrom && rangeTo) {
      chart.timeScale().setVisibleRange({ from: rangeFrom, to: rangeTo });
    } else {
      chart.timeScale().fitContent();
    }

    const rangeTimer = setTimeout(() => {
      skipRangeRef.current = false;
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
        setActivePeriod("custom");
        onRangeChange?.(range.from, range.to);
      });
    }, 150);

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(rangeTimer);
      chartRef.current = null;
      observer.disconnect();
      chart.remove();
    };
  }, [series, showAnalysis]);

  function handlePeriodClick(days) {
    setActivePeriod(days);
    if (days === null) {
      const allDates = series.flatMap(({ quotes }) => quotes.filter((q) => q.close).map((q) => new Date(q.date).toISOString().slice(0, 10)));
      const minDate = allDates.length ? allDates.reduce((a, b) => (a < b ? a : b)) : null;
      onRangeChange?.(minDate, todayString());
    } else {
      onRangeChange?.(daysAgoString(days), todayString());
    }
  }

  return (
    <div>
      <div className="chart-toolbar">
        <PeriodButtons activeDays={activePeriod} onSelect={handlePeriodClick} />
        <ChartSep />
        <DatePicker value={rangeFrom} placeholder="From" onChange={(v) => onRangeChange?.(v, rangeTo)} />
        <DatePicker value={rangeTo} placeholder="To" onChange={(v) => onRangeChange?.(rangeFrom, v)} />
        {(rangeFrom || rangeTo) && (
          <ChartToggleButton onClick={() => onRangeChange?.(null, null)}>Clear</ChartToggleButton>
        )}
        <ChartSep />
        {series.map(({ ticker }, i) => (
          <span key={ticker} style={{ color: COLORS[i % COLORS.length] }} className="chart-series-label">● {ticker}</span>
        ))}
        <ChartToggleButton active={showAnalysis} onClick={() => setShowAnalysis((v) => !v)} className="ml-auto">
          {showAnalysis ? "Hide Analysis" : "Show Analysis"}
        </ChartToggleButton>
      </div>
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
