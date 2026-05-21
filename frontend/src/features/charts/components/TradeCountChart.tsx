import { useEffect, useRef } from 'react';
import './charts.css';
import { HistogramSeries, type IChartApi } from 'lightweight-charts';
import { useChartInstance } from '../hooks/useChartInstance';
import { useOverlayRefs } from '../hooks/useOverlayRefs';
import { attachResizeObserver, subscribeRangeChange, applyRange } from '../utils/chartSetup';
import { daysAgoString, todayString } from '../utils/dates';
import type { AlpacaBar } from '@/types';

type TradeCountChartProps = {
  alpacaBars?: AlpacaBar[];
  period?: number | null;
  onPeriodChange?: (days: number) => void;
  visibleRange?: { from: string; to: string } | null;
  onRangeChange?: (range: { from: string; to: string }) => void;
};

function buildTradeCountData(bars?: AlpacaBar[]) {
  if (!bars?.length) return [];
  return bars
    .filter((b) => b.n != null)
    .map((b) => ({
      time: Math.floor(new Date(b.t).getTime() / 1000) as any,
      value: Number(b.n),
      color: '#a855f7',
    }));
}

export default function TradeCountChart({
  alpacaBars,
  period,
  onPeriodChange,
  visibleRange,
  onRangeChange,
}: TradeCountChartProps) {
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const visibleRangeRef = useRef(visibleRange);

  const overlayRefs = useOverlayRefs({});

  const hasData = alpacaBars?.some((b) => b.n != null);

  const { chartRef, containerRef, height, onHandleWheel, onHandleMouseDown } = useChartInstance({
    quotes: [],
    type: 'Histogram',
    analysis: null,
    showAnalysis: false,
    overlayRefs,
    resize: { enabled: true },
    onChartReady: (chart) => {
      const data = buildTradeCountData(alpacaBars);
      if (data.length) {
        const series = chart.addSeries(HistogramSeries, { priceScaleId: 'right', color: '#a855f7' });
        chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
        series.setData(data as Parameters<typeof series.setData>[0]);
      }

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

      const rangeTimer = subscribeRangeChange(chart, skipRangeRef, { onRangeChange, onPeriodChange });
      const disposedRef = { current: false };
      const observer = attachResizeObserver(chart, containerRef, disposedRef);

      return () => {
        clearTimeout(rangeTimer);
        disposedRef.current = true;
        observer.disconnect();
      };
    },
  });

  useEffect(() => {
    periodRef.current = period;
  }, [period]);
  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);

  useEffect(() => {
    if (!chartRef.current) return;
    applyRange(chartRef.current, skipRangeRef, { period: period ?? null, visibleRange: visibleRange ?? null });
  }, [period, visibleRange]);

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-series-label chart-series-label-ml">
          {hasData ? 'Alpaca Trade Count (n)' : 'Trade Count (n) — N/A'}
        </span>
      </div>
      <div ref={containerRef} className="chart-container" style={{ height }} />
      <div
        className="sec-price-chart-resize-handle"
        onMouseDown={onHandleMouseDown}
        onWheel={onHandleWheel}
        title="Drag or scroll to resize"
      />
    </div>
  );
}
