import { DateUtils } from '@/utils/date';
import type { EntryStrategy, ExitStrategy } from '../reducers/intradayReducer';

/** Returns true if the trade idea indicates a short position for the given ticker. */
export function detectShortDirection(ticker: string, tradeIdea: string): boolean {
  const idea = tradeIdea.toLowerCase();
  const t = ticker.toLowerCase();
  if (new RegExp(`${t}\\s+short`).test(idea)) return true;
  if (new RegExp(`${t}\\s+long`).test(idea)) return false;
  return /\bshort\b/.test(idea) && !/\blong\b/.test(idea);
}

export function prevWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

export function nextWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

/** Returns the last bar open time for a given timeframe (16:00 minus one bar width). */
export function lastBarTime(timeframe: string): string {
  const minutes: Record<string, number> = {
    '1Min': 1,
    '5Min': 5,
    '15Min': 15,
    '30Min': 30,
    '1Hour': 60,
  };
  const barMinutes = minutes[timeframe] ?? 1;
  const total = 16 * 60 - barMinutes; // 960 - barMinutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Determines the entry datetime and exit date for a simulated trade.
 *
 * Rules:
 *  - pre-market:  entry at last bar of previous trading day, exit on chart_date (the event day)
 *  - post-market: entry at last bar of chart_date, exit on the next trading day
 *  - during:      entry at chart_time + delay (capped at one bar before close) on chart_date, exit same day
 */
export function calcEntryDateTime(
  chartTime: string,
  chartDate: string,
  delayMinutes: number,
  timing: 'pre-market' | 'post-market' | 'during',
  timeframe = '1Min',
): { entryTime: string; entryDate: string; exitDate: string } {
  const closeBarTime = lastBarTime(timeframe);

  if (timing === 'pre-market') {
    return {
      entryTime: closeBarTime,
      entryDate: prevWeekday(chartDate),
      exitDate: chartDate,
    };
  }

  if (timing === 'post-market') {
    // chart_date is already the next trading day (reaction day); entry at close of the event day
    return {
      entryTime: closeBarTime,
      entryDate: prevWeekday(chartDate),
      exitDate: chartDate,
    };
  }

  // during market: same day at chart_time + delay (capped at one bar before close)
  const [h, m] = chartTime.split(':').map(Number);
  const eventMinutes = h * 60 + m;
  const [ch, cm] = closeBarTime.split(':').map(Number);
  const entryMinutes = Math.min(eventMinutes + delayMinutes, ch * 60 + cm);
  const entryTime = `${String(Math.floor(entryMinutes / 60)).padStart(2, '0')}:${String(entryMinutes % 60).padStart(2, '0')}`;
  return { entryTime, entryDate: chartDate, exitDate: chartDate };
}

/** Returns true for all strategies that require bar-by-bar scanning to resolve the exit. */
export function isVolatilityStrategy(exitStrategy: ExitStrategy): boolean {
  return exitStrategy !== '15:45' && exitStrategy !== '15:59';
}

/** Returns a fixed exit time for simple time-based strategies. Volatility strategies return null (bar scanning needed). */
export function getExitTime(exitStrategy: ExitStrategy, timeframe = '1Min'): string | null {
  if (exitStrategy === '15:59') return lastBarTime(timeframe);
  if (exitStrategy === '15:45') return '15:45';
  return null; // volatility strategies resolve exit bar dynamically
}

/** Calculates entry date/time using the first-candle strategy (1 bar width after chart_time). */
export function calcEntryDateTimeForStrategy(
  _entryStrategy: EntryStrategy,
  chartTime: string,
  chartDate: string,
  _delayMinutes: number,
  timing: 'pre-market' | 'post-market' | 'during',
  timeframe = '1Min',
): { entryTime: string; entryDate: string; exitDate: string } {
  const minutes: Record<string, number> = { '1Min': 1, '5Min': 5, '15Min': 15, '30Min': 30, '1Hour': 60 };
  const barMinutes = minutes[timeframe] ?? 1;
  return calcEntryDateTime(chartTime, chartDate, barMinutes, timing, timeframe);
}

type VolBar = { t: string; o: number; h: number; l: number; c: number; v: number; vw: number };

type VolExitStrategy = ExitStrategy;

/**
 * Scans bars from the entry bar onward and returns the ISO timestamp of the first bar
 * satisfying the exit condition. Falls back to a time-stop when the condition is never met.
 *
 * vol-same-day     ATR exit: |close − entry| ≥ 1× entry-bar H-L range. Stop: 15:45 same day.
 * vol-next-day     2% move: |close − entry| ≥ 2% of entry price. Stop: 15:45 next trading day.
 * vol-hold         2× avg-volume spike, hold up to 5 days. Stop: last available bar.
 * vol-hold-3x      3× avg-volume spike (stricter), hold up to 5 days. Stop: last available bar.
 * vol-hold-eod     2× avg-volume but only checked on each day's closing bar. Stop: last available bar (5 days).
 * vol-hold-vwap    Exit when price crosses VWAP (long: close < vwap; short direction inferred from price vs entry). Stop: last available bar (5 days).
 * vol-hold-confirm Both 2% price move AND 1.5× volume on the same bar required. Stop: last available bar (5 days).
 */
export function resolveVolatilityExit(
  exitStrategy: VolExitStrategy,
  bars: VolBar[],
  entryIso: string,
  entryDate: string,
  timeframe = '1Min',
): string {
  const entryIdx = bars.findIndex((b) => b.t >= entryIso);
  if (entryIdx === -1) return DateUtils.timeToIso('15:45', entryDate);

  const entryBar = bars[entryIdx];
  const entryPrice = entryBar.c;

  // ── vol-same-day ─────────────────────────────────────────────────────────────
  if (exitStrategy === 'vol-same-day') {
    const atr = entryBar.h - entryBar.l;
    const threshold = atr > 0 ? atr : entryPrice * 0.01;
    for (let i = entryIdx + 1; i < bars.length; i++) {
      const b = bars[i];
      if (b.t.slice(0, 10) !== entryDate) break;
      if (Math.abs(b.c - entryPrice) >= threshold) return b.t;
    }
    return DateUtils.timeToIso('15:45', entryDate);
  }

  // ── vol-next-day ─────────────────────────────────────────────────────────────
  if (exitStrategy === 'vol-next-day') {
    const target = entryPrice * 0.02;
    const exitDay = nextWeekday(entryDate);
    for (let i = entryIdx + 1; i < bars.length; i++) {
      const b = bars[i];
      const day = b.t.slice(0, 10);
      if (day > exitDay) break;
      if (Math.abs(b.c - entryPrice) >= target) return b.t;
    }
    const last = bars.filter((b) => b.t.slice(0, 10) === exitDay).at(-1);
    return last ? last.t : DateUtils.timeToIso('15:45', exitDay);
  }

  // ── shared helpers for multi-day vol strategies ───────────────────────────────
  const preBars = bars.slice(0, entryIdx);
  const avgVol = preBars.length > 0 ? preBars.reduce((s, b) => s + b.v, 0) / preBars.length : 0;
  const maxDate = nextWeekday(nextWeekday(nextWeekday(nextWeekday(nextWeekday(entryDate)))));
  const postBars = bars.filter((b, i) => i > entryIdx && b.t.slice(0, 10) <= maxDate);
  const lastAvailableBar = postBars.at(-1)?.t ?? bars.at(-1)?.t ?? DateUtils.timeToIso('15:45', entryDate);

  // ── vol-hold: 2× volume spike ─────────────────────────────────────────────────
  if (exitStrategy === 'vol-hold') {
    for (const b of postBars) {
      if (avgVol > 0 && b.v >= avgVol * 2) return b.t;
    }
    return lastAvailableBar;
  }

  // ── vol-hold-3x: 3× volume spike (stricter) ───────────────────────────────────
  if (exitStrategy === 'vol-hold-3x') {
    for (const b of postBars) {
      if (avgVol > 0 && b.v >= avgVol * 3) return b.t;
    }
    return lastAvailableBar;
  }

  // ── vol-hold-eod: 2× volume but only on each day's last bar ──────────────────
  if (exitStrategy === 'vol-hold-eod') {
    const closeBarTimeStr = lastBarTime(timeframe);
    for (const b of postBars) {
      const barTime = b.t.slice(11, 16);
      if (barTime !== closeBarTimeStr) continue;
      if (avgVol > 0 && b.v >= avgVol * 2) return b.t;
    }
    return lastAvailableBar;
  }

  // ── vol-hold-vwap: exit when price crosses VWAP ───────────────────────────────
  if (exitStrategy === 'vol-hold-vwap') {
    // Determine direction from entry bar: long if entry price > entry VWAP, short otherwise
    const entryAboveVwap = entryPrice >= entryBar.vw;
    for (const b of postBars) {
      // Long: exit when close drops below VWAP. Short: exit when close rises above VWAP.
      const crossedVwap = entryAboveVwap ? b.c < b.vw : b.c > b.vw;
      if (crossedVwap) return b.t;
    }
    return lastAvailableBar;
  }

  // ── vol-hold-confirm: 2% price move AND 1.5× volume on same bar ──────────────
  for (const b of postBars) {
    const priceCondition = Math.abs(b.c - entryPrice) >= entryPrice * 0.02;
    const volCondition = avgVol > 0 && b.v >= avgVol * 1.5;
    if (priceCondition && volCondition) return b.t;
  }
  return lastAvailableBar;
}

/** @deprecated Use calcEntryDateTime instead. */
export function calcEntryTime(chartTime: string, delayMinutes: number, isPreMarket: boolean): string {
  const [h, m] = chartTime.split(':').map(Number);
  const eventMinutes = h * 60 + m;
  const entry = Math.min(isPreMarket ? 9 * 60 + 30 : eventMinutes + delayMinutes, 15 * 60 + 44);
  return `${String(Math.floor(entry / 60)).padStart(2, '0')}:${String(entry % 60).padStart(2, '0')}`;
}
