import { useEffect, useRef, useState } from 'react';
import './charts.css';
import { createChart, HistogramSeries, type IChartApi } from 'lightweight-charts';
import { makeChartOptions } from './utils/theme';
import { sentimentToColor, sentimentScoreStyle } from './utils/colors';
import { attachResizeObserver, subscribeRangeChange, applyRange } from './utils/chartSetup';
import { daysAgoString, todayString } from './utils/dates';
import { useSyncRef } from '@/hooks/charts/useOverlayRefs';
import ModalItem from '@/components/atoms/ModalItem';
import ChartModal from './ChartModal';
import type { NewsArticle } from '@/types';

type QuoteBounds = { from: string; to: string } | null;
type ModalState = { date: string; items: { article: NewsArticle; sentiment: number | null }[] };

type SentimentHistogramChartProps = {
  articles?: NewsArticle[];
  getSentiment: (article: NewsArticle) => number | null;
  getDate: (article: NewsArticle) => string | null;
  period?: number | null;
  onPeriodChange?: (days: number) => void;
  visibleRange?: { from: string; to: string } | null;
  onRangeChange?: (range: { from: string; to: string }) => void;
  quoteBounds?: QuoteBounds;
};

function aggregateByDay(
  articles: NewsArticle[] | undefined,
  getSentiment: (a: NewsArticle) => number | null,
  getDate: (a: NewsArticle) => string | null,
  quoteBounds: QuoteBounds,
) {
  const byDay = new Map<string, { sum: number; count: number }>();
  const articlesByDay = new Map<string, { article: NewsArticle; sentiment: number | null }[]>();

  for (const a of articles ?? []) {
    const dateStr = getDate(a);
    if (!dateStr) continue;
    const day = new Date(dateStr).toISOString().slice(0, 10);
    const sentiment = getSentiment(a);
    if (sentiment === null) continue;

    if (!byDay.has(day)) {
      byDay.set(day, { sum: 0, count: 0 });
      articlesByDay.set(day, []);
    }
    byDay.get(day)!.sum += sentiment;
    byDay.get(day)!.count++;
    articlesByDay.get(day)!.push({ article: a, sentiment });
  }

  const sorted = [...byDay.entries()].sort();
  const countData: { time: string; value: number; color: string }[] = [];

  const rangeFrom =
    quoteBounds?.from && (!sorted.length || quoteBounds.from < sorted[0][0]) ? quoteBounds.from : sorted[0]?.[0];
  const rangeTo =
    quoteBounds?.to && (!sorted.length || quoteBounds.to > sorted[sorted.length - 1]?.[0])
      ? quoteBounds.to
      : sorted[sorted.length - 1]?.[0];

  if (!rangeFrom) return { countData, articlesByDay };

  const cursor = new Date(rangeFrom);
  const end = new Date(rangeTo!);
  while (cursor <= end) {
    const time = cursor.toISOString().slice(0, 10);
    const d = byDay.get(time);
    countData.push(d ? { time, value: d.count, color: sentimentToColor(d.sum / d.count) } : { time, value: 0, color: 'transparent' });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { countData, articlesByDay };
}

export default function SentimentHistogramChart({
  articles,
  getSentiment,
  getDate,
  period,
  onPeriodChange,
  visibleRange,
  onRangeChange,
  quoteBounds,
}: SentimentHistogramChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);
  const [modal, setModal] = useState<ModalState | null>(null);

  const articlesRef = useSyncRef(articles);
  const getSentimentRef = useSyncRef(getSentiment);
  const getDateRef = useSyncRef(getDate);

  useEffect(() => { periodRef.current = period; }, [period]);
  useEffect(() => { visibleRangeRef.current = visibleRange; }, [visibleRange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current, 180));
    chartRef.current = chart;

    const { countData } = aggregateByDay(articles, getSentiment, getDate, quoteBounds ?? null);

    if (countData.length) {
      const series = chart.addSeries(HistogramSeries, { priceScaleId: 'right' });
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
      series.setData(countData as Parameters<typeof series.setData>[0]);
    }

    chart.subscribeClick((param) => {
      if (!param.time) return;
      const date =
        typeof param.time === 'string' ? param.time : new Date(Number(param.time) * 1000).toISOString().slice(0, 10);
      const { articlesByDay } = aggregateByDay(articlesRef.current, getSentimentRef.current, getDateRef.current, null);
      const items = articlesByDay.get(date) ?? [];
      if (items.length) setModal({ date, items });
    });

    skipRangeRef.current = true;
    if (visibleRangeRef.current) {
      try {
        chart.timeScale().setVisibleRange(visibleRangeRef.current as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]);
      } catch {
        chart.timeScale().fitContent();
      }
    } else if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      try {
        chart.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current!), to: todayString() } as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]);
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
  }, [articles, getSentiment, getDate, quoteBounds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current) return;
    applyRange(chartRef.current, skipRangeRef, { period: period ?? null, visibleRange: visibleRange ?? null });
  }, [period, visibleRange]);

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-series-label chart-series-label-ml">
          Bar height = article count · Color = avg sentiment
          <span className="sentiment-gradient-legend" />
        </span>
      </div>
      <div ref={containerRef} className="chart-container" />

      {modal && (
        <ChartModal date={modal.date} onClose={() => setModal(null)}>
          {modal.items.map(({ article: a, sentiment }) => {
            const { color, icon } = sentimentScoreStyle(sentiment);
            return (
              <ModalItem
                key={a.link}
                href={a.link || undefined}
                icon={icon}
                iconColor={color}
                title={a.title}
                subtitle={a.publisher}
              />
            );
          })}
        </ChartModal>
      )}
    </div>
  );
}
