import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, AreaSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { getBars, getIntradayEvents } from '@/api/alpaca';
import { getCompanies } from '@/api/stock';
import type { AlpacaBar } from '@/types';
import type { IntradayEvent } from '@/api/alpaca';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import SimToolbar from './sim/SimToolbar';
import SimManualEntry from './sim/SimManualEntry';
import SimResults from './sim/SimResults';
import IntradayEventCard from './sim/IntradayEventCard';
import { exportSimPdf } from './sim/simExportPdf';
import { DateUtils } from '@/utils/date';
import { PriceUtils } from '@/utils/price';
import { MarketUtils } from '@/utils/market';

const INTRADAY_SIM_PRESETS: Record<string, { time: string; side: 'buy' | 'sell'; value: number }[]> = {
  'Open & Close': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '15:45', side: 'sell', value: 100 },
  ],
  'Morning scalp': [
    { time: '09:31', side: 'buy', value: 100 },
    { time: '09:45', side: 'sell', value: 100 },
  ],
  'Afternoon fade': [
    { time: '13:00', side: 'buy', value: 100 },
    { time: '15:30', side: 'sell', value: 100 },
  ],
};

import type { Side, Action, Transaction, SimResult } from '@/utils/sim';
import { simResultToExportArgs } from '@/utils/sim';

function runSimulation(bars: AlpacaBar[], actions: Action[], startShares = 0): SimResult {
  const sorted = [...actions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const firstOpen = bars[0]?.o ?? 0;
  let shares = startShares;
  let totalInvested = startShares * firstOpen;
  let cashWithdrawn = 0;
  const transactions: Transaction[] = [];
  const portfolioHistory: { time: string; value: number }[] = [];

  for (const bar of bars) {
    const price = bar.c;
    const barTime = bar.t;
    for (const act of sorted) {
      if (act.timestamp > barTime) continue;
      if (transactions.some((t) => t.time === DateUtils.fmtTime(act.timestamp) && t.side === act.side)) continue;
      if (act.side === 'buy') {
        const bought = act.value / price;
        shares += bought;
        totalInvested += act.value;
        transactions.push({
          time: DateUtils.fmtTime(act.timestamp),
          side: 'buy',
          price,
          shares: bought,
          value: act.value,
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
          time: DateUtils.fmtTime(act.timestamp),
          side: 'sell',
          price,
          shares: sold,
          value: proceeds,
          sharesAfter: shares,
          portfolioValue: shares * price,
        });
      }
    }
    portfolioHistory.push({ time: DateUtils.fmtTime(barTime), value: shares * price });
  }

  const lastPrice = bars.at(-1)?.c ?? 0;
  const sharesValue = shares * lastPrice;
  const profit = sharesValue + cashWithdrawn - totalInvested;
  const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return {
    transactions,
    portfolioHistory,
    totalInvested,
    cashWithdrawn,
    finalShares: shares,
    sharesValue,
    profit,
    profitPct,
  };
}

function parseIntradayText(raw: string, date: string): { parsedDate: string | null; actions: Action[] } {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { parsedDate: null, actions: [] };

  let parsedDate: string | null = null;
  let actionLines = lines;
  if (/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? '')) {
    parsedDate = lines[0];
    actionLines = lines.slice(1);
  }

  const effectiveDate = parsedDate ?? date;
  let nextId = Date.now();
  const actions: Action[] = [];
  for (const line of actionLines) {
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length !== 2) continue;
    const [timeStr, numStr] = parts;
    const num = Number(numStr);
    if (isNaN(num) || num === 0) continue;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const side: Side = num > 0 ? 'buy' : 'sell';
    const val = Math.min(side === 'sell' ? 100 : Infinity, Math.abs(num));
    actions.push({ id: nextId++, timestamp: DateUtils.timeToIso(timeStr, effectiveDate), time: timeStr, side, value: val });
  }
  return { parsedDate, actions };
}

function actionsToText(date: string, actions: Action[]): string {
  return [date, ...actions.map((a) => `${a.time}, ${a.side === 'sell' ? -a.value : a.value}`)].join('\n');
}

let nextActionId = 1;

type ChartRef = { chart: IChartApi; series: ISeriesApi<SeriesType> } | null;

