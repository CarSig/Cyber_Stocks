import { useEffect, useRef, useState } from 'react';
import './charts.css';
import { createChart, HistogramSeries } from 'lightweight-charts';
import { makeChartOptions } from './utils/theme.js';
import { sentimentToColor, sentimentScoreStyle } from './utils/colors.js';
import { attachResizeObserver, subscribeRangeChange, applyRange } from './utils/chartSetup.js';
import { daysAgoString, todayString } from './utils/dates.js';
import { useSyncRef } from '@/hooks/charts/useOverlayRefs.js';
import ModalItem from '@/components/atoms/ModalItem.jsx';
import ChartModal from './ChartModal.jsx';

// articles: BackendArticleResponse[] — each has timestamp, link, publisher, entities[].sentiment
// entityId: the company slug to pick the right entity sentiment from multi-entity articles
function aggregateByDay(articles, entityId, quoteBounds) {
  const byDay = new Map();
  const articlesByDay = new Map();

  for (const a of articles ?? []) {
    if (!a.timestamp) continue;
    const day = new Date(a.timestamp).toISOString().slice(0, 10);

    const match = a.entities?.find((e) => e.entityId === entityId);
    const avgSentiment = a.entities?.length ? a.entities.reduce((s, e) => s + e.sentiment, 0) / a.entities.length : 0;
    const sentiment = match?.sentiment ?? avgSentiment;

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
  const { from: boundsFrom, to: boundsTo } = quoteBounds ?? {};
  const firstDay = sorted[0]?.[0];
  const lastDay = sorted[sorted.length - 1]?.[0];

  const rangeFrom = boundsFrom && (!sorted.length || boundsFrom < firstDay) ? boundsFrom : firstDay;
  const rangeTo = boundsTo && (!sorted.length || boundsTo > lastDay) ? boundsTo : lastDay;

  if (!rangeFrom) return { countData, articlesByDay };

  const cursor = new Date(rangeFrom);
  const end = new Date(rangeTo);
  while (cursor <= end) {
    const time = cursor.toISOString().slice(0, 10);
    const d = byDay.get(time);
    if (d) {
      countData.push({ time, value: d.count, color: sentimentToColor(d.sum / d.count) });
    } else {
      countData.push({ time, value: 0, color: 'transparent' });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { countData, articlesByDay };
}

export default function IntelligenceChart({
  articles,
  entityId,
  period,
  onPeriodChange,
  visibleRange,
  onRangeChange,
  quoteBounds,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);
  const [modal, setModal] = useState(null);

  const articlesRef = useSyncRef(articles);
  const entityIdRef = useSyncRef(entityId);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);
  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current, 180));
    chartRef.current = chart;

    const { countData } = aggregateByDay(articles, entityId, quoteBounds);

    if (countData.length) {
      const series = chart.addSeries(HistogramSeries, { priceScaleId: 'right' });
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
      series.setData(countData);
    }

    chart.subscribeClick((param) => {
      if (!param.time) return;
      const date = typeof param.time === 'string' ? param.time : new Date(param.time * 1000).toISOString().slice(0, 10);
      const { articlesByDay: abd } = aggregateByDay(articlesRef.current, entityIdRef.current);
      const items = abd.get(date) ?? [];
      if (items.length) setModal({ date, items });
    });

    skipRangeRef.current = true;
    if (visibleRangeRef.current) {
      try {
        chart.timeScale().setVisibleRange(visibleRangeRef.current);
      } catch {
        chart.timeScale().fitContent();
      }
    } else if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      try {
        chart.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current), to: todayString() });
      } catch {
        chart.timeScale().fitContent();
      }
    }

    const rangeTimer = subscribeRangeChange(chart, skipRangeRef, { onRangeChange, onPeriodChange });
    const observer = attachResizeObserver(chart, containerRef);

    return () => {
      clearTimeout(rangeTimer);
      chartRef.current = null;
      observer.disconnect();
      chart.remove();
    };
  }, [articles, entityId, quoteBounds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current) return;
    applyRange(chartRef.current, skipRangeRef, { period, visibleRange });
  }, [period, visibleRange]);

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-series-label" style={{ marginLeft: 8 }}>
          Bar height = article count · Color = avg sentiment
          <span
            style={{
              background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)',
              borderRadius: 3,
              display: 'inline-block',
              width: 80,
              height: 8,
              marginLeft: 6,
              verticalAlign: 'middle',
            }}
          />
        </span>
      </div>
      <div ref={containerRef} className="chart-container" />

      {modal && (
        <ChartModal date={modal.date} onClose={() => setModal(null)}>
          {modal.items.map((a) => {
            const score = a._sentiment;
            const { color, icon } = sentimentScoreStyle(score);
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
        </ChartModal>
      )}
    </div>
  );
}
