import { useEffect, useRef, useState } from 'react';
import './charts.css';
import { createChart, LineSeries, AreaSeries, type IChartApi } from 'lightweight-charts';
import { cssVar, makeChartOptions } from './utils/theme';
import { toSortedOHLC } from './utils/series';
import { daysAgoString, todayString } from './utils/dates';
import { attachResizeObserver, subscribeRangeChange, applyRange } from './utils/chartSetup';
import ChartToggleButton from '@/components/atoms/ChartToggleButton';
import ChartSep from '@/components/atoms/ChartSep';
import type { Quote } from '@/types';

const CHART_TYPES = ['Line', 'Area'];

type OhlcEntry = { time: string; open?: number; high?: number; low?: number; close?: number };

function calcHV(quotes: OhlcEntry[], window = 20) {
  if (quotes.length < window + 1) return [];
  const result: { time: string; value: number }[] = [];
  for (let i = window; i < quotes.length; i++) {
    const slice = quotes.slice(i - window, i + 1);
    const logReturns: number[] = [];
    for (let j = 1; j < slice.length; j++) {
      const prev = slice[j - 1].close ?? 0;
      const curr = slice[j].close ?? 0;
      if (prev > 0 && curr > 0) logReturns.push(Math.log(curr / prev));
    }
    if (!logReturns.length) continue;
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / logReturns.length;
    const hv = Math.sqrt(variance * 252) * 100;
    result.push({ time: quotes[i].time, value: parseFloat(hv.toFixed(4)) });
  }
  return result;
}

function calcATR(quotes: OhlcEntry[], window = 14) {
  if (quotes.length < window + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < quotes.length; i++) {
    const high = quotes[i].high ?? 0, low = quotes[i].low ?? 0, prevClose = quotes[i - 1].close ?? 0;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const result: { time: string; value: number }[] = [];
  for (let i = window - 1; i < trs.length; i++) {
    const slice = trs.slice(i - window + 1, i + 1);
    const atr = slice.reduce((a, b) => a + b, 0) / window;
    const close = quotes[i + 1].close ?? 0;
    if (close > 0) result.push({ time: quotes[i + 1].time, value: parseFloat(((atr / close) * 100).toFixed(4)) });
  }
  return result;
}

type VolatilityChartProps = {
  quotes: Quote[];
  period?: number | null;
  onPeriodChange?: (days: number) => void;
  visibleRange?: { from: string; to: string } | null;
  onRangeChange?: (range: { from: string; to: string }) => void;
};

export default function VolatilityChart({ quotes, period, onPeriodChange, visibleRange, onRangeChange }: VolatilityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);
  const [type, setType] = useState('Line');
  const [showHV, setShowHV] = useState(true);
  const [showATR, setShowATR] = useState(true);

  useEffect(() => { periodRef.current = period; }, [period]);
  useEffect(() => { visibleRangeRef.current = visibleRange; }, [visibleRange]);

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
      chart.timeScale().setVisibleRange(visibleRangeRef.current as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]);
    } else if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current!), to: todayString() } as Parameters<ReturnType<IChartApi['timeScale']>['setVisibleRange']>[0]);
    }

    const rangeTimer = subscribeRangeChange(chart, skipRangeRef, { onRangeChange, onPeriodChange });
    const observer = attachResizeObserver(chart, containerRef);

    return () => {
      clearTimeout(rangeTimer);
      chartRef.current = null;
      observer.disconnect();
      chart.remove();
    };
  }, [quotes, type, showHV, showATR]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current) return;
    applyRange(chartRef.current, skipRangeRef, { period: period ?? null, visibleRange: visibleRange ?? null });
  }, [period, visibleRange]);

  return (
    <div>
      <div className="chart-toolbar">
        {CHART_TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-chart${type === t ? ' active' : ''}`}>
            {t}
          </button>
        ))}
        <ChartSep />
        <ChartToggleButton active={showHV} onClick={() => setShowHV((v) => !v)}>HV20</ChartToggleButton>
        <ChartToggleButton active={showATR} onClick={() => setShowATR((v) => !v)}>ATR14</ChartToggleButton>
        <span className="chart-series-label" style={{ color: 'var(--color-amber)', marginLeft: 8 }}>— HV20%</span>
        <span className="chart-series-label" style={{ color: 'var(--color-red)', marginLeft: 8 }}>— ATR14%</span>
      </div>
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
