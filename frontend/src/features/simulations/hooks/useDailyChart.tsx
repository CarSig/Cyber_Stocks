import { useEffect, useRef } from 'react';
import type { RefObject, Dispatch, MutableRefObject } from 'react';
import {
  createChart,
  LineSeries,
  AreaSeries,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
} from 'lightweight-charts';
import type { Quote } from '@/types';
import type { ChartType } from '../components/ChartTypeToggle';
import type { LongTermSimAction, LongTermAction } from '../reducers/longTermReducer';
import { useChartPopover } from './useChartPopover';
import { useCrosshairTracker } from './useCrosshairTracker';
import { useActionMarkers } from './useActionMarkers';
import ChartActionPopover from '../components/ChartActionPopover';
import { attachSimChartClick } from '../utils';
import { DateUtils } from '@/utils/date';

const { snapToWeekday } = DateUtils;
const simToIso = (t: unknown) => t as string;

type Opts = {
  containerRef: RefObject<HTMLDivElement | null>;
  quotes: Quote[];
  chartType: ChartType;
  actionsRef: MutableRefObject<LongTermAction[]>;
  valueRef: MutableRefObject<string>;
  tradeModeRef: MutableRefObject<'long' | 'short'>;
  nextIdRef: MutableRefObject<number>;
  dispatch: Dispatch<LongTermSimAction>;
  date: string;
  tradeMode: 'long' | 'short';
  actions: LongTermAction[];
};

export function useDailyChart({
  containerRef,
  quotes,
  chartType,
  actionsRef,
  valueRef,
  tradeModeRef,
  nextIdRef,
  dispatch,
  date,
  tradeMode,
  actions,
}: Opts) {
  const chartRef = useRef<{ chart: IChartApi; series: ISeriesApi<SeriesType> } | null>(null);

  const popover = useChartPopover<LongTermAction>(
    dispatch,
    nextIdRef,
    date,
    tradeMode,
    (d) => d,
    (id, d, _label, side, val) => ({ id, date: d, side, value: String(val) }),
  );

  const getHoveredIso = useCrosshairTracker(chartRef, simToIso, [quotes, chartType]);

  useEffect(() => {
    if (!containerRef.current || !quotes.length) return;
    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
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
      series = chart.addSeries(AreaSeries, {
        lineColor: cv('--color-green'),
        topColor: cv('--color-green') + '55',
        bottomColor: cv('--color-green') + '00',
        lineWidth: 2,
      });
      series.setData(priceData);
    } else if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      series.setData(
        quotes
          .filter((q) => q.open != null && q.close != null)
          .map((q) => ({
            time: q.date.slice(0, 10) as `${number}-${number}-${number}`,
            open: q.open,
            high: q.high ?? q.close,
            low: q.low ?? q.close,
            close: q.close,
          })),
      );
    } else {
      series = chart.addSeries(LineSeries, { color: cv('--color-green'), lineWidth: 2 });
      series.setData(priceData);
    }
    chart.timeScale().fitContent();

    chartRef.current = { chart, series };

    const el = containerRef.current;
    const cleanupClick = attachSimChartClick<LongTermAction>(el, {
      chart,
      getHoveredIso: () => {
        const iso = getHoveredIso();
        return iso ? snapToWeekday(iso) : null;
      },
      actionsRef,
      valueRef,
      tradeModeRef,
      nextIdRef,
      dispatch,
      date,
      fmtLabel: (d) => d,
      createAction: (id, d, _label, side, val) => ({ id, date: d, side, value: String(val) }),
      onPopoverOpen: popover.openAdd,
      onEditPopoverOpen: popover.openEdit,
    });

    let disposed = false;
    const ro = new ResizeObserver(() => {
      if (!disposed) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      disposed = true;
      cleanupClick();
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, chartType]);

  useActionMarkers(chartRef, actions);

  const popoverNodes = (
    <>
      {popover.add && <ChartActionPopover popover={popover.add} tradeMode={tradeMode} />}
      {popover.edit && <ChartActionPopover mode="edit" popover={popover.edit} tradeMode={tradeMode} />}
    </>
  );

  return { chartRef, popoverNodes };
}
