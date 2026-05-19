import { useEffect, useRef, useState } from 'react';
import './charts.css';
import { createChart, LineSeries, createSeriesMarkers, type IChartApi } from 'lightweight-charts';
import DatePicker from '@/components/atoms/DatePicker';
import { cssVar, makeChartOptions } from './utils/theme';
import { daysAgoString, todayString } from './utils/dates';
import { toSortedClose } from './utils/series';
import { buildMarkers } from './utils/markers';
import { attachResizeObserver } from './utils/chartSetup';
import PeriodButtons from '@/components/molecules/shared/PeriodButtons';
import ChartToggleButton from '@/components/atoms/ChartToggleButton';
import ChartSep from '@/components/atoms/ChartSep';
import type { Quote } from '@/types';
import type { QuoteAnalysis } from './utils/types';

const COLOR_VARS = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
  '--series-8',
  '--series-9',
  '--series-10',
];
const COLORS = COLOR_VARS.map(cssVar);

type SeriesEntry = { ticker: string; quotes: Quote[]; analysis?: QuoteAnalysis };

type MultiChartProps = {
  series: SeriesEntry[];
  rangeFrom?: string | null;
  rangeTo?: string | null;
  onRangeChange?: (from: string | null, to: string | null) => void;
};

export default function MultiChart({ series, rangeFrom, rangeTo, onRangeChange }: MultiChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const skipRangeRef = useRef(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activePeriod, setActivePeriod] = useState<number | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (rangeFrom && rangeTo) {
      chartRef.current.timeScale().setVisibleRange({
        from: rangeFrom as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]['from'],
        to: rangeTo as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]['to'],
      });
    } else {
      chartRef.current.timeScale().fitContent();
    }
    setTimeout(() => {
      skipRangeRef.current = false;
    }, 150);
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    if (!series.length || !containerRef.current) return;

    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current));
    chartRef.current = chart;

    series.forEach(({ quotes, analysis }, i) => {
      const color = COLORS[i % COLORS.length];
      const s = chart.addSeries(LineSeries, { color, lineWidth: 2 });
      s.setData(toSortedClose(quotes));
      if (showAnalysis && analysis) createSeriesMarkers(s, buildMarkers(analysis, color));
    });

    skipRangeRef.current = true;
    if (rangeFrom && rangeTo) {
      chart.timeScale().setVisibleRange({
        from: rangeFrom as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]['from'],
        to: rangeTo as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]['to'],
      });
    } else {
      chart.timeScale().fitContent();
    }

    const rangeTimer = setTimeout(() => {
      skipRangeRef.current = false;
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
        setActivePeriod(null);
        onRangeChange?.(String(range.from), String(range.to));
      });
    }, 150);

    const disposedRef = { current: false };
    const observer = attachResizeObserver(chart, containerRef, disposedRef);

    return () => {
      clearTimeout(rangeTimer);
      disposedRef.current = true;
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [series, showAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePeriodClick(days: number | null) {
    setActivePeriod(days);
    if (days === null) {
      const allDates = series.flatMap(({ quotes }) =>
        quotes.filter((q) => q.close).map((q) => new Date(q.date).toISOString().slice(0, 10)),
      );
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
        <DatePicker value={rangeFrom ?? ''} placeholder="From" onChange={(v) => onRangeChange?.(v, rangeTo ?? null)} />
        <DatePicker value={rangeTo ?? ''} placeholder="To" onChange={(v) => onRangeChange?.(rangeFrom ?? null, v)} />
        {(rangeFrom || rangeTo) && (
          <ChartToggleButton onClick={() => onRangeChange?.(null, null)}>Clear</ChartToggleButton>
        )}
        <ChartSep />
        {series.map(({ ticker }, i) => (
          <span key={ticker} style={{ color: COLORS[i % COLORS.length] }} className="chart-series-label">
            ● {ticker}
          </span>
        ))}
        <ChartToggleButton active={showAnalysis} onClick={() => setShowAnalysis((v) => !v)} className="ml-auto">
          {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
        </ChartToggleButton>
      </div>
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
