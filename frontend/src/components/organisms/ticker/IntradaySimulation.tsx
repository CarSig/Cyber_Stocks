import { useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { syncIntradayMarkers } from '@/components/organisms/charts/utils/markers';
import { setupDayLines } from '@/components/organisms/charts/utils/dayLines';
import { getBars, getIntradayEvents } from '@/api/alpaca';
import type { AlpacaBar } from '@/types';
import type { IntradayEvent } from '@/api/alpaca';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FilterSelect from '@/components/molecules/shared/FilterSelect';
import SimToolbar from './sim/SimToolbar';
import SimManualEntry from './sim/SimManualEntry';
import SimResults from './sim/SimResults';
import IntradayEventCard from './sim/IntradayEventCard';
import SimOrderControls from './sim/SimOrderControls';
import SimAllDialog from './sim/SimAllDialog';
import { intradaySimReducer, initialIntradaySimState } from './sim/intradaySimReducer';
import type { SimAllRow } from './sim/intradaySimReducer';
import { exportSimPdf } from './sim/simExportPdf';
import { DateUtils } from '@/utils/date';
import { PriceUtils } from '@/utils/price';

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
import { runLongSimulation, runShortSimulation, buildSimStats, simResultToExportArgs } from '@/utils/sim';

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
    actions.push({
      id: nextId++,
      timestamp: DateUtils.timeToIso(timeStr, effectiveDate),
      time: timeStr,
      side,
      value: val,
    });
  }
  return { parsedDate, actions };
}

function actionsToText(date: string, actions: Action[]): string {
  return [date, ...actions.map((a) => `${a.time}, ${a.side === 'sell' ? -a.value : a.value}`)].join('\n');
}

let nextActionId = 1;

type ChartRef = { chart: IChartApi; series: ISeriesApi<SeriesType> } | null;

