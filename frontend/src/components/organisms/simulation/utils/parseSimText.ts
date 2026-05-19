import type { Side, Action } from '@/utils/sim';
import { DateUtils } from '@/utils/date';

/**
 * Parses intraday-style text input (time, signedValue format).
 * Example:
 *   2025-01-15
 *   09:30, 100
 *   10:15, -50
 *
 * First line may be a date (YYYY-MM-DD). Subsequent lines are "HH:MM, signedNumber".
 * Positive number = buy, negative = sell.
 */
export function parseIntradayText(raw: string, date: string): { parsedDate: string | null; actions: Action[] } {
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

/**
 * Parses long-term style text input (date, signedValue format).
 * Example:
 *   2025-01-15, 100
 *   2025-06-01, -50
 *
 * Each line is "YYYY-MM-DD, signedNumber".
 * Positive number = buy, negative = sell.
 */
export function parseLongTermText(raw: string): { actions: { id: number; date: string; side: Side; value: string }[] } {
  let id = Date.now();
  const actions: { id: number; date: string; side: Side; value: string }[] = [];
  for (const line of raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)) {
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length !== 2) continue;
    const [label, numStr] = parts;
    const num = Number(numStr);
    if (isNaN(num) || num === 0) continue;
    actions.push({ id: id++, date: label, side: num > 0 ? 'buy' : 'sell', value: String(Math.abs(num)) });
  }
  return { actions };
}
