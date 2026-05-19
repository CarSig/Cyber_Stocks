import { DateUtils } from '@/utils/date';

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
    '1Min': 1, '5Min': 5, '15Min': 15, '30Min': 30, '1Hour': 60,
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

/** Returns the exit time based on user preference: last bar of the timeframe or 15:45 (avoid volatility). */
export function getExitTime(exitAtClose: boolean, timeframe = '1Min'): string {
  return exitAtClose ? lastBarTime(timeframe) : '15:45';
}

/** @deprecated Use calcEntryDateTime instead. */
export function calcEntryTime(chartTime: string, delayMinutes: number, isPreMarket: boolean): string {
  const [h, m] = chartTime.split(':').map(Number);
  const eventMinutes = h * 60 + m;
  const entry = Math.min(isPreMarket ? 9 * 60 + 30 : eventMinutes + delayMinutes, 15 * 60 + 44);
  return `${String(Math.floor(entry / 60)).padStart(2, '0')}:${String(entry % 60).padStart(2, '0')}`;
}