export default function IntradaySimulation() {
  const [s, dispatch] = useReducer(intradaySimReducer, undefined, initialIntradaySimState);
  const {
    date,
    timeframe,
    query,
    actions,
    nextSide,
    value,
    startShares,
    manualTime,
    textMode,
    textValue,
    chartType,
    tradeMode,
    selectedEvent,
    showPeers,
    extraDates,
    simAllResults,
    simAllRunning,
    aiDelay,
  } = s;

  const queryClient = useQueryClient();

  const containerRef = useRef<HTMLDivElement>(null);
  const dayLinesRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartRef>(null);
  const portfolioChartRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<string>(value);
  const tradeModeRef = useRef<'long' | 'short'>(tradeMode);
  const tzOffsetRef = useRef<number>(0);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);

  const { data: eventsData } = useQuery<IntradayEvent[]>({
    queryKey: ['intraday-events'],
    queryFn: getIntradayEvents,
    staleTime: Infinity,
  });

  const { data, isPending, error } = useQuery<{ symbol: string; bars: AlpacaBar[] }>({
    queryKey: ['alpaca-bars', query.ticker, query.date, query.timeframe],
    queryFn: () => getBars(query.ticker, query.date, query.timeframe),
    enabled: Boolean(query.ticker && query.date),
    staleTime: 5 * 60 * 1000,
  });

  const allDates = useMemo(() => {
    const set = new Set([query.date, ...extraDates]);
    return Array.from(set).sort();
  }, [query.date, extraDates]);
  const earliestDate = allDates[0] ?? query.date;
  const latestDate = allDates[allDates.length - 1] ?? query.date;
  const prevDate = useMemo(() => DateUtils.prevWeekday(earliestDate), [earliestDate]);
  const nextDate = useMemo(() => DateUtils.nextWeekday(latestDate), [latestDate]);

  const extraQueries = useQueries({
    queries: extraDates.map((d) => ({
      queryKey: ['alpaca-bars', query.ticker, d, query.timeframe] as const,
      queryFn: () => getBars(query.ticker, d, query.timeframe),
      enabled: Boolean(query.ticker && d),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const bars = useMemo(() => {
    const all = [...extraQueries.flatMap((q) => q.data?.bars ?? []), ...(data?.bars ?? [])];
    return all.sort((a, b) => a.t.localeCompare(b.t));
  }, [data, extraQueries]);

  const peerTickers = useMemo(
    () => (showPeers && selectedEvent ? selectedEvent.peers.slice(0, 4) : []),
    [showPeers, selectedEvent],
  );

  const PEER_COLORS = ['#f59e0b', '#60a5fa', '#f472b6', '#34d399'];

  const peerQueryResults = useQueries({
    queries: peerTickers.map((t) => ({
      queryKey: ['alpaca-bars', t, query.date, query.timeframe] as const,
      queryFn: () => getBars(t, query.date, query.timeframe),
      enabled: Boolean(t && query.date),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const peerBars = useMemo(
    () => peerTickers.map((t, i) => ({ ticker: t, bars: peerQueryResults[i]?.data?.bars ?? [] })),
    [peerTickers, peerQueryResults],
  );

  const result = useMemo<SimResult | null>(() => {
    if (!bars.length || !actions.length) return null;
    if (tradeMode === 'short') return runShortSimulation(bars, actions, DateUtils.fmtTime);
    return runLongSimulation(bars, actions, DateUtils.fmtTime, Math.max(0, Number(startShares) || 0));
  }, [bars, actions, startShares, tradeMode]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const { parsedDate, actions: parsed } = parseIntradayText(raw, query.date);
      dispatch({
        type: 'SET_TEXT',
        raw,
        parsedDate: parsedDate ?? undefined,
        parsedActions: parsed.length ? parsed : undefined,
      });
    },
    [query.date],
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
      dispatch({ type: 'SET_ACTIONS', actions: newActions, textValue: actionsToText(query.date, newActions) });
    },
    [query.date],
  );

  const handleEventSelect = useCallback(
    (eventLabel: string | null) => {
      if (!eventLabel) return;
      const ev = eventsData?.find((e) => e.event === eventLabel);
      if (!ev) return;
      dispatch({ type: 'LOAD_EVENT', event: ev, timeframe });
    },
    [eventsData, timeframe],
  );

  function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'LOAD_BARS', ticker: query.ticker, date, timeframe });
  }

  // Build price chart
  useEffect(() => {
    if (!containerRef.current || !bars.length) return;
    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(containerRef.current, {
      height: 200,
      layout: { background: { color: 'transparent' }, textColor: cv('--text-primary') || '#e5e7eb' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255,255,255,0.1)',
        fixLeftEdge: false,
        fixRightEdge: false,
        tickMarkFormatter: (time: number, tickMarkType: number) => {
          const d = new Date(time * 1000);
          const hh = String(d.getUTCHours()).padStart(2, '0');
          const mm = String(d.getUTCMinutes()).padStart(2, '0');
          // tickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
          if (tickMarkType <= 2) {
            const day = d.getUTCDate();
            const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
            return `${day} ${mon} ${hh}:${mm}`;
          }
          return `${hh}:${mm}`;
        },
      },
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
      if (!param.time) {
        lastHoveredBar = null;
        return;
      }
      lastHoveredBar = { iso: chartTimeToIso(param.time as unknown as number) };
    });
    chart.subscribeClick((param) => {
      if (!param.time) return;
      const iso = chartTimeToIso(param.time as unknown as number);
      const val = Math.max(0.01, Number(valueRef.current) || 100);
      const newAction: Action = {
        id: nextActionId++,
        timestamp: iso,
        time: DateUtils.fmtTime(iso),
        side: tradeModeRef.current === 'short' ? 'short' : 'buy',
        value: val,
      };
      dispatch({ type: 'ADD_ACTION', action: newAction });
    });

    const el = containerRef.current!;
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      if (!lastHoveredBar) return;
      const val = Math.min(100, Math.max(0.01, Number(valueRef.current) || 50));
      const iso = lastHoveredBar.iso;
      const newAction: Action = {
        id: nextActionId++,
        timestamp: iso,
        time: DateUtils.fmtTime(iso),
        side: tradeModeRef.current === 'short' ? 'cover' : 'sell',
        value: val,
      };
      dispatch({ type: 'ADD_ACTION', action: newAction });
    }
    el.addEventListener('contextmenu', onContextMenu);
    chartRef.current = { chart, series };
    syncIntradayMarkers(series, actions, selectedEvent, query.date, offset);

    const cleanupDayLines = dayLinesRef.current
      ? setupDayLines(chart, dayLinesRef.current, el, bars, offset)
      : () => {};

    return () => {
      el.removeEventListener('contextmenu', onContextMenu);
      cleanupDayLines();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, chartType, peerBars]);

  // Sync action + event markers onto chart
  useEffect(() => {
    const ref = chartRef.current;
    if (!ref) return;
    syncIntradayMarkers(ref.series, actions, selectedEvent, query.date, tzOffsetRef.current);
  }, [actions, selectedEvent, query.date]);

  const addManualAction = useCallback(() => {
    if (!manualTime) return;
    const val = Math.max(0.01, Number(value) || (nextSide === 'buy' ? 100 : 50));
    const iso = DateUtils.timeToIso(manualTime, query.date);
    const newAction: Action = { id: nextActionId++, timestamp: iso, time: manualTime, side: nextSide, value: val };
    dispatch({ type: 'ADD_ACTION', action: newAction });
    dispatch({ type: 'SET_MANUAL_TIME', time: '' });
  }, [manualTime, nextSide, value, query.date]);

  const removeAction = useCallback((id: number) => dispatch({ type: 'REMOVE_ACTION', id }), []);

  const updateAction = useCallback(
    (id: number, field: 'side' | 'value', val: string) => dispatch({ type: 'UPDATE_ACTION', id, field, val }),
    [],
  );

  const clear = useCallback(() => dispatch({ type: 'CLEAR_ACTIONS' }), []);

  const handleSimulateAll = useCallback(async () => {
    if (!eventsData?.length) return;
    dispatch({ type: 'SIM_ALL_START' });

    const simOne = async (ev: IntradayEvent): Promise<SimAllRow> => {
      const primaryTicker = ev.ticker.split('/')[0].trim();
      const idea = ev.trade_idea.toLowerCase();
      const tickerLower = primaryTicker.toLowerCase();
      let isShort = false;
      if (new RegExp(`${tickerLower}\\s+short`).test(idea)) isShort = true;
      else if (!new RegExp(`${tickerLower}\\s+long`).test(idea) && /\bshort\b/.test(idea) && !/\blong\b/.test(idea))
        isShort = true;
      const action = isShort ? ('short' as const) : ('buy' as const);

      try {
        const { bars } = await queryClient.fetchQuery({
          queryKey: ['alpaca-bars', primaryTicker, ev.chart_date, '5Min'],
          queryFn: () => getBars(primaryTicker, ev.chart_date, '5Min'),
          staleTime: Infinity,
        });
        const [ch, cm] = ev.chart_time.split(':').map(Number);
        const eventMinutes = ch * 60 + cm;
        const isPreMarket = eventMinutes < 9 * 60 + 30;
        const entryMinutes = Math.min(isPreMarket ? 9 * 60 + 30 : eventMinutes + aiDelay, 15 * 60 + 44);
        const entryTime = `${String(Math.floor(entryMinutes / 60)).padStart(2, '0')}:${String(entryMinutes % 60).padStart(2, '0')}`;

        if (!bars.length)
          return {
            rank: ev.rank,
            ticker: primaryTicker,
            event: ev.event,
            trade_idea: ev.trade_idea,
            action,
            chartTime: ev.chart_time,
            preMarket: isPreMarket,
            entryTime,
            profitPct: null,
            error: 'No data',
          };

        const entryIso = DateUtils.timeToIso(entryTime, ev.chart_date);
        const exitIso = DateUtils.timeToIso('15:45', ev.chart_date);
        const actions: Action[] = [
          { id: 1, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
          { id: 2, timestamp: exitIso, time: '15:45', side: isShort ? 'cover' : 'sell', value: 100 },
        ];

        const result = isShort
          ? runShortSimulation(bars, actions, DateUtils.fmtTime)
          : runLongSimulation(bars, actions, DateUtils.fmtTime, 0);

        return {
          rank: ev.rank,
          ticker: primaryTicker,
          event: ev.event,
          trade_idea: ev.trade_idea,
          action,
          chartTime: ev.chart_time,
          preMarket: isPreMarket,
          entryTime,
          profitPct: result.profitPct,
        };
      } catch (err) {
        return {
          rank: ev.rank,
          ticker: primaryTicker,
          event: ev.event,
          trade_idea: ev.trade_idea,
          action,
          chartTime: ev.chart_time,
          preMarket: false,
          entryTime: '09:30',
          profitPct: null,
          error: err instanceof Error ? err.message : 'Failed',
        };
      }
    };

    // Run in batches of 4 to avoid rate-limiting
    const BATCH = 4;
    const rows: SimAllRow[] = [];
    for (let i = 0; i < eventsData.length; i += BATCH) {
      const batch = eventsData.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(simOne));
      rows.push(...results);
    }

    rows.sort((a, b) => (b.profitPct ?? -Infinity) - (a.profitPct ?? -Infinity));
    dispatch({ type: 'SIM_ALL_DONE', results: rows });
  }, [eventsData, aiDelay, queryClient]);

  const handleAiSim = useCallback(() => {
    if (!selectedEvent) return;
    const idea = selectedEvent.trade_idea.toLowerCase();
    const primaryTicker = selectedEvent.ticker.split('/')[0].trim();

    // Determine direction for the primary ticker
    // Patterns: "<ticker> short", "<ticker> long", "short", "long"
    const tickerLower = primaryTicker.toLowerCase();
    let isShort = false;
    const tickerShortMatch = new RegExp(`${tickerLower}\\s+short`).test(idea);
    const tickerLongMatch = new RegExp(`${tickerLower}\\s+long`).test(idea);
    if (tickerShortMatch) {
      isShort = true;
    } else if (tickerLongMatch) {
      isShort = false;
    } else if (/\bshort\b/.test(idea) && !/\blong\b/.test(idea)) {
      isShort = true;
    }

    const chartDate = selectedEvent.chart_date;
    const [ch, cm] = selectedEvent.chart_time.split(':').map(Number);
    const entryMinutes = Math.min(ch * 60 + cm + aiDelay, 15 * 60 + 44);
    const entryTime = `${String(Math.floor(entryMinutes / 60)).padStart(2, '0')}:${String(entryMinutes % 60).padStart(2, '0')}`;
    const exitTime = '15:45';
    const entryIso = DateUtils.timeToIso(entryTime, chartDate);
    const exitIso = DateUtils.timeToIso(exitTime, chartDate);

    const newActions: Action[] = [
      { id: nextActionId++, timestamp: entryIso, time: entryTime, side: isShort ? 'short' : 'buy', value: 100 },
      { id: nextActionId++, timestamp: exitIso, time: exitTime, side: isShort ? 'cover' : 'sell', value: 100 },
    ];

    const mode = isShort ? 'short' : 'long';
    dispatch({ type: 'SET_TRADE_MODE', mode });
    dispatch({ type: 'SET_ACTIONS', actions: newActions, textValue: actionsToText(chartDate, newActions) });
  }, [selectedEvent, aiDelay]);

  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const { stats, transactions } = simResultToExportArgs(result);
    exportSimPdf(
      query.ticker,
      stats,
      transactions,
      [
        { ref: containerRef.current, label: 'Price Chart' },
        { ref: portfolioChartRef.current, label: 'Portfolio Value' },
      ],
      'Time (ET)',
    );
  }, [result, query.ticker]);

  const portfolioMarkers = useMemo(
    () =>
      result?.transactions.map((t) => ({ time: t.timestamp, side: t.side, value: t.value, shares: t.shares })) ?? [],
    [result],
  );

  return (
    <div className="dtrade-sim">
      {isPending && <p className="alpaca-status">Loading…</p>}
      {error && <p className="alpaca-status alpaca-error">{(error as Error).message}</p>}

      {/* Controls */}
      <SimOrderControls
        tradeMode={tradeMode}
        onTradeModeChange={(mode) => dispatch({ type: 'SET_TRADE_MODE', mode })}
        startShares={startShares}
        onStartSharesChange={(v) => dispatch({ type: 'SET_START_SHARES', startShares: v })}
        value={value}
        onValueChange={(v) => dispatch({ type: 'SET_VALUE', value: v })}
        date={date}
        onDateChange={(d) => dispatch({ type: 'SET_DATE', date: d })}
        maxDate={DateUtils.lastWeekday(DateUtils.todayStr())}
        timeframe={timeframe}
        onTimeframeChange={(t) => dispatch({ type: 'SET_TIMEFRAME', timeframe: t })}
        eventSlot={
          eventsData && eventsData.length > 0 ? (
            <FilterSelect
              value={selectedEvent?.event ?? null}
              onChange={handleEventSelect}
              placeholder="Events…"
              showAll={false}
              className="alpaca-input w-55"
              options={eventsData.map((ev) => ({
                value: ev.event,
                label: `#${ev.rank} ${ev.ticker} — ${ev.event.slice(0, 40)}${ev.event.length > 40 ? '…' : ''}`,
              }))}
            />
          ) : undefined
        }
        onLoad={handleLoad}
        showTradeControls={bars.length > 0}
      />

      {/* Event card */}
      {selectedEvent && <IntradayEventCard event={selectedEvent} />}

      {bars.length > 0 && (
        <>
          <div
            style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}
          >
            {(['line', 'area', 'candlestick'] as const).map((t) => (
              <button
                key={t}
                className={`sim-chart-btn${chartType === t ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'SET_CHART_TYPE', chartType: t })}
                type="button"
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            {selectedEvent && selectedEvent.peers.length > 0 && (
              <button
                className={`sim-chart-btn${showPeers ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'TOGGLE_PEERS' })}
                type="button"
                style={showPeers ? { borderColor: '#f59e0b', color: '#f59e0b' } : undefined}
              >
                Peers ({selectedEvent.peers.slice(0, 4).join(', ')})
              </button>
            )}
            <button
              className="sim-chart-btn"
              onClick={() => dispatch({ type: 'ADD_EXTRA_DATE', date: prevDate })}
              type="button"
            >
              + Day before ({prevDate})
            </button>
            <button
              className="sim-chart-btn"
              onClick={() => dispatch({ type: 'ADD_EXTRA_DATE', date: nextDate })}
              type="button"
            >
              + Day after ({nextDate})
            </button>
            {extraDates.length > 0 && (
              <button className="sim-chart-btn" onClick={() => dispatch({ type: 'RESET_EXTRA_DATES' })} type="button">
                Reset days
              </button>
            )}
          </div>
          <div className="dtrade-chart-hint">
            {tradeMode === 'long'
              ? `Left click to buy $${value} · Right click to sell ${value}%`
              : `Left click to short $${value} · Right click to cover ${value}%`}
            {showPeers && peerTickers.length > 0 && (
              <span style={{ marginLeft: 8 }}>
                {peerTickers.map((t, i) => (
                  <span key={t} style={{ color: PEER_COLORS[i], marginLeft: 6 }}>
                    ■ {t}
                  </span>
                ))}
              </span>
            )}
          </div>
          <div ref={containerRef} className="alpaca-chart-container">
            <div ref={dayLinesRef} className="alpaca-chart-daylines" />
          </div>

          <SimToolbar
            presets={INTRADAY_SIM_PRESETS}
            onPreset={applyPreset}
            textMode={textMode}
            onTextModeToggle={() => dispatch({ type: 'TOGGLE_TEXT_MODE', currentActions: actions })}
            hasResult={!!result}
            onExportPdf={handleExportPdf}
            hasActions={actions.length > 0}
            onClear={clear}
            onAiSim={handleAiSim}
            aiSimDisabled={!selectedEvent}
            onSimulateAll={eventsData?.length ? handleSimulateAll : undefined}
            aiDelay={aiDelay}
            onAiDelayChange={(d) => dispatch({ type: 'SET_AI_DELAY', delay: d })}
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
            onSideChange={(s) => dispatch({ type: 'SET_NEXT_SIDE', side: s as Side })}
            sideOptions={
              tradeMode === 'long'
                ? [
                    { value: 'buy', label: 'Buy ($)' },
                    { value: 'sell', label: 'Sell (%)' },
                  ]
                : [
                    { value: 'short', label: 'Short ($)' },
                    { value: 'cover', label: 'Cover (%)' },
                  ]
            }
            value={value}
            onValueChange={(v) => dispatch({ type: 'SET_VALUE', value: v })}
            onAdd={addManualAction}
            inputSlot={
              <input
                className="alpaca-input"
                type="time"
                value={manualTime}
                onChange={(e) => dispatch({ type: 'SET_MANUAL_TIME', time: e.target.value })}
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
                            {tradeMode === 'long' ? (
                              <>
                                <option value="buy">BUY</option>
                                <option value="sell">SELL</option>
                              </>
                            ) : (
                              <>
                                <option value="short">SHORT</option>
                                <option value="cover">COVER</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td>
                          <input
                            className="dtrade-inline-input"
                            type="number"
                            min="0"
                            max={a.side === 'sell' || a.side === 'cover' ? 100 : undefined}
                            step="any"
                            value={a.value}
                            onChange={(e) => updateAction(a.id, 'value', e.target.value)}
                          />
                          <span className="dtrade-unit">{a.side === 'buy' || a.side === 'short' ? '$' : '%'}</span>
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
              stats={buildSimStats(result, tradeMode, PriceUtils.fmt)}
              history={result.portfolioHistory}
              markers={portfolioMarkers}
              transactions={result.transactions}
              intraday
            />
          )}
        </>
      )}

      <SimAllDialog
        open={simAllRunning || !!simAllResults}
        onClose={() => dispatch({ type: 'SIM_ALL_CLOSE' })}
        running={simAllRunning}
        results={simAllResults}
        aiDelay={aiDelay}
        onAiDelayChange={(d) => dispatch({ type: 'SET_AI_DELAY', delay: d })}
        onReload={handleSimulateAll}
      />
    </div>
  );
}