function parseMarkerTime(timeStr: string): string | null {
  const m = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
}

function syncMarkers(
  series: ISeriesApi<SeriesType>,
  actions: Action[],
  selectedEvent: IntradayEvent | null,
  queryDate: string,
  offset: number,
) {
  const t = (iso: string) => DateUtils.toEtChartTime(iso, offset);

  const actionMarkers = actions.map((a) => ({
    time: t(a.timestamp),
    position: a.side === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
    color: a.side === 'buy' ? '#22c55e' : '#ef4444',
    shape: a.side === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
    text: a.side === 'buy' ? `B $${a.value}` : `S ${a.value}%`,
  }));

  const eventMarkers: {
    time: import('lightweight-charts').Time;
    position: 'aboveBar';
    color: string;
    shape: 'circle';
    size: number;
    text: string;
  }[] = [];

  if (selectedEvent) {
    eventMarkers.push({
      time: t(DateUtils.timeToIso(selectedEvent.chart_time, queryDate)),
      position: 'aboveBar',
      color: '#3b82f6',
      shape: 'circle',
      size: 2,
      text: '',
    });
    const srcTime = parseMarkerTime(selectedEvent.source_time);
    const srcDate = selectedEvent.after_hours ? queryDate : selectedEvent.source_date;
    if (srcTime && srcDate === queryDate) {
      const yellowT = t(DateUtils.timeToIso(srcTime, queryDate));
      // For intraday events: yellow must not precede blue (first report ≤ source report)
      // For after-hours events: blue is artificial market-open; yellow can appear before it
      const blueT = t(DateUtils.timeToIso(selectedEvent.chart_time, queryDate));
      const validOrder = selectedEvent.after_hours || (yellowT as unknown as number) >= (blueT as unknown as number);
      if (validOrder) {
        eventMarkers.push({
          time: yellowT,
          position: 'aboveBar',
          color: '#eab308',
          shape: 'circle',
          size: 2,
          text: '',
        });
      }
    }
  }

  createSeriesMarkers(series, [...actionMarkers, ...eventMarkers].sort((a, b) => (a.time < b.time ? -1 : 1)));
}

