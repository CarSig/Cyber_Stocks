import { useEffect, useRef, useState } from "react";
import "./charts.css";
import { createChart, HistogramSeries } from "lightweight-charts";
import { daysAgoString, todayString } from "./chartUtils.js";
import ModalItem from "../../atoms/ModalItem.jsx";

// Interpolates red→amber→green across -1..+1
function sentimentToColor(score) {
  const clamped = Math.max(-1, Math.min(1, score));
  const RED   = [239, 68,  68];
  const AMBER = [234, 179,  8];
  const GREEN = [ 34, 197, 94];
  const [from, to, t] = clamped < 0
    ? [RED,   AMBER, clamped + 1]   // -1..0 → RED..AMBER
    : [AMBER, GREEN, clamped];       //  0..1 → AMBER..GREEN
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function aggregateByDay(articles, analysis) {
  const byDay = new Map();
  const seen = new Set();
  for (const a of articles ?? []) {
    if (!a.providerPublishTime || !a.link || seen.has(a.link)) continue;
    seen.add(a.link);
    const score = analysis?.[a.link]?.sentiment ?? null;
    if (score === null) continue;
    const ts = a.providerPublishTime;
    const day = new Date(
      typeof ts === "number" || (typeof ts === "string" && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts
    ).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { sum: 0, count: 0 });
    const d = byDay.get(day);
    d.sum += score;
    d.count++;
  }
  const sorted = [...byDay.entries()].sort();
  const countData = [];

  for (let i = 0; i < sorted.length; i++) {
    const [time, { sum, count }] = sorted[i];
    if (i > 0) {
      const prev = new Date(sorted[i - 1][0]);
      const curr = new Date(time);
      const cursor = new Date(prev);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      while (cursor < curr) {
        countData.push({ time: cursor.toISOString().slice(0, 10), value: 0, color: "transparent" });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    countData.push({ time, value: count, color: sentimentToColor(sum / count) });
  }

  return countData;
}

function useSyncRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

export default function NewsChart({ articles, analysis, period, onPeriodChange }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const [modal, setModal] = useState(null);

  const articlesRef = useSyncRef(articles);
  const analysisRef = useSyncRef(analysis);

  useEffect(() => { periodRef.current = period; }, [period]);

  useEffect(() => {
    if (!containerRef.current) return;
    const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 180,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
      timeScale: { timeVisible: true },
      leftPriceScale: { visible: true },
      rightPriceScale: { visible: false },
    });
    chartRef.current = chart;

    const countData = aggregateByDay(articles, analysis);

    if (countData.length) {
      const series = chart.addSeries(HistogramSeries, { priceScaleId: "left" });
      chart.priceScale("left").applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
      series.setData(countData);
    }

    chart.subscribeClick((param) => {
      if (!param.time) return;
      const date = typeof param.time === "string" ? param.time : new Date(param.time * 1000).toISOString().slice(0, 10);
      const items = (articlesRef.current ?? []).filter((a) => {
        if (!a.providerPublishTime || !a.link) return false;
        const ts = a.providerPublishTime;
        const d = new Date(
          typeof ts === "number" || (typeof ts === "string" && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts
        ).toISOString().slice(0, 10);
        return d === date && (analysisRef.current?.[a.link]?.sentiment ?? null) !== null;
      });
      if (items.length) setModal({ date, items });
    });

    skipRangeRef.current = true;
    if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current), to: todayString() });
    }

    const rangeTimer = setTimeout(() => {
      skipRangeRef.current = false;
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
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
  }, [articles, analysis]);

  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (period === null) {
      chartRef.current.timeScale().fitContent();
    } else {
      chartRef.current.timeScale().setVisibleRange({ from: daysAgoString(period), to: todayString() });
    }
    setTimeout(() => { skipRangeRef.current = false; }, 150);
  }, [period]);

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-series-label" style={{ marginLeft: 8 }}>
          Bar height = article count · Color = avg sentiment
          <span style={{ background: "linear-gradient(to right, #ef4444, #eab308, #22c55e)", borderRadius: 3, display: "inline-block", width: 80, height: 8, marginLeft: 6, verticalAlign: "middle" }} />
        </span>
      </div>
      <div ref={containerRef} className="chart-container" />

      {modal && (
        <div className="news-modal-overlay" onClick={() => setModal(null)}>
          <div className="news-modal" onClick={(e) => e.stopPropagation()}>
            <div className="news-modal-header">
              <span className="news-modal-date">{modal.date}</span>
              <button className="news-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="news-modal-list">
              {modal.items.map((a) => {
                const score = analysis?.[a.link]?.sentiment ?? null;
                const color = score === null ? "var(--text-muted)" : score >= 0.1 ? "var(--color-green)" : score <= -0.1 ? "var(--color-red)" : "var(--color-amber)";
                const icon = score === null ? "?" : score >= 0.1 ? "▲" : score <= -0.1 ? "▼" : "●";
                return <ModalItem key={a.link} href={a.link} icon={icon} iconColor={color} title={a.title} subtitle={a.publisher} />;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
