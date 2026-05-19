import { useRef, useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSimulationPresets } from '@/api/stock';
import type { SimulationPreset } from '@/types';
import { createChart, LineSeries, AreaSeries, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import DatePicker from '@/components/atoms/DatePicker';
import type { Quote } from '@/types';
import SimEntryPanel from './components/entry-panel/SimEntryPanel';
import ChartTypeToggle from './components/ChartTypeToggle';
import TradeModeControls from './components/TradeModeControls';
import ChartActionPopover from './components/ChartActionPopover';
import { useExportSimPdf } from './hooks/useExportSimPdf';
import { longTermReducer, initialLongTermState } from './reducers/longTermReducer';
import type { LongTermAction } from './reducers/longTermReducer';
import { longTermStrategy } from './reducers/baseStrategy';
import { useAddManualAction } from './hooks/useAddManualAction';
import { simStatsToExportRows } from '@/utils/sim';
import { DateUtils, safeOffsetDate } from '@/utils/date';
import { attachChartClick } from './utils/chartClick';
import { useCrosshairTracker } from './hooks/useCrosshairTracker';

const { snapToWeekday } = DateUtils;
const simToIso = (t: unknown) => t as string;

type SimTransaction = {
  date: string;
  side: 'buy' | 'sell' | 'short' | 'cover';
  value: number;
  shares: number;
  price: number;
  sharesAfter: number;
  portfolioValue: number;
};

type SimHistoryPoint = { date: string; value: number };

type SimResult = {
  totalInvested: number;
  finalShares: number;
  sharesValue: number;
  cashWithdrawn: number;
  profit: number;
  profitPct: number;
  transactions: SimTransaction[];
  portfolioHistory: SimHistoryPoint[];
  priceHistory: SimHistoryPoint[];
};

function runLongTermShortSim(quotes: Quote[], actions: LongTermAction[]): SimResult {
  const quoteMap = new Map<string, number>();
  for (const q of quotes) {
    const d = q.date.slice(0, 10);
    if (q.close != null) quoteMap.set(d, q.adjclose ?? q.close);
  }

  const sorted = [...actions]
    .filter((a) => a.date && a.value)
    .map((a) => ({ date: a.date, side: a.side, value: Number(a.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sortedDates = [...quoteMap.keys()].sort();
  let shortShares = 0;
  let cashReceived = 0;
  let coverCost = 0;
  const transactions: SimTransaction[] = [];
  const portfolioHistory: SimHistoryPoint[] = [];
  const priceHistory: SimHistoryPoint[] = [];

  const actionsByDate = new Map<string, typeof sorted>();
  for (const a of sorted) {
    if (!actionsByDate.has(a.date)) actionsByDate.set(a.date, []);
    actionsByDate.get(a.date)!.push(a);
  }

  for (const d of sortedDates) {
    const price = quoteMap.get(d)!;
    priceHistory.push({ date: d, value: price });
    for (const act of actionsByDate.get(d) ?? []) {
      if (act.side === 'short') {
        const borrowed = act.value / price;
        shortShares += borrowed;
        cashReceived += act.value;
        transactions.push({
          date: d,
          side: 'short',
          value: act.value,
          shares: borrowed,
          price,
          sharesAfter: -shortShares,
          portfolioValue: cashReceived - shortShares * price,
        });
      } else {
        const pct = Math.min(act.value, 100) / 100;
        const covered = shortShares * pct;
        const cost = covered * price;
        shortShares -= covered;
        coverCost += cost;
        transactions.push({
          date: d,
          side: 'cover',
          value: cost,
          shares: covered,
          price,
          sharesAfter: -shortShares,
          portfolioValue: cashReceived - coverCost - shortShares * price,
        });
      }
    }
    portfolioHistory.push({ date: d, value: cashReceived - coverCost - shortShares * price });
  }

  const lastPrice = quoteMap.get(sortedDates.at(-1) ?? '') ?? 0;
  const remainingLiability = shortShares * lastPrice;
  const profit = cashReceived - coverCost - remainingLiability;
  const totalInvested = cashReceived;
  const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  const trimHistory = (h: SimHistoryPoint[]) => {
    if (!transactions.length) return h;
    const from = transactions[0].date;
    const to = transactions.at(-1)!.date;
    return h.filter((p) => p.date >= from && p.date <= to);
  };

  return {
    totalInvested,
    finalShares: -shortShares,
    sharesValue: -remainingLiability,
    cashWithdrawn: coverCost,
    profit,
    profitPct,
    transactions,
    portfolioHistory: trimHistory(portfolioHistory),
    priceHistory: trimHistory(priceHistory),
  };
}

function runLongTermSim(quotes: Quote[], actions: LongTermAction[], startShares = 0): SimResult {
  const quoteMap = new Map<string, number>();
  for (const q of quotes) {
    const d = q.date.slice(0, 10);
    if (q.close != null) quoteMap.set(d, q.adjclose ?? q.close);
  }

  const sorted = [...actions]
    .filter((a) => a.date && a.value)
    .map((a) => ({ date: a.date, side: a.side, value: Number(a.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sortedDates = [...quoteMap.keys()].sort();
  let shares = startShares;
  const firstDate = sorted[0]?.date ?? sortedDates[0] ?? '';
  const lastDate = sorted.at(-1)?.date ?? sortedDates.at(-1) ?? '';
  const priceAtFirst = quoteMap.get(firstDate) ?? quoteMap.get(sortedDates[0]) ?? 0;
  let totalInvested = startShares * priceAtFirst;
  let cashWithdrawn = 0;
  const transactions: SimTransaction[] = [];
  const portfolioHistory: SimHistoryPoint[] = [];
  const priceHistory: SimHistoryPoint[] = [];

  const actionsByDate = new Map<string, typeof sorted>();
  for (const a of sorted) {
    if (!actionsByDate.has(a.date)) actionsByDate.set(a.date, []);
    actionsByDate.get(a.date)!.push(a);
  }

  for (const d of sortedDates) {
    const price = quoteMap.get(d)!;
    priceHistory.push({ date: d, value: price });
    for (const act of actionsByDate.get(d) ?? []) {
      if (act.side === 'buy') {
        const bought = act.value / price;
        shares += bought;
        totalInvested += act.value;
        transactions.push({
          date: d,
          side: 'buy',
          value: act.value,
          shares: bought,
          price,
          sharesAfter: shares,
          portfolioValue: shares * price,
        });
      } else {
        const pct = Math.min(act.value, 100) / 100;
        const sold = shares * pct;
        const proceeds = sold * price;
        shares -= sold;
        cashWithdrawn += proceeds;
        transactions.push({
          date: d,
          side: 'sell',
          value: proceeds,
          shares: sold,
          price,
          sharesAfter: shares,
          portfolioValue: shares * price,
        });
      }
    }
    portfolioHistory.push({ date: d, value: shares * price });
  }

  const lastPrice = quoteMap.get(sortedDates.at(-1) ?? '') ?? 0;
  const sharesValue = shares * lastPrice;
  const profit = sharesValue + cashWithdrawn - totalInvested;
  const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  const trimHistory = (h: SimHistoryPoint[]) => {
    if (!transactions.length) return h;
    const from = transactions[0].date;
    const to = transactions.at(-1)!.date ?? lastDate;
    return h.filter((p) => p.date >= from && p.date <= to);
  };

  return {
    totalInvested,
    finalShares: shares,
    sharesValue,
    cashWithdrawn,
    profit,
    profitPct,
    transactions,
    portfolioHistory: trimHistory(portfolioHistory),
    priceHistory: trimHistory(priceHistory),
  };
}

const nextId = { current: 1 };

type SimulationProps = {
  ticker: string;
  quotes?: Quote[];
  onResult?: (result: SimResult | Record<string, unknown>) => void;
};

export default function Simulation({ ticker, quotes = [], onResult }: SimulationProps) {
  const dates = useMemo(() => quotes.map((q) => q.date.slice(0, 10)).sort(), [quotes]);
  const minDate = dates[0] ?? '';
  const maxDate = dates.at(-1) ?? '';

  const [s, dispatch] = useReducer(longTermReducer, undefined, initialLongTermState);
  const { actions, startShares, textValue, chartType, value: clickValue, tradeMode } = s;

  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const interactiveChartRef = useRef<HTMLDivElement>(null);
  const interactiveRef = useRef<{ chart: IChartApi; series: ISeriesApi<SeriesType> } | null>(null);
  const clickValueRef = useRef(clickValue);
  const tradeModeRef = useRef(tradeMode);
  const actionsRef = useRef(actions);
  useEffect(() => {
    clickValueRef.current = clickValue;
  }, [clickValue]);
  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const [popover, setPopover] = useState<{
    date: string;
    x: number;
    y: number;
    side: 'buy' | 'sell' | 'short' | 'cover';
    value: string;
    confirm: (side: 'buy' | 'sell' | 'short' | 'cover', rawValue: string) => void;
    dismiss: () => void;
  } | null>(null);
  const [editPopover, setEditPopover] = useState<{
    action: LongTermAction;
    x: number;
    y: number;
    confirm: (side: 'buy' | 'sell' | 'short' | 'cover', rawValue: string) => void;
    dismiss: () => void;
    delete: () => void;
  } | null>(null);

  type PresetsMap = Record<string, SimulationPreset[]>;
  const {
    data: presets,
    error: presetsError,
    isLoading: presetsLoading,
  } = useQuery<PresetsMap>({
    queryKey: ['simulation-presets', ticker],
    queryFn: () => getSimulationPresets(ticker) as unknown as Promise<PresetsMap>,
    enabled: !!ticker,
    retry: false,
  });

  const applyPreset = (name: string) => {
    if (!presets?.[name]) return;
    const next = presets[name]
      .map((item: SimulationPreset) => {
        const num = Number(item.number);
        if (!isFinite(num) || num === 0) return null;
        return {
          id: nextId.current++,
          date: item.date,
          side: (num > 0 ? 'buy' : 'sell') as LongTermAction['side'],
          value: String(Math.abs(num)),
        };
      })
      .filter((x): x is LongTermAction => x !== null);
    dispatch({ type: 'SET_ACTIONS', actions: next, textValue: longTermStrategy.toText('', next) });
  };

  const addManualAction = useAddManualAction(
    longTermStrategy,
    s.manualTime,
    s.nextSide,
    s.value,
    '',
    dispatch,
    nextId,
    () => dispatch({ type: 'SET_MANUAL_DATE', date: '' }),
  );

  const result = useMemo<SimResult | null>(() => {
    if (!quotes.length || !actions.some((a) => a.date && a.value)) return null;
    if (tradeMode === 'short') return runLongTermShortSim(quotes, actions);
    return runLongTermSim(quotes, actions, Math.max(0, Number(startShares) || 0));
  }, [actions, quotes, startShares, tradeMode]);

  useEffect(() => {
    if (result) onResult?.(result);
  }, [result, onResult]);

  const clear = () => dispatch({ type: 'CLEAR_ACTIONS', date: '' });

  const getHoveredIso = useCrosshairTracker(interactiveRef, simToIso, [quotes, chartType]);

  // Interactive price chart
  useEffect(() => {
    if (!interactiveChartRef.current || !quotes.length) return;
    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(interactiveChartRef.current, {
      width: interactiveChartRef.current.clientWidth,
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

    const el = interactiveChartRef.current!;
    const cleanupClick = attachChartClick(el, {
      chart,
      getHoveredIso: () => { const iso = getHoveredIso(); return iso ? snapToWeekday(iso) : null; },
      onQuickAction: (date, button) => {
        const existing = actionsRef.current.find((a) => a.date === date);
        if (existing) {
          // placeholder coords — edit popover opened via hold; quick click on marker does nothing extra
          return;
        }
        if (button === 0) {
          const val = Math.max(0.01, Number(clickValueRef.current) || 100);
          const side = tradeModeRef.current === 'short' ? 'short' : 'buy';
          dispatch({ type: 'ADD_ACTION', action: { id: nextId.current++, date, side, value: String(val) }, date: '' });
        } else {
          const val = Math.min(100, Math.max(0.01, Number(clickValueRef.current) || 50));
          const side = tradeModeRef.current === 'short' ? 'cover' : 'sell';
          dispatch({ type: 'ADD_ACTION', action: { id: nextId.current++, date, side, value: String(val) }, date: '' });
        }
      },
      onHoldStart: (date, x, y, button) => {
        const existing = actionsRef.current.find((a) => a.date === date);
        if (existing) {
          setEditPopover({
            action: existing,
            x,
            y,
            confirm: (side, rawValue) => {
              const isExit = side === 'sell' || side === 'cover';
              const val = isExit ? Math.min(100, Math.max(0.01, Number(rawValue))) : Math.max(0.01, Number(rawValue));
              if (!isFinite(val) || val <= 0) {
                setEditPopover(null);
                return;
              }
              const updated = actionsRef.current.map((a) =>
                a.id === existing.id ? { ...a, side, value: String(val) } : a,
              );
              dispatch({ type: 'SET_ACTIONS', actions: updated, textValue: longTermStrategy.toText('', updated) });
              setEditPopover(null);
            },
            dismiss: () => setEditPopover(null),
            delete: () => {
              dispatch({ type: 'REMOVE_ACTION', id: existing.id, date: '' });
              setEditPopover(null);
            },
          });
          return;
        }
        const side =
          button === 0
            ? tradeModeRef.current === 'short'
              ? 'short'
              : 'buy'
            : tradeModeRef.current === 'short'
              ? 'cover'
              : 'sell';
        const val =
          button === 0
            ? String(Math.max(0.01, Number(clickValueRef.current) || 100))
            : String(Math.min(100, Math.max(0.01, Number(clickValueRef.current) || 50)));
        setPopover({
          date,
          x,
          y,
          side,
          value: val,
          confirm: (s, rawValue) => {
            const isExit = s === 'sell' || s === 'cover';
            const v = isExit ? Math.min(100, Math.max(0.01, Number(rawValue))) : Math.max(0.01, Number(rawValue));
            if (!isFinite(v) || v <= 0) {
              setPopover(null);
              return;
            }
            dispatch({
              type: 'ADD_ACTION',
              action: { id: nextId.current++, date, side: s, value: String(v) },
              date: '',
            });
            setPopover(null);
          },
          dismiss: () => setPopover(null),
        });
      },
    });
    interactiveRef.current = { chart, series };
    let disposed = false;
    const ro = new ResizeObserver(() => { if (!disposed) chart.applyOptions({ width: el.clientWidth }); });
    ro.observe(el);
    return () => {
      disposed = true;
      cleanupClick();
      ro.disconnect();
      chart.remove();
      interactiveRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, chartType]);

  // Sync action markers onto interactive chart
  useEffect(() => {
    const ref = interactiveRef.current;
    if (!ref) return;
    createSeriesMarkers(
      ref.series,
      actions
        .filter((a) => a.date)
        .map((a) => {
          const isEntry = a.side === 'buy' || a.side === 'short';
          const color =
            a.side === 'buy' ? '#22c55e' : a.side === 'sell' ? '#ef4444' : a.side === 'short' ? '#f97316' : '#3b82f6';
          const prefix = a.side === 'buy' ? 'B' : a.side === 'sell' ? 'S' : a.side === 'short' ? 'SH' : 'C';
          return {
            time: a.date as `${number}-${number}-${number}`,
            position: isEntry ? ('belowBar' as const) : ('aboveBar' as const),
            color,
            shape: isEntry ? ('arrowUp' as const) : ('arrowDown' as const),
            text: isEntry ? `${prefix} $${a.value}` : `${prefix} ${a.value}%`,
          };
        })
        .sort((a, b) => (a.time < b.time ? -1 : 1)),
    );
  }, [actions]);

  const portfolioMarkers = useMemo(
    () => result?.transactions.map((t) => ({ time: t.date, side: t.side, value: t.value, shares: t.shares })) ?? [],
    [result],
  );

  const exportResult = useMemo(() => {
    if (!result) return null;
    return {
      ...result,
      transactions: result.transactions.map((t) => ({
        time: t.date,
        timestamp: t.date,
        side: t.side,
        price: t.price,
        shares: t.shares,
        value: t.value,
        sharesAfter: t.sharesAfter,
        portfolioValue: t.portfolioValue,
      })),
      portfolioHistory: result.portfolioHistory.map((p) => ({ time: p.date, value: p.value })),
    } as import('@/utils/sim').SimResult;
  }, [result]);

  const handleExportPdf = useExportSimPdf(
    ticker,
    exportResult,
    [
      { ref: interactiveChartRef, label: 'Stock Price' },
      { ref: portfolioChartRef, label: 'Portfolio Value' },
    ],
    'Date',
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    let id = Date.now();
    const parsed: LongTermAction[] = [];
    for (const line of raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)) {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length !== 2) continue;
      const [label, numStr] = parts;
      const num = Number(numStr);
      if (isNaN(num) || num === 0) continue;
      parsed.push({ id: id++, date: label, side: num > 0 ? 'buy' : 'sell', value: String(Math.abs(num)) });
    }
    dispatch({ type: 'SET_TEXT', raw, parsedActions: parsed.length ? parsed : undefined });
  };

  return (
    <div>
      {popover && <ChartActionPopover popover={popover} tradeMode={tradeMode} />}
      {editPopover && <ChartActionPopover mode="edit" popover={editPopover} tradeMode={tradeMode} />}

      <SimEntryPanel
        topSlot={
          quotes.length > 0 ? (
            <>
              <div className="dtrade-order-controls" style={{ marginBottom: '0.5rem' }}>
                <TradeModeControls
                  tradeMode={tradeMode}
                  onTradeModeChange={(mode) => dispatch({ type: 'SET_TRADE_MODE', mode, date: '' })}
                  startShares={startShares}
                  onStartSharesChange={(v) => dispatch({ type: 'SET_START_SHARES', startShares: v })}
                  value={clickValue}
                  onValueChange={(v) => dispatch({ type: 'SET_VALUE', value: v })}
                />
              </div>
              <ChartTypeToggle chartType={chartType} onChange={(t) => dispatch({ type: 'SET_CHART_TYPE', chartType: t })} />
              <div className="dtrade-chart-hint">Left click to buy · Right click to sell · Hold 1s to configure</div>
              <div ref={interactiveChartRef} />
            </>
          ) : null
        }
        tradeMode={tradeMode}
        strategy={longTermStrategy}
        textValue={textValue}
        onTextChange={handleTextChange}
        toolbar={longTermStrategy.buildToolbar(s, dispatch, {
          presets,
          presetsLoading,
          presetsError: presetsError as Error | null,
          onPreset: applyPreset,
          onExportPdf: handleExportPdf,
          onClear: clear,
        })}
        manual={longTermStrategy.buildManual(s, dispatch, {
          inputType: 'date',
          onAdd: addManualAction,
          minDate,
          maxDate,
        })}
        actions={longTermStrategy.buildActions(s, dispatch, {
          labelSlot: (a, i) => (
            <DatePicker
              value={a.date as string}
              min={safeOffsetDate(actions[i - 1]?.date, 86400000) ?? minDate}
              max={safeOffsetDate(actions[i + 1]?.date, -86400000) ?? maxDate}
              onChange={(v) => dispatch({ type: 'UPDATE_ACTION', id: a.id, field: 'date' as never, val: v ? snapToWeekday(v) : '', date: '' })}
            />
          ),
        })}
        result={{
          stats: result ? simStatsToExportRows(result) : null,
          history: result?.portfolioHistory.map((p) => ({ time: p.date, value: p.value })) ?? [],
          markers: portfolioMarkers,
          transactions: result?.transactions ?? null,
          chartRef: portfolioChartRef,
        }}
      />
    </div>
  );
}
