export type Side = 'buy' | 'sell' | 'short' | 'cover';

export type Action = {
  id: number;
  timestamp: string;
  time: string;
  side: Side;
  value: number;
};

export type Transaction = {
  time: string;
  timestamp: string;
  side: Side;
  price: number;
  shares: number;
  value: number;
  sharesAfter: number;
  portfolioValue: number;
};

export type SimResult = {
  transactions: Transaction[];
  portfolioHistory: { time: string; value: number }[];
  totalInvested: number;
  cashWithdrawn: number;
  finalShares: number;
  sharesValue: number;
  profit: number;
  profitPct: number;
};

/** Long simulation: buy = spend $ to acquire shares; sell = exit as % of position. */
export function runLongSimulation(
  bars: { t: string; c: number; o: number }[],
  actions: Action[],
  fmtTime: (iso: string) => string,
  startShares = 0,
): SimResult {
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
      if (transactions.some((t) => t.time === fmtTime(act.timestamp) && t.side === act.side)) continue;
      if (act.side === 'buy') {
        const bought = act.value / price;
        shares += bought;
        totalInvested += act.value;
        transactions.push({ time: fmtTime(act.timestamp), timestamp: act.timestamp, side: 'buy', price, shares: bought, value: act.value, sharesAfter: shares, portfolioValue: shares * price });
      } else {
        const pct = Math.min(act.value, 100) / 100;
        const sold = shares * pct;
        const proceeds = sold * price;
        shares -= sold;
        cashWithdrawn += proceeds;
        transactions.push({ time: fmtTime(act.timestamp), timestamp: act.timestamp, side: 'sell', price, shares: sold, value: proceeds, sharesAfter: shares, portfolioValue: shares * price });
      }
    }
    portfolioHistory.push({ time: barTime, value: shares * price });
  }

  const lastPrice = bars.at(-1)?.c ?? 0;
  const sharesValue = shares * lastPrice;
  const profit = sharesValue + cashWithdrawn - totalInvested;
  const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return { transactions, portfolioHistory, totalInvested, cashWithdrawn, finalShares: shares, sharesValue, profit, profitPct };
}

/** Build the stats rows for SimResults given a result and trade mode. */
export function buildSimStats(result: SimResult, tradeMode: 'long' | 'short', fmt: (v: number) => string) {
  const profitColor = result.profit >= 0 ? 'var(--color-green)' : 'var(--color-red)';
  const profitStr = (result.profit >= 0 ? '+' : '') + fmt(result.profit);
  const profitPctStr = (result.profitPct >= 0 ? '+' : '') + result.profitPct.toFixed(2) + '%';
  if (tradeMode === 'long') {
    return [
      { label: 'Total invested', value: fmt(result.totalInvested) },
      { label: 'Shares held', value: result.finalShares.toFixed(4) },
      { label: 'Shares value', value: fmt(result.sharesValue) },
      { label: 'Cash withdrawn', value: fmt(result.cashWithdrawn) },
      { label: 'Profit', value: profitStr, color: profitColor },
      { label: 'Profit %', value: profitPctStr, color: profitColor },
    ];
  }
  return [
    { label: 'Cash received', value: fmt(result.totalInvested) },
    { label: 'Shares short', value: Math.abs(result.finalShares).toFixed(4) },
    { label: 'Remaining liability', value: fmt(Math.abs(result.sharesValue)) },
    { label: 'Cover cost', value: fmt(result.cashWithdrawn) },
    { label: 'Profit', value: profitStr, color: profitColor },
    { label: 'Profit %', value: profitPctStr, color: profitColor },
  ];
}

/** Format marker text for a given side and value. */
export function fmtMarkerText(side: Side, value: number): string {
  if (side === 'buy') return `B $${value}`;
  if (side === 'sell') return `S ${value}%`;
  if (side === 'short') return `Sh $${value}`;
  return `C ${value}%`;
}

