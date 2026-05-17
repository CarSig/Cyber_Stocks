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