export default function IntradaySimulation() {
  const [ticker, setTicker] = useState('CRWD');
  const [date, setDate] = useState(() => DateUtils.lastWeekday(DateUtils.todayStr()));
  const [timeframe, setTimeframe] = useState('5Min');
  const [query, setQuery] = useState(() => ({ ticker: 'CRWD', date: DateUtils.lastWeekday(DateUtils.todayStr()), timeframe: '5Min' }));
  const [actions, setActions] = useState<Action[]>([]);
  const [nextSide, setNextSide] = useState<Side>('buy');
  const [value, setValue] = useState('100');
  const [startShares, setStartShares] = useState('0');
  const [manualTime, setManualTime] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [textValue, setTextValue] = useState(() => DateUtils.lastWeekday(DateUtils.todayStr()));
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick'>('area');
  const [selectedEvent, setSelectedEvent] = useState<IntradayEvent | null>(null);
  const [showPeers, setShowPeers] = useState(false);
  const [extraDates, setExtraDates] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartRef>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<string>(value);
  const tzOffsetRef = useRef<number>(0);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const { data: companiesData } = useQuery<Record<string, string>>({
    queryKey: ['companies'],
    queryFn: getCompanies,
    staleTime: 60 * 60 * 1000,
  });

  const { data: eventsData } = useQuery<IntradayEvent[]>({
    queryKey: ['intraday-events'],
    queryFn: getIntradayEvents,
    staleTime: Infinity,
  });

  const tickerOptions = useMemo(() => {
    if (!companiesData) return [];
    return Object.values(companiesData).sort();
  }, [companiesData]);

  const { data, isPending, error } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', query.ticker, query.date, query.timeframe],
    queryFn: () => getBars(query.ticker, query.date, query.timeframe),
    enabled: Boolean(query.ticker && query.date),
    staleTime: 5 * 60 * 1000,
  });

  const prevDate = useMemo(() => DateUtils.prevWeekday(query.date), [query.date]);
  const nextDate = useMemo(() => DateUtils.nextWeekday(query.date), [query.date]);
  const hasPrev = extraDates.includes(prevDate);
  const hasNext = extraDates.includes(nextDate);

  const { data: prevData } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', query.ticker, prevDate, query.timeframe],
    queryFn: () => getBars(query.ticker, prevDate, query.timeframe),
    enabled: hasPrev,
    staleTime: 5 * 60 * 1000,
  });

  const { data: nextData } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', query.ticker, nextDate, query.timeframe],
    queryFn: () => getBars(query.ticker, nextDate, query.timeframe),
    enabled: hasNext,
    staleTime: 5 * 60 * 1000,
  });

  const bars = useMemo(() => {
    const all = [
      ...(hasPrev ? (prevData?.bars ?? []) : []),
      ...(data?.bars ?? []),
      ...(hasNext ? (nextData?.bars ?? []) : []),
    ];
    return all.sort((a, b) => a.t.localeCompare(b.t));
  }, [data, prevData, nextData, hasPrev, hasNext]);

  const peerTickers = useMemo(
    () => (showPeers && selectedEvent ? selectedEvent.peers.slice(0, 4) : []),
    [showPeers, selectedEvent],
  );

  const PEER_COLORS = ['#f59e0b', '#a78bfa', '#f472b6', '#34d399'];

  const peerQueries = [
    useQuery<{ symbol: string; bars: AlpacaBar[] }>({
      queryKey: ['alpaca-bars', peerTickers[0] ?? '', query.date, query.timeframe],
      queryFn: () => getBars(peerTickers[0]!, query.date, query.timeframe),
      enabled: Boolean(peerTickers[0] && query.date),
      staleTime: 5 * 60 * 1000,
    }),
    useQuery<{ symbol: string; bars: AlpacaBar[] }>({
      queryKey: ['alpaca-bars', peerTickers[1] ?? '', query.date, query.timeframe],
      queryFn: () => getBars(peerTickers[1]!, query.date, query.timeframe),
      enabled: Boolean(peerTickers[1] && query.date),
      staleTime: 5 * 60 * 1000,
    }),
    useQuery<{ symbol: string; bars: AlpacaBar[] }>({
      queryKey: ['alpaca-bars', peerTickers[2] ?? '', query.date, query.timeframe],
      queryFn: () => getBars(peerTickers[2]!, query.date, query.timeframe),
      enabled: Boolean(peerTickers[2] && query.date),
      staleTime: 5 * 60 * 1000,
    }),
    useQuery<{ symbol: string; bars: AlpacaBar[] }>({
      queryKey: ['alpaca-bars', peerTickers[3] ?? '', query.date, query.timeframe],
      queryFn: () => getBars(peerTickers[3]!, query.date, query.timeframe),
      enabled: Boolean(peerTickers[3] && query.date),
      staleTime: 5 * 60 * 1000,
    }),
  ];

  const peerBars = useMemo(
    () => peerTickers.map((t, i) => ({ ticker: t, bars: peerQueries[i].data?.bars ?? [] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [peerTickers, peerQueries[0].data, peerQueries[1].data, peerQueries[2].data, peerQueries[3].data],
  );

  const result = useMemo<SimResult | null>(() => {
    if (!bars.length || !actions.length) return null;
    return runSimulation(bars, actions, Math.max(0, Number(startShares) || 0));
  }, [bars, actions, startShares]);

  const syncTextDate = useCallback((newDate: string) => {
    setTextValue((prev) => {
      const lines = prev.split('\n');
      if (/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? '')) {
        lines[0] = newDate;
        return lines.join('\n');
      }
      return newDate + (prev ? '\n' + prev : '');
    });
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      setTextValue(raw);
      const { parsedDate, actions: parsed } = parseIntradayText(raw, query.date);
      if (parsedDate && parsedDate !== date) setDate(parsedDate);
      if (parsed.length) setActions(parsed);
    },
    [query.date, date],
  );

  const applyPreset = useCallback(
    (name: string) => {
      const preset = INTRADAY_SIM_PRESETS[name];
      if (!preset) return;
      const newActions = preset.map((p) => ({
        id: nextActionId++,
        timestamp: DateUtils.timeToIso(p.time, query.date),
        time: p.time,
        side: p.side,
        value: p.value,
      }));
      setActions(newActions);
      setTextValue(actionsToText(query.date, newActions));
    },
    [query.date],
  );

  const handleEventSelect = useCallback(
    (eventLabel: string | null) => {
      if (!eventLabel) return;
      const ev = eventsData?.find((e) => e.event === eventLabel);
      if (!ev) return;
      setSelectedEvent(ev);
      // Use primary ticker from event (before any '/')
      const primaryTicker = ev.ticker.split('/')[0].trim();
      setTicker(primaryTicker);
      setDate(ev.chart_date);
      syncTextDate(ev.chart_date);
      // Auto-load
      setQuery({ ticker: primaryTicker, date: ev.chart_date, timeframe });
      setActions([]);
      setExtraDates([]);
    },
    [eventsData, syncTextDate, timeframe],
  );

  const handleCompanySelect = useCallback((t: string | null) => {
    if (!t) return;
    setTicker(t);
  }, []);

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    setQuery({ ticker, date, timeframe });
    setActions([]);
    setTextValue(date);
    setExtraDates([]);
  }

  // Build price chart
  useEffect(() => {
    if (!containerRef.current || !bars.length) return;
    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(containerRef.current, {
      height: 200,
      layout: { background: { color: 'transparent' }, textColor: cv('--text-primary') || '#e5e7eb' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.1)', fixLeftEdge: false, fixRightEdge: false },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      crosshair: { mode: 1 },
      handleScroll: true,
      handleScale: true,
    });

    const offset = DateUtils.etOffsetSeconds(new Date(bars[0].t));
    tzOffsetRef.current = offset;
    const toTime = (b: AlpacaBar) => DateUtils.toEtChartTime(b.t, offset);

    let series: ISeriesApi<SeriesType>;
    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      series.setData(bars.map((b) => ({ time: toTime(b), open: b.o, high: b.h, low: b.l, close: b.c })));
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#22c55e',
        topColor: '#22c55e55',
        bottomColor: '#22c55e00',
        lineWidth: 2,
      });
      series.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    } else {
      series = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2 });
      series.setData(bars.map((b) => ({ time: toTime(b), value: b.c })));
    }

    // Peer overlays — separate price scale per peer so different price ranges display cleanly
    peerBars.forEach(({ ticker: peerTicker, bars: pb }, i) => {
      if (!pb.length) return;
      const color = PEER_COLORS[i % PEER_COLORS.length];
      const scaleId = `peer_${i}`;
      const peerSeries = chart.addSeries(LineSeries, { color, lineWidth: 1, priceScaleId: scaleId, title: peerTicker });
      chart.priceScale(scaleId).applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
      peerSeries.setData(pb.map((b) => ({ time: toTime(b), value: b.c })));
    });

    chart.timeScale().fitContent();

    const chartTimeToIso = (t: number) => new Date((t - offset) * 1000).toISOString();

    let lastHoveredBar: { iso: string } | null = null;
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) { lastHoveredBar = null; return; }
      lastHoveredBar = { iso: chartTimeToIso(param.time as unknown as number) };
    });
    chart.subscribeClick((param) => {
      if (!param.time) return;
      const iso = chartTimeToIso(param.time as unknown as number);
      const val = Math.max(0.01, Number(valueRef.current) || 100);
      const newAction: Action = { id: nextActionId++, timestamp: iso, time: DateUtils.fmtTime(iso), side: 'buy', value: val };
      setActions((prev) => {
        const next = [...prev, newAction];
        setTextValue(actionsToText(query.date, next));
        return next;
      });
    });

    const el = containerRef.current!;
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      if (!lastHoveredBar) return;
      const val = Math.min(100, Math.max(0.01, Number(valueRef.current) || 50));
      const iso = lastHoveredBar.iso;
      const newAction: Action = { id: nextActionId++, timestamp: iso, time: DateUtils.fmtTime(iso), side: 'sell', value: val };
      setActions((prev) => {
        const next = [...prev, newAction];
        setTextValue(actionsToText(query.date, next));
        return next;
      });
    }
    el.addEventListener('contextmenu', onContextMenu);
    chartRef.current = { chart, series };
    syncMarkers(series, actions, selectedEvent, query.date, offset);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(el);

    return () => {
      el.removeEventListener('contextmenu', onContextMenu);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartType, peerBars]);

  // Sync action + event markers onto chart
  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;
    syncMarkers(ref.series, actions, selectedEvent, query.date, tzOffsetRef.current);
  }, [actions, selectedEvent, query.date]);

  const addManualAction = useCallback(() => {
    if (!manualTime) return;
    const val = Math.max(0.01, Number(value) || (nextSide === 'buy' ? 100 : 50));
    const iso = DateUtils.timeToIso(manualTime, query.date);
    const newAction: Action = { id: nextActionId++, timestamp: iso, time: manualTime, side: nextSide, value: val };
    setActions((prev) => {
      const next = [...prev, newAction];
      setTextValue(actionsToText(query.date, next));
      return next;
    });
    setManualTime('');
  }, [manualTime, nextSide, value, query.date]);

  const removeAction = useCallback(
    (id: number) => {
      setActions((prev) => {
        const next = prev.filter((a) => a.id !== id);
        setTextValue(actionsToText(query.date, next));
        return next;
      });
    },
    [query.date],
  );

  const updateAction = useCallback(
    (id: number, field: 'side' | 'value', val: string) => {
      setActions((prev) => {
        const next = prev.map((a) => {
          if (a.id !== id) return a;
          if (field === 'value') return { ...a, value: a.side === 'sell' ? Math.min(100, Number(val)) : Number(val) };
          const newSide = val as Side;
          return { ...a, side: newSide, value: newSide === 'sell' ? Math.min(100, a.value) : a.value };
        });
        setTextValue(actionsToText(query.date, next));
        return next;
      });
    },
    [query.date],
  );

  const clear = useCallback(() => {
    setActions([]);
    setTextValue(query.date);
    setNextSide('buy');
  }, [query.date]);

  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const { stats, transactions } = simResultToExportArgs(result);
    exportSimPdf(
      ticker,
      stats,
      transactions,
      [
        { ref: containerRef.current, label: 'Price Chart' },
        { ref: portfolioChartRef.current, label: 'Portfolio Value' },
      ],
      'Time (ET)',
    );
  }, [result, ticker]);

  const portfolioMarkers = useMemo(
    () => result?.transactions.map((t) => ({ time: t.time, side: t.side, value: t.value, shares: t.shares })) ?? [],
    [result],
  );

  const profitColor = result ? (result.profit >= 0 ? 'var(--color-green)' : 'var(--color-red)') : undefined;

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      {/* Controls */}
      <form className="dtrade-order-controls" onSubmit={handleLoad}>
        {bars.length > 0 && (
          <>
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
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="dtrade-shares-input"
              />
              <span className="dtrade-label">$ buy / % sell</span>
            </div>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {tickerOptions.length > 0 && (
            <Select value={ticker} onValueChange={handleCompanySelect}>
              <SelectTrigger className="alpaca-input" style={{ width: '110px' }}>
                <SelectValue placeholder="Ticker" />
              </SelectTrigger>
              <SelectContent>
                {tickerOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {eventsData && eventsData.length > 0 && (
            <Select value={selectedEvent?.event ?? ''} onValueChange={handleEventSelect}>
              <SelectTrigger className="alpaca-input" style={{ width: '220px' }}>
                <SelectValue placeholder="Events…" />
              </SelectTrigger>
              <SelectContent>
                {eventsData.map((ev) => (
                  <SelectItem key={ev.rank} value={ev.event}>
                    #{ev.rank} {ev.ticker} — {ev.event.slice(0, 40)}
                    {ev.event.length > 40 ? '…' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <input
            className="alpaca-input"
            type="date"
            value={date}
            max={DateUtils.lastWeekday(DateUtils.todayStr())}
            onChange={(e) => {
              setDate(e.target.value);
              syncTextDate(e.target.value);
              setSelectedEvent(null);
            }}
          />
          <select className="alpaca-input" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {MarketUtils.TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button className="alpaca-btn" type="submit">
            Load
          </button>
        </div>
      </form>

      {/* Event card */}
      {selectedEvent && <IntradayEventCard event={selectedEvent} />}

      {bars.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
            {selectedEvent && selectedEvent.peers.length > 0 && (
              <button
                className={`sim-chart-btn${showPeers ? ' active' : ''}`}
                onClick={() => setShowPeers((v) => !v)}
                type="button"
                style={showPeers ? { borderColor: '#f59e0b', color: '#f59e0b' } : undefined}
              >
                Peers ({selectedEvent.peers.slice(0, 4).join(', ')})
              </button>
            )}
            <button
              className={`sim-chart-btn${hasPrev ? ' active' : ''}`}
              onClick={() => setExtraDates((prev) => [...new Set([...prev, prevDate])])}
              type="button"
              disabled={hasPrev}
            >
              + Day before
            </button>
            <button
              className={`sim-chart-btn${hasNext ? ' active' : ''}`}
              onClick={() => setExtraDates((prev) => [...new Set([...prev, nextDate])])}
              type="button"
              disabled={hasNext}
            >
              + Day after
            </button>
          </div>
          <div className="dtrade-chart-hint">
            Left click to buy ${value} · Right click to sell {value}%
            {showPeers && peerTickers.length > 0 && (
              <span style={{ marginLeft: 8 }}>
                {peerTickers.map((t, i) => (
                  <span key={t} style={{ color: PEER_COLORS[i], marginLeft: 6 }}>■ {t}</span>
                ))}
              </span>
            )}
          </div>
          <div ref={containerRef} className="alpaca-chart-container" />

          <SimToolbar
            presets={INTRADAY_SIM_PRESETS}
            onPreset={applyPreset}
            textMode={textMode}
            onTextModeToggle={() => {
              if (!textMode) setTextValue(actionsToText(query.date, actions));
              setTextMode((v) => !v);
            }}
            hasResult={!!result}
            onExportPdf={handleExportPdf}
            hasActions={actions.length > 0}
            onClear={clear}
          />

          {textMode && (
            <Textarea
              value={textValue}
              onChange={handleTextChange}
              placeholder={'2025-01-27\n09:30, 100\n10:15, -50'}
              rows={Math.max(4, actions.length + 2)}
              className="sim-textarea"
            />
          )}

          <SimManualEntry
            side={nextSide}
            onSideChange={setNextSide}
            value={value}
            onValueChange={setValue}
            onAdd={addManualAction}
            inputSlot={
              <input
                className="alpaca-input"
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
              />
            }
          />

          {!textMode && actions.length > 0 && (
            <div className="dtrade-orders">
              <div className="dtrade-section-title">Actions</div>
              <table className="sim-table">
                <thead>
                  <tr>
                    {['Time (ET)', 'Side', 'Value', ''].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...actions]
                    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                    .map((a) => (
                      <tr key={a.id}>
                        <td>{a.time}</td>
                        <td>
                          <select
                            className="dtrade-inline-select"
                            value={a.side}
                            onChange={(e) => updateAction(a.id, 'side', e.target.value)}
                          >
                            <option value="buy">BUY</option>
                            <option value="sell">SELL</option>
                          </select>
                        </td>
                        <td>
                          <input
                            className="dtrade-inline-input"
                            type="number"
                            min="0"
                            max={a.side === 'sell' ? 100 : undefined}
                            step="any"
                            value={a.value}
                            onChange={(e) => updateAction(a.id, 'value', e.target.value)}
                          />
                          <span className="dtrade-unit">{a.side === 'buy' ? '$' : '%'}</span>
                        </td>
                        <td>
                          <Button variant="ghost" onClick={() => removeAction(a.id)} className="dtrade-remove">
                            ✕
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {result && result.transactions.length > 0 && (
            <SimResults
              ref={portfolioChartRef}
              stats={[
                { label: 'Total invested', value: PriceUtils.fmt(result.totalInvested) },
                { label: 'Shares held', value: result.finalShares.toFixed(4) },
                { label: 'Shares value', value: PriceUtils.fmt(result.sharesValue) },
                { label: 'Cash withdrawn', value: PriceUtils.fmt(result.cashWithdrawn) },
                {
                  label: 'Profit',
                  value: (result.profit >= 0 ? '+' : '') + PriceUtils.fmt(result.profit),
                  color: profitColor,
                },
                {
                  label: 'Profit %',
                  value: (result.profitPct >= 0 ? '+' : '') + result.profitPct.toFixed(2) + '%',
                  color: profitColor,
                },
              ]}
              history={result.portfolioHistory}
              markers={portfolioMarkers}
              transactions={result.transactions}
              intraday
            />
          )}
        </>
      )}
    </div>
  );
}