/**
 * Short simulation: short = borrow & sell shares for $ proceeds; cover = buy back as % of short position.
 * sharesAfter is negative (short shares owed). portfolioValue = unrealized liability (negative = profit if price fell).
 * profit = cashReceived - coverCost - remaining liability at last price.
 */
export function runShortSimulation(
  bars: { t: string; c: number; o: number }[],
  actions: Action[],
  fmtTime: (iso: string) => string,
): SimResult {
  const sorted = [...actions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let sharesShort = 0; // shares borrowed & sold (positive = owed)
  let cashReceived = 0;
  let coverCost = 0;
  const transactions: Transaction[] = [];
  const portfolioHistory: { time: string; value: number }[] = [];

  for (const bar of bars) {
    const price = bar.c;
    const barTime = bar.t;
    for (const act of sorted) {
      if (act.timestamp > barTime) continue;
      if (transactions.some((t) => t.time === fmtTime(act.timestamp) && t.side === act.side)) continue;
      if (act.side === 'short') {
        const shorted = act.value / price;
        sharesShort += shorted;
        cashReceived += act.value;
        transactions.push({
          time: fmtTime(act.timestamp), timestamp: act.timestamp, side: 'short', price,
          shares: shorted, value: act.value,
          sharesAfter: -sharesShort, portfolioValue: -sharesShort * price,
        });
      } else if (act.side === 'cover') {
        const pct = Math.min(act.value, 100) / 100;
        const covered = sharesShort * pct;
        const cost = covered * price;
        sharesShort -= covered;
        coverCost += cost;
        transactions.push({
          time: fmtTime(act.timestamp), timestamp: act.timestamp, side: 'cover', price,
          shares: covered, value: cost,
          sharesAfter: -sharesShort, portfolioValue: -sharesShort * price,
        });
      }
    }
    // Portfolio value for short: cash received minus current liability
    portfolioHistory.push({ time: barTime, value: cashReceived - coverCost - sharesShort * price });
  }

  const lastPrice = bars.at(-1)?.c ?? 0;
  const remainingLiability = sharesShort * lastPrice;
  const profit = cashReceived - coverCost - remainingLiability;
  const totalInvested = cashReceived; // notional: total $ received from shorting
  const profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return {
    transactions,
    portfolioHistory,
    totalInvested: cashReceived,
    cashWithdrawn: coverCost,
    finalShares: -sharesShort,
    sharesValue: -remainingLiability,
    profit,
    profitPct,
  };
}

/** Build the stats and transactions args for exportSimPdf from a SimResult. */
type SimStats = { totalInvested: number; finalShares: number; sharesValue: number; cashWithdrawn: number; profit: number; profitPct: number };

export function simStatsToExportRows(result: SimStats) {
  const profitColor = result.profit >= 0 ? '#16a34a' : '#dc2626';
  return [
    { label: 'Total invested', value: `$${result.totalInvested.toFixed(2)}` },
    { label: 'Shares held', value: result.finalShares.toFixed(4) },
    { label: 'Shares value', value: `$${result.sharesValue.toFixed(2)}` },
    { label: 'Cash withdrawn', value: `$${result.cashWithdrawn.toFixed(2)}` },
    { label: 'Profit', value: (result.profit >= 0 ? '+' : '') + `$${result.profit.toFixed(2)}`, color: profitColor },
    { label: 'Profit %', value: (result.profitPct >= 0 ? '+' : '') + result.profitPct.toFixed(2) + '%', color: profitColor },
  ];
}

export function simResultToExportArgs(result: SimResult) {
  const stats = simStatsToExportRows(result);
  const transactions = result.transactions.map((t) => ({
    label: t.time,
    side: t.side,
    price: t.price,
    shares: t.shares,
    value: t.value,
    sharesAfter: t.sharesAfter,
    portfolioValue: t.portfolioValue,
  }));
  return { stats, transactions };
}
