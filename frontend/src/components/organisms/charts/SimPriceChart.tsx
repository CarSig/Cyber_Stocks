import { useEffect, useRef, forwardRef } from 'react';
import './charts.css';
import { createChart, LineSeries, AreaSeries, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { snapToWeekday } from './utils/dates';
import type { Quote } from '@/types';

type SimAction = { id: number; date: string; type: 'buy' | 'sell'; value: string };

export type SimPriceChartProps = {
  quotes: Quote[];
  actions: SimAction[];
  chartType: 'line' | 'area' | 'candlestick';
  clickValueRef: React.RefObject<number>;
  onBuy: (date: string) => void;
  onSell: (date: string) => void;
};

type ChartRefs = { chart: IChartApi; series: ISeriesApi<SeriesType> };

const SimPriceChart = forwardRef<HTMLDivElement, SimPriceChartProps>(
  function SimPriceChart({ quotes, actions, chartType, clickValueRef, onBuy, onSell }, outerRef) {
    const innerRef = useRef<HTMLDivElement>(null);
    const chartRefs = useRef<ChartRefs | null>(null);

    function setRef(el: HTMLDivElement | null) {
      (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (outerRef && typeof outerRef === 'object') outerRef.current = el;
    }

    useEffect(() => {
      if (!innerRef.current || !quotes.length) return;
      const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

      const chart = createChart(innerRef.current, {
        width: innerRef.current.clientWidth,
        height: 200,
        layout: { background: { color: cv('--surface-0') }, textColor: cv('--text-primary') },
        grid: { vertLines: { color: cv('--surface-3') }, horzLines: { color: cv('--surface-3') } },
        timeScale: { timeVisible: false },
      });

      const priceData = quotes
        .filter((q) => q.close != null)
        .map((q) => ({ time: q.date.slice(0, 10) as `${number}-${number}-${number}`, value: q.adjclose ?? q.close }));

      let series: ISeriesApi<SeriesType>;
      if (chartType === 'area') {
        series = chart.addSeries(AreaSeries, { lineColor: cv('--color-green'), topColor: cv('--color-green') + '55', bottomColor: cv('--color-green') + '00', lineWidth: 2 });
        series.setData(priceData);
      } else if (chartType === 'candlestick') {
        series = chart.addSeries(CandlestickSeries, { upColor: '#22c55e', downColor: '#ef4444', borderUpColor: '#22c55e', borderDownColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444' });
        series.setData(quotes.filter((q) => q.open != null && q.close != null).map((q) => ({
          time: q.date.slice(0, 10) as `${number}-${number}-${number}`,
          open: q.open, high: q.high ?? q.close, low: q.low ?? q.close, close: q.close,
        })));
      } else {
        series = chart.addSeries(LineSeries, { color: cv('--color-green'), lineWidth: 2 });
        series.setData(priceData);
      }
      chart.timeScale().fitContent();

      let lastHoveredDate: string | null = null;
      chart.subscribeCrosshairMove((param) => {
        if (!param.time) { lastHoveredDate = null; return; }
        lastHoveredDate = param.time as string;
      });
      chart.subscribeClick((param) => {
        if (!param.time) return;
        const date = snapToWeekday(param.time as string);
        const val = Math.max(0.01, clickValueRef.current || 100);
        onBuy(date);
        void val;
      });

      const el = innerRef.current!;
      function onContextMenu(e: MouseEvent) {
        e.preventDefault();
        const date = lastHoveredDate ? snapToWeekday(lastHoveredDate) : '';
        if (!date) return;
        onSell(date);
      }
      el.addEventListener('contextmenu', onContextMenu);
      chartRefs.current = { chart, series };

      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      return () => {
        el.removeEventListener('contextmenu', onContextMenu);
        ro.disconnect();
        chart.remove();
        chartRefs.current = null;
      };
    }, [quotes, chartType]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      const ref = chartRefs.current;
      if (!ref) return;
      createSeriesMarkers(
        ref.series,
        actions
          .filter((a) => a.date)
          .map((a) => ({
            time: a.date as `${number}-${number}-${number}`,
            position: a.type === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
            color: a.type === 'buy' ? '#22c55e' : '#ef4444',
            shape: a.type === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
            text: a.type === 'buy' ? `B $${a.value}` : `S ${a.value}%`,
          }))
          .sort((a, b) => (a.time < b.time ? -1 : 1)),
      );
    }, [actions]);

    return <div ref={setRef} />;
  },
);

export default SimPriceChart;
