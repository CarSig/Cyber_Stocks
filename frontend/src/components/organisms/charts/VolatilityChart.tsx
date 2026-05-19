import { useEffect, useRef, useState } from 'react';
import './charts.css';
import { createChart, LineSeries, AreaSeries, type IChartApi } from 'lightweight-charts';
import { cssVar, makeChartOptions } from './utils/theme';
import { toSortedOHLC, calcHV, calcATR } from './utils/series';
import { daysAgoString, todayString } from './utils/dates';
import { CHART_TYPES } from './utils/options';
import { attachResizeObserver, subscribeRangeChange, applyRange } from './utils/chartSetup';
import ChartToggleButton from '@/components/atoms/ChartToggleButton';
import ChartSep from '@/components/atoms/ChartSep';
import type { Quote } from '@/types';

type VolatilityChartProps = {
  quotes: Quote[];
  period?: number | null;
  onPeriodChange?: (days: number) => void;
  visibleRange?: { from: string; to: string } | null;
  onRangeChange?: (range: { from: string; to: string }) => void;
};

export default function VolatilityChart({
  quotes,
  period,
  onPeriodChange,
  visibleRange,
  onRangeChange,
}: VolatilityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);
  const [type, setType] = useState('Line');
  const [showHV, setShowHV] = useState(true);
  const [showATR, setShowATR] = useState(true);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);
  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);

  useEffect(() => {
    if (!containerRef.current || !quotes?.length) return;

    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current, 200));
    chartRef.current = chart;

    const sorted = toSortedOHLC(quotes);
    const SeriesType = type === 'Area' ? AreaSeries : LineSeries;

    if (showHV) {
      const hvData = calcHV(sorted);
      if (hvData.length) {
        const hvSeries = chart.addSeries(SeriesType, { color: cssVar('--color-amber'), lineWidth: 2, title: 'HV20%' });
        hvSeries.setData(hvData as Parameters<typeof hvSeries.setData>[0]);
      }
    }

    if (showATR) {
      const atrData = calcATR(sorted);
      if (atrData.length) {
        const atrSeries = chart.addSeries(SeriesType, { color: cssVar('--color-red'), lineWidth: 2, title: 'ATR14%' });
        atrSeries.setData(atrData as Parameters<typeof atrSeries.setData>[0]);
      }
    }

    skipRangeRef.current = true;
    if (visibleRangeRef.current) {
      chart
        .timeScale()
        .setVisibleRange(
          visibleRangeRef.current as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0],
        );
    } else if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      chart
        .timeScale()
        .setVisibleRange({ from: daysAgoString(periodRef.current!), to: todayString() } as Parameters<
          ReturnType<IChartApi['timeScale']>['setVisibleRange']
        >[0]);
    }

    const rangeTimer = subscribeRangeChange(chart, skipRangeRef, { onRangeChange, onPeriodChange });
    const disposedRef = { current: false };
    const observer = attachResizeObserver(chart, containerRef, disposedRef);

    return () => {
      clearTimeout(rangeTimer);
      disposedRef.current = true;
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [quotes, type, showHV, showATR]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current) return;
    applyRange(chartRef.current, skipRangeRef, { period: period ?? null, visibleRange: visibleRange ?? null });
  }, [period, visibleRange]);

  return (
    <div>
      <div className="chart-toolbar">
        {CHART_TYPES.Volatility.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-chart${type === t ? ' active' : ''}`}>
            {t}
          </button>
        ))}
        <ChartSep />
        <ChartToggleButton active={showHV} onClick={() => setShowHV((v) => !v)}>
          HV20
        </ChartToggleButton>
        <ChartToggleButton active={showATR} onClick={() => setShowATR((v) => !v)}>
          ATR14
        </ChartToggleButton>
        <span className="chart-series-label chart-series-label-ml" style={{ color: 'var(--color-amber)' }}>
          — HV20%
        </span>
        <span className="chart-series-label chart-series-label-ml" style={{ color: 'var(--color-red)' }}>
          — ATR14%
        </span>
      </div>
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
