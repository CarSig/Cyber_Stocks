import { volumeSpikePct } from './utils';
import type { Quote } from '@/types';

// Trading days before the filing used as the volume baseline for the spike calc.
export const VOL_BASELINE_DAYS = 20;

/** Price/volume/volatility reaction around a single filing date. All percentages.
 *  Null fields mean the underlying quote(s) weren't available. */
export type FilingSwing = {
  baselineClose: number; // last close BEFORE the filing date
  lagClose: number; // close `lagDays` trading days into the reaction window
  changePct: number; // signed baseline → lag move (price swing, signed)
  swing: number; // |changePct| (price swing magnitude)
  intradayPct: number | null; // filing-day open → close
  trueRangePct: number | null; // filing-day True Range vs prev close (gap + intraday)
  volSpikePct: number | null; // filing-day volume vs prior-20d avg
};

// Index of the last quote strictly before `date`, or -1 if none. Assumes ascending.
export function findQuoteBefore(quotes: Quote[], date: string): number {
  let lo = 0;
  let hi = quotes.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (quotes[mid].date < date) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

// Index of the first quote on or after `date`, or -1 if none. Assumes ascending.
export function findQuoteOnOrAfter(quotes: Quote[], date: string): number {
  let lo = 0;
  let hi = quotes.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (quotes[mid].date >= date) {
      result = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return result;
}

/**
 * Compute the price/volume/volatility reaction around `filingDate`.
 *
 * Baseline = last close before the filing (the market hadn't seen it yet).
 * Reaction = close `lagDays` trading days into the window starting on/after the
 * filing date. Returns null when there's no usable quote coverage for either end.
 *
 * `sortedQuotes` MUST be ascending by date. Reused by the impact table and the
 * scanned-incident cards so the definitions stay identical everywhere.
 */
export function computeFilingSwing(sortedQuotes: Quote[], filingDate: string, lagDays = 1): FilingSwing | null {
  const baseIdx = findQuoteBefore(sortedQuotes, filingDate);
  if (baseIdx === -1) return null;

  const firstReactionIdx = findQuoteOnOrAfter(sortedQuotes, filingDate);
  if (firstReactionIdx === -1) return null;
  const lagIdx = firstReactionIdx + lagDays - 1;
  if (lagIdx >= sortedQuotes.length) return null;

  const baselineClose = sortedQuotes[baseIdx].close;
  const lagClose = sortedQuotes[lagIdx].close;
  if (baselineClose == null || lagClose == null) return null;

  const changePct = ((lagClose - baselineClose) / baselineClose) * 100;
  const swing = Math.abs(changePct);

  const filingDayQuote = sortedQuotes.find((q) => q.date === filingDate);
  const intradayPct =
    filingDayQuote && filingDayQuote.open
      ? ((filingDayQuote.close - filingDayQuote.open) / filingDayQuote.open) * 100
      : null;

  // True Range vs prior close: overnight gap from baselineClose + intraday swing.
  const trueRangePct =
    filingDayQuote && baselineClose
      ? ((Math.max(filingDayQuote.high, baselineClose) - Math.min(filingDayQuote.low, baselineClose)) / baselineClose) *
        100
      : null;

  // Volume spike: filing-day volume vs avg of the prior N trading days (window
  // ending at baseIdx, before the market saw the filing).
  const priorVols = sortedQuotes.slice(Math.max(0, baseIdx - VOL_BASELINE_DAYS + 1), baseIdx + 1).map((q) => q.volume);
  const volSpikePct = volumeSpikePct(filingDayQuote?.volume, priorVols);

  return { baselineClose, lagClose, changePct, swing, intradayPct, trueRangePct, volSpikePct };
}
