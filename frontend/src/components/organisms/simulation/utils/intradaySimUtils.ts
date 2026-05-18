/** Returns true if the trade idea indicates a short position for the given ticker. */
export function detectShortDirection(ticker: string, tradeIdea: string): boolean {
  const idea = tradeIdea.toLowerCase();
  const t = ticker.toLowerCase();
  if (new RegExp(`${t}\\s+short`).test(idea)) return true;
  if (new RegExp(`${t}\\s+long`).test(idea)) return false;
  return /\bshort\b/.test(idea) && !/\blong\b/.test(idea);
}

/** Converts a chart time string (HH:MM) and optional delay (minutes) into a clamped entry time string. */
export function calcEntryTime(chartTime: string, delayMinutes: number, isPreMarket: boolean): string {
  const [h, m] = chartTime.split(':').map(Number);
  const eventMinutes = h * 60 + m;
  const entry = Math.min(isPreMarket ? 9 * 60 + 30 : eventMinutes + delayMinutes, 15 * 60 + 44);
  return `${String(Math.floor(entry / 60)).padStart(2, '0')}:${String(entry % 60).padStart(2, '0')}`;
}
