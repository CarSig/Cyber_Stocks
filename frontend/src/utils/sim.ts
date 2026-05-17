export type Side = 'buy' | 'sell';

export type Action = {
  id: number;
  timestamp: string;
  time: string;
  side: Side;
  value: number;
};

export type Transaction = {
  time: string;
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
