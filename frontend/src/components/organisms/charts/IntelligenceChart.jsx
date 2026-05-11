import { useEffect, useRef, useState } from "react";
import "./charts.css";
import { createChart, HistogramSeries } from "lightweight-charts";
import { daysAgoString, todayString } from "./chartUtils.js";
import ModalItem from "../../atoms/ModalItem.jsx";

function sentimentToColor(score) {
  const clamped = Math.max(-1, Math.min(1, score));
  const RED   = [239, 68,  68];
  const AMBER = [234, 179,  8];
  const GREEN = [ 34, 197, 94];
  const [from, to, t] = clamped < 0
    ? [RED,   AMBER, clamped + 1]
    : [AMBER, GREEN, clamped];
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

// articles: BackendArticleResponse[] — each has timestamp, link, publisher, entities[].sentiment
// entityId: the company slug to pick the right entity sentiment from multi-entity articles
function aggregateByDay(articles, entityId, quoteBounds) {
  const byDay = new Map();
  const articlesByDay = new Map();

  for (const a of articles ?? []) {
    if (!a.timestamp) continue;
    const day = new Date(a.timestamp).toISOString().slice(0, 10);

    const match = a.entities?.find((e) => e.entityId === entityId);
    const sentiment = match
      ? match.sentiment
      : a.entities?.length
        ? a.entities.reduce((s, e) => s + e.sentiment, 0) / a.entities.length
        : 0;

    if (!byDay.has(day)) {
      byDay.set(day, { sum: 0, count: 0 });
      articlesByDay.set(day, []);
    }
    const d = byDay.get(day);
    d.sum += sentiment;
    d.count++;
    articlesByDay.get(day).push({ ...a, _sentiment: sentiment });
  }

  const sorted = [...byDay.entries()].sort();
  const countData = [];

  const rangeFrom = quoteBounds?.from && (!sorted.length || quoteBounds.from < sorted[0][0]) ? quoteBounds.from : sorted[0]?.[0];
  const rangeTo   = quoteBounds?.to   && (!sorted.length || quoteBounds.to   > sorted[sorted.length - 1]?.[0]) ? quoteBounds.to : sorted[sorted.length - 1]?.[0];

  if (!rangeFrom) return { countData, articlesByDay };

  const cursor = new Date(rangeFrom);
  const end = new Date(rangeTo);
  while (cursor <= end) {
    const time = cursor.toISOString().slice(0, 10);
    const d = byDay.get(time);
    if (d) {
      countData.push({ time, value: d.count, color: sentimentToColor(d.sum / d.count) });
    } else {
      countData.push({ time, value: 0, color: "transparent" });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { countData, articlesByDay };
}

function useSyncRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

export default function IntelligenceChart({ articles, entityId, period, onPeriodChange, visibleRange, onRangeChange, quoteBounds }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);
  const [modal, setModal] = useState(null);

  const articlesRef = useSyncRef(articles);
  const entityIdRef = useSyncRef(entityId);

  useEffect(() => { periodRef.current = period; }, [period]);
  useEffect(() => { visibleRangeRef.current = visibleRange; }, [visibleRange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 180,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
      timeScale: { timeVisible: true },
    });
    chartRef.current = chart;

    const { countData } = aggregateByDay(articles, entityId, quoteBounds);

    if (countData.length) {
      const series = chart.addSeries(HistogramSeries, { priceScaleId: "right" });
      chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
      series.setData(countData);
    }

    chart.subscribeClick((param) => {
      if (!param.time) return;
      const date = typeof param.time === "string" ? param.time : new Date(param.time * 1000).toISOString().slice(0, 10);
      const { articlesByDay: abd } = aggregateByDay(articlesRef.current, entityIdRef.current);
      const items = abd.get(date) ?? [];
      if (items.length) setModal({ date, items });
    });

    skipRangeRef.current = true;
    if (visibleRangeRef.current) {
      try { chart.timeScale().setVisibleRange(visibleRangeRef.current); } catch { chart.timeScale().fitContent(); }
    } else if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      try { chart.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current), to: todayString() }); } catch { chart.timeScale().fitContent(); }
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
  }, [articles, entityId, quoteBounds]);

  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (visibleRange) {
      try { chartRef.current.timeScale().setVisibleRange(visibleRange); } catch { chartRef.current.timeScale().fitContent(); }
    } else if (period === null) {
      chartRef.current.timeScale().fitContent();
    } else {
      try { chartRef.current.timeScale().setVisibleRange({ from: daysAgoString(period), to: todayString() }); } catch { chartRef.current.timeScale().fitContent(); }
    }
    setTimeout(() => { skipRangeRef.current = false; }, 150);
  }, [period, visibleRange]);

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
                const score = a._sentiment;
                const color = score >= 0.1 ? "var(--color-green)" : score <= -0.1 ? "var(--color-red)" : "var(--color-amber)";
                const icon = score >= 0.1 ? "▲" : score <= -0.1 ? "▼" : "●";
                return (
                  <ModalItem
                    key={a.id}
                    href={a.link || undefined}
                    icon={icon}
                    iconColor={color}
                    title={a.id}
                    subtitle={a.publisher}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
