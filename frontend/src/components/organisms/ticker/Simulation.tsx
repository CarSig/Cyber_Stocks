import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSimulationPresets } from '@/api/stock';
import type { SimulationPreset } from '@/types';
import { createChart, LineSeries, AreaSeries, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import DatePicker from '@/components/atoms/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Quote } from '@/types';
import SimToolbar from './sim/SimToolbar';
import SimManualEntry from './sim/SimManualEntry';
import SimResults from './sim/SimResults';
import { exportSimPdf } from './sim/simExportPdf';
import { useSimTextSync } from './sim/useSimTextSync';
import { simStatsToExportRows } from '@/utils/sim';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseYMD(dateStr: string): Date {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function safeOffsetDate(dateStr: string | undefined, ms: number): string | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return null;
  return new Date(t + ms).toISOString().slice(0, 10);
}

function snapToWeekday(dateStr: string): string {
  const d = parseYMD(dateStr);
  if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return localDateStr(d);
}


type SimAction = { id: number; date: string; type: 'buy' | 'sell'; value: string };

type SimTransaction = {
  date: string;
  type: 'buy' | 'sell';
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

function runLongTermSim(quotes: Quote[], actions: SimAction[], startShares = 0): SimResult {
  const quoteMap = new Map<string, number>();
  for (const q of quotes) {
    const d = q.date.slice(0, 10);
    if (q.close != null) quoteMap.set(d, q.adjclose ?? q.close);
  }

  const sorted = [...actions]
    .filter((a) => a.date && a.value)
    .map((a) => ({ date: a.date, type: a.type, value: Number(a.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dates = [...quoteMap.keys()].sort();
  let shares = startShares;
  const firstDate = sorted[0]?.date ?? dates[0] ?? '';
  const lastDate = sorted.at(-1)?.date ?? dates.at(-1) ?? '';
  const priceAtFirst = quoteMap.get(firstDate) ?? quoteMap.get(dates[0]) ?? 0;
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

  for (const d of dates) {
    const price = quoteMap.get(d)!;
    priceHistory.push({ date: d, value: price });
    for (const act of actionsByDate.get(d) ?? []) {
      if (act.type === 'buy') {
        const bought = act.value / price;
        shares += bought;
        totalInvested += act.value;
        transactions.push({
          date: d,
          type: 'buy',
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
          type: 'sell',
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

  const lastPrice = quoteMap.get(dates.at(-1) ?? '') ?? 0;
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

let nextId = 1;

type SimulationProps = {
  ticker: string;
  quotes?: Quote[];
  onResult?: (result: SimResult | Record<string, unknown>) => void;
};

export default function Simulation({ ticker, quotes = [], onResult }: SimulationProps) {
  const dates = useMemo(() => quotes.map((q) => new Date(q.date).toISOString().slice(0, 10)).sort(), [quotes]);
  const minDate = dates[0] ?? '';
  const maxDate = dates.at(-1) ?? '';

  const [actions, setActions] = useState<SimAction[]>([]);
  const [startShares, setStartShares] = useState('0');
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const interactiveChartRef = useRef<HTMLDivElement>(null);
  const interactiveRef = useRef<{ chart: IChartApi; series: ISeriesApi<SeriesType> } | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualType, setManualType] = useState<'buy' | 'sell'>('buy');
  const [manualValue, setManualValue] = useState('100');
  const [clickValue, setClickValue] = useState('100');
  const clickValueRef = useRef(clickValue);
  useEffect(() => {
    clickValueRef.current = clickValue;
  }, [clickValue]);
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick'>('line');

  const { textValue, setTextValue, handleTextChange, actionsToText } = useSimTextSync<SimAction>({
    actions,
    toTextAction: (a) => ({ label: a.date, side: a.type, value: Number(a.value) }),
    parseTextAction: (label, num) => ({
      id: nextId++,
      date: label,
      type: num > 0 ? 'buy' : 'sell',
      value: String(Math.abs(num)),
    }),
    onActionsChange: setActions,
  });

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

  const applyPreset = useCallback(
    (name: string) => {
      if (!presets?.[name]) return;
      const next = presets[name]
        .map((item: SimulationPreset) => {
          const num = Number(item.number);
          if (!isFinite(num) || num === 0) return null;
          return {
            id: nextId++,
            date: item.date,
            type: (num > 0 ? 'buy' : 'sell') as 'buy' | 'sell',
            value: String(Math.abs(num)),
          };
        })
        .filter((x): x is SimAction => x !== null);
      setActions(next);
      setTextValue(actionsToText(next));
    },
    [presets, actionsToText, setTextValue],
  );

  const result = useMemo<SimResult | null>(() => {
    if (!quotes.length || !actions.some((a) => a.date && a.value)) return null;
    const res = runLongTermSim(quotes, actions, Math.max(0, Number(startShares) || 0));
    onResult?.(res);
    return res;
  }, [actions, quotes, startShares]);

  const remove = useCallback((id: number) => setActions((prev) => prev.filter((a) => a.id !== id)), []);
  const update = useCallback((id: number, field: keyof SimAction, val: string) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: val } : a)));
  }, []);
  const insertBefore = useCallback((id: number) => {
    setActions((prev) => {
      const idx = prev.findIndex((a) => a.id === id);
      const next = [...prev];
      next.splice(idx, 0, { id: nextId++, date: '', type: 'buy', value: '100' });
      return next;
    });
  }, []);
  const clear = useCallback(() => {
    setActions([]);
    setTextValue('');
  }, [setTextValue]);

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

    let lastHoveredDate: string | null = null;
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        lastHoveredDate = null;
        return;
      }
      lastHoveredDate = param.time as string;
    });
    chart.subscribeClick((param) => {
      if (!param.time) return;
      const date = snapToWeekday(param.time as string);
      const val = Math.max(0.01, Number(clickValueRef.current) || 100);
      setActions((prev) => [...prev, { id: nextId++, date, type: 'buy', value: String(val) }]);
    });

    const el = interactiveChartRef.current!;
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      const date = lastHoveredDate ? snapToWeekday(lastHoveredDate) : '';
      if (!date) return;
      const val = Math.min(100, Math.max(0.01, Number(clickValueRef.current) || 50));
      setActions((prev) => [...prev, { id: nextId++, date, type: 'sell', value: String(val) }]);
    }
    el.addEventListener('contextmenu', onContextMenu);
    interactiveRef.current = { chart, series };
    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    return () => {
      el.removeEventListener('contextmenu', onContextMenu);
      ro.disconnect();
      chart.remove();
      interactiveRef.current = null;
    };
  }, [quotes, chartType]);

  // Sync action markers onto interactive chart
  useEffect(() => {
    const ref = interactiveRef.current;
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

  const portfolioMarkers = useMemo(
    () => result?.transactions.map((t) => ({ time: t.date, side: t.type, value: t.value, shares: t.shares })) ?? [],
    [result],
  );

  const handleExportPdf = useCallback(() => {
    if (!result) return;
    exportSimPdf(
      ticker,
      simStatsToExportRows(result),
      result.transactions.map((t) => ({
        label: t.date,
        side: t.type,
        price: t.price,
        shares: t.shares,
        value: t.value,
        sharesAfter: t.sharesAfter,
        portfolioValue: t.portfolioValue,
      })),
      [
        { ref: interactiveChartRef.current, label: 'Stock Price' },
        { ref: portfolioChartRef.current, label: 'Portfolio Value' },
      ],
      'Date',
    );
  }, [result, ticker]);

  return (
    <div>
      {quotes.length > 0 && (
        <div className="sim-interactive-chart">
          <div className="dtrade-order-controls" style={{ marginBottom: '0.5rem' }}>
            <div className="dtrade-next-side">
              <span className="dtrade-side-btn dtrade-side-btn--buy">▲ Left click = Buy ($)</span>
              <span className="dtrade-side-btn dtrade-side-btn--sell">▼ Right click = Sell (%)</span>
            </div>
            <div className="dtrade-shares">
              <span className="dtrade-label">Start shares:</span>
              <Input
                type="number"
                min="0"
                step="any"
                value={startShares}
                onChange={(e) => setStartShares(e.target.value)}
                className="dtrade-shares-input"
              />
            </div>
            <div className="dtrade-shares">
              <span className="dtrade-label">Value:</span>
              <Input
                type="number"
                min="0"
                step="any"
                value={clickValue}
                onChange={(e) => setClickValue(e.target.value)}
                className="dtrade-shares-input"
              />
              <span className="dtrade-label">$ buy / % sell</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
            {(['line', 'area', 'candlestick'] as const).map((t) => (
              <button
                key={t}
                className={`sim-chart-btn${chartType === t ? ' active' : ''}`}
                onClick={() => setChartType(t)}
                type="button"
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="dtrade-chart-hint">Left click to buy · Right click to sell</div>
          <div ref={interactiveChartRef} />
        </div>
      )}

      <SimToolbar
        presets={presets}
        presetsLoading={presetsLoading}
        presetsError={presetsError as Error | null}
        onPreset={applyPreset}
        textMode={textMode}
        onTextModeToggle={() => setTextMode((v) => !v)}
        hasResult={!!result}
        onExportPdf={handleExportPdf}
        hasActions={actions.length > 0}
        onClear={clear}
      />

      <SimManualEntry
        side={manualType}
        onSideChange={(s) => setManualType(s as 'buy' | 'sell')}
        value={manualValue}
        onValueChange={setManualValue}
        onAdd={() => {
          if (!manualDate || !manualValue) return;
          setActions((prev) => [...prev, { id: nextId++, date: manualDate, type: manualType, value: manualValue }]);
        }}
        inputSlot={
          <DatePicker
            value={manualDate}
            min={minDate}
            max={maxDate}
            onChange={(v) => setManualDate(v ? snapToWeekday(v) : '')}
          />
        }
      />

      {textMode && (
        <Textarea
          value={textValue}
          onChange={handleTextChange}
          placeholder={'2025-01-15, 100\n2025-06-01, -50'}
          rows={Math.max(3, actions.length + 1)}
          className="sim-textarea"
        />
      )}

      {!textMode && actions.length > 0 && (
        <div className="dtrade-orders">
          <div className="dtrade-section-title">Actions</div>
          <div className="sim-actions">
            {actions.map((a, i) => {
              const prevDate = actions[i - 1]?.date;
              const actionMin = safeOffsetDate(prevDate, 86400000) ?? minDate;
              const nextDate = actions[i + 1]?.date;
              const actionMax = safeOffsetDate(nextDate, -86400000) ?? maxDate;
              return (
                <div key={a.id} className="sim-action-row">
                  <DatePicker
                    value={a.date}
                    min={actionMin}
                    max={actionMax}
                    onChange={(v) => update(a.id, 'date', v ? snapToWeekday(v) : '')}
                  />
                  <Select
                    value={a.type}
                    onValueChange={(v: string | null) => {
                      if (v) update(a.id, 'type', v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy ($)</SelectItem>
                      <SelectItem value="sell">Sell (%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    max={a.type === 'sell' ? 100 : undefined}
                    step="any"
                    placeholder={a.type === 'buy' ? 'Amount ($)' : 'Percent (0–100)'}
                    value={a.value}
                    onChange={(e) => update(a.id, 'value', e.target.value)}
                    className="form-input--number"
                  />
                  <Button variant="ghost" onClick={() => insertBefore(a.id)}>
                    + before
                  </Button>
                  <Button variant="ghost" onClick={() => remove(a.id)}>
                    ✕
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result && (
        <SimResults
          ref={portfolioChartRef}
          stats={simStatsToExportRows(result)}
          history={result.portfolioHistory.map((p) => ({ time: p.date, value: p.value }))}
          markers={portfolioMarkers}
          transactions={result.transactions}
        />
      )}
    </div>
  );
}
