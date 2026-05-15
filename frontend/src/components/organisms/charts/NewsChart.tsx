import { useEffect, useRef, useState } from 'react';
import './charts.css';
import { createChart, HistogramSeries, type IChartApi } from 'lightweight-charts';
import { makeChartOptions } from './utils/theme';
import { sentimentScoreStyle } from './utils/colors';
import { daysAgoString, todayString } from './utils/dates';
import { sentimentToColor } from './utils/colors';
import { attachResizeObserver, subscribeRangeChange, applyRange } from './utils/chartSetup';
import { useSyncRef } from '@/hooks/charts/useOverlayRefs';
import ModalItem from '@/components/atoms/ModalItem';
import ChartModal from './ChartModal';
import type { NewsArticle, NewsAnalysisMap } from '@/types';

type QuoteBounds = { from: string; to: string } | null;

type ModalState = { date: string; items: NewsArticle[] };

function aggregateByDay(
  articles: NewsArticle[] | undefined,
  analysis: NewsAnalysisMap | undefined,
  quoteBounds: QuoteBounds,
) {
  const byDay = new Map<string, { sum: number; count: number }>();
  const seen = new Set<string>();
  for (const a of articles ?? []) {
    if (!a.providerPublishTime || !a.link || seen.has(a.link)) continue;
    seen.add(a.link);
    const score = analysis?.[a.link]?.sentiment ?? null;
    if (score === null) continue;
    const ts = a.providerPublishTime;
    const day = new Date(
      typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
    )
      .toISOString()
      .slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { sum: 0, count: 0 });
    const d = byDay.get(day)!;
    d.sum += score;
    d.count++;
  }
  const sorted = [...byDay.entries()].sort();
  const countData: { time: string; value: number; color: string }[] = [];

  const rangeFrom =
    quoteBounds?.from && (!sorted.length || quoteBounds.from < sorted[0][0]) ? quoteBounds.from : sorted[0]?.[0];
  const rangeTo =
    quoteBounds?.to && (!sorted.length || quoteBounds.to > sorted[sorted.length - 1]?.[0])
      ? quoteBounds.to
      : sorted[sorted.length - 1]?.[0];

  if (!rangeFrom) return countData;

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

  return countData;
}

type NewsChartProps = {
  articles?: NewsArticle[];
  analysis?: NewsAnalysisMap;
  period?: number | null;
  onPeriodChange?: (days: number) => void;
  visibleRange?: { from: string; to: string } | null;
  onRangeChange?: (range: { from: string; to: string }) => void;
  quoteBounds?: QuoteBounds;
};

export default function NewsChart({
  articles,
  analysis,
  period,
  onPeriodChange,
  visibleRange,
  onRangeChange,
  quoteBounds,
}: NewsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);
  const [modal, setModal] = useState<ModalState | null>(null);

  const articlesRef = useSyncRef(articles);
  const analysisRef = useSyncRef(analysis);

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

    const countData = aggregateByDay(articles, analysis, quoteBounds ?? null);

    if (countData.length) {
      const series = chart.addSeries(HistogramSeries, { priceScaleId: 'right' });
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
      series.setData(countData as Parameters<typeof series.setData>[0]);
    }

    chart.subscribeClick((param) => {
      if (!param.time) return;
      const date =
        typeof param.time === 'string' ? param.time : new Date(Number(param.time) * 1000).toISOString().slice(0, 10);
      const items = (articlesRef.current ?? []).filter((a) => {
        if (!a.providerPublishTime || !a.link) return false;
        const ts = a.providerPublishTime;
        const d = new Date(
          typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
        )
          .toISOString()
          .slice(0, 10);
        return d === date && (analysisRef.current?.[a.link]?.sentiment ?? null) !== null;
      });
      if (items.length) setModal({ date, items });
    });

    if (countData.length > 0) {
      skipRangeRef.current = true;
      if (visibleRangeRef.current) {
        try {
          chart
            .timeScale()
            .setVisibleRange(
              visibleRangeRef.current as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0],
            );
        } catch {
          chart.timeScale().fitContent();
        }
      } else if (periodRef.current === null) {
        chart.timeScale().fitContent();
      } else {
        try {
          chart
            .timeScale()
            .setVisibleRange({ from: daysAgoString(periodRef.current!), to: todayString() } as Parameters<
              ReturnType<IChartApi['timeScale']>['setVisibleRange']
            >[0]);
        } catch {
          chart.timeScale().fitContent();
        }
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
  }, [articles, analysis, quoteBounds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current) return;
    applyRange(chartRef.current, skipRangeRef, { period: period ?? null, visibleRange: visibleRange ?? null });
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
            const score = analysis?.[a.link]?.sentiment ?? null;
            const { color, icon } = sentimentScoreStyle(score);
            return (
              <ModalItem
                key={a.link}
                href={a.link}
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
