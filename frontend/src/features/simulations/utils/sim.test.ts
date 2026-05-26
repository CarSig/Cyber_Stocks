import { describe, it, expect } from 'vitest';
import { runLongSimulation, runShortSimulation, buildSimStats, fmtMarkerText, simStatsToExportRows, simResultToExportArgs } from './sim';
import type { Action, SimResult } from './sim';

const fmt = (iso: string) => iso.slice(0, 10);
const dollar = (v: number) => `$${v.toFixed(2)}`;

function makeBar(t: string, c: number, o = c) {
  return { t, c, o };
}

function makeAction(id: number, timestamp: string, side: Action['side'], value: number): Action {
  return { id, timestamp, time: timestamp.slice(11, 16), side, value };
}

// ─── runLongSimulation ────────────────────────────────────────────────────────
//
// The engine checks `act.timestamp > barTime` using string comparison.
// Bar times are date strings like "2024-01-01". Timestamps like "2024-01-01T..."
// are lexicographically greater than "2024-01-01", so an action timestamped on
// day 1 only fires when bar.t >= action.timestamp — meaning it fires on day 2+.
// To have an action fire on bar N, timestamp it before that bar's date string.

describe('runLongSimulation', () => {
  // Bar times as plain date strings — must be lexicographically comparable with timestamps
  const bars = [makeBar('2024-01-01', 100), makeBar('2024-01-02', 110), makeBar('2024-01-03', 105)];

  it('returns zero result for no actions', () => {
    const result = runLongSimulation(bars, [], fmt);
    expect(result.totalInvested).toBe(0);
    expect(result.finalShares).toBe(0);
    expect(result.transactions).toHaveLength(0);
    expect(result.portfolioHistory).toHaveLength(bars.length);
  });

  it('buys shares at bar close price', () => {
    // Timestamp '2024-01-01' <= barTime '2024-01-01', so fires on first bar at price 100.
    // Spend $100, shares = 100/100 = 1.
    const actions = [makeAction(1, '2024-01-01', 'buy', 100)];
    const result = runLongSimulation(bars, actions, fmt);
    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    expect(tx.side).toBe('buy');
    expect(tx.price).toBe(100);
    expect(tx.shares).toBeCloseTo(1, 5);
    expect(result.totalInvested).toBe(100);
  });

  it('sells as percentage of position', () => {
    // Buy on bar 1 (price=100): spend $110 → 1.1 shares
    // Sell 50% on bar 2 (price=110): 0.55 shares * 110 = $60.5
    const actions = [makeAction(1, '2024-01-01', 'buy', 110), makeAction(2, '2024-01-02', 'sell', 50)];
    const result = runLongSimulation(bars, actions, fmt);
    expect(result.transactions).toHaveLength(2);
    const sellTx = result.transactions[1];
    expect(sellTx.side).toBe('sell');
    expect(sellTx.shares).toBeCloseTo(0.55, 5); // 1.1 * 0.5
    expect(sellTx.value).toBeCloseTo(60.5, 5); // 0.55 * 110
    expect(result.cashWithdrawn).toBeCloseTo(60.5, 5);
  });

  it('caps sell at 100% of position', () => {
    const actions = [
      makeAction(1, '2024-01-01', 'buy', 100),
      makeAction(2, '2024-01-02', 'sell', 200), // 200% → capped at 100%
    ];
    const result = runLongSimulation(bars, actions, fmt);
    const buyShares = result.transactions[0].shares;
    const sellShares = result.transactions[1].shares;
    expect(sellShares).toBeCloseTo(buyShares, 5);
  });

  it('does not execute the same action twice', () => {
    const actions = [makeAction(1, '2024-01-01', 'buy', 100)];
    const result = runLongSimulation(bars, actions, fmt);
    expect(result.transactions.filter((t) => t.side === 'buy')).toHaveLength(1);
  });

  it('computes profit correctly (buy then hold)', () => {
    // Buy $100 at price 100 = 1 share. Last bar price = 105.
    const actions = [makeAction(1, '2024-01-01', 'buy', 100)];
    const result = runLongSimulation(bars, actions, fmt);
    expect(result.sharesValue).toBeCloseTo(105, 5);
    expect(result.profit).toBeCloseTo(5, 5);
    expect(result.profitPct).toBeCloseTo(5, 3);
  });

  it('accounts for startShares', () => {
    const result = runLongSimulation(bars, [], fmt, 2);
    // 2 shares at open 100 = totalInvested 200
    expect(result.totalInvested).toBe(200);
    expect(result.finalShares).toBe(2);
  });

  it('portfolioHistory has one entry per bar', () => {
    const result = runLongSimulation(bars, [], fmt);
    expect(result.portfolioHistory).toHaveLength(bars.length);
  });

  it('sorts actions by timestamp before processing', () => {
    const actions = [makeAction(2, '2024-01-02', 'sell', 50), makeAction(1, '2024-01-01', 'buy', 100)];
    const result = runLongSimulation(bars, actions, fmt);
    // First tx should be the buy even though sell was listed first
    expect(result.transactions[0].side).toBe('buy');
  });

  it('profitPct is 0 when totalInvested is 0', () => {
    const result = runLongSimulation(bars, [], fmt);
    expect(result.profitPct).toBe(0);
  });
});

// ─── runShortSimulation ───────────────────────────────────────────────────────

describe('runShortSimulation', () => {
  // Same timestamp convention as long sim: timestamp before bar date to fire on that bar.
  const bars = [makeBar('2024-01-01', 100), makeBar('2024-01-02', 90), makeBar('2024-01-03', 80)];

  it('returns zero result for no actions', () => {
    const result = runShortSimulation(bars, [], fmt);
    expect(result.totalInvested).toBe(0);
    // -0 === 0 in JS but not Object.is — use toBeCloseTo or >=/<= check
    expect(Math.abs(result.finalShares)).toBe(0);
    expect(result.transactions).toHaveLength(0);
  });

  it('shorts shares receiving cash at close price', () => {
    // Timestamp '2024-01-01' fires on bar 2024-01-01 (price=100).
    // Spend $100 worth short → 100/100 = 1 share borrowed.
    const actions = [makeAction(1, '2024-01-01', 'short', 100)];
    const result = runShortSimulation(bars, actions, fmt);
    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    expect(tx.side).toBe('short');
    expect(tx.price).toBe(100);
    expect(tx.shares).toBeCloseTo(1, 5);
    expect(result.totalInvested).toBe(100); // cash received
  });

  it('covers as percentage of short position', () => {
    // Short on bar 1 (price=100) → 1 share. Cover 100% on bar 2 (price=90) → cost $90.
    const actions = [makeAction(1, '2024-01-01', 'short', 100), makeAction(2, '2024-01-02', 'cover', 100)];
    const result = runShortSimulation(bars, actions, fmt);
    expect(result.transactions).toHaveLength(2);
    const coverTx = result.transactions[1];
    expect(coverTx.side).toBe('cover');
    expect(coverTx.value).toBeCloseTo(90, 5); // 1 share * 90
  });

  it('profit is positive when price falls (short wins)', () => {
    // Short 1 share at 100. Last price = 80. Profit = 100 - 80 = 20.
    const actions = [makeAction(1, '2024-01-01', 'short', 100)];
    const result = runShortSimulation(bars, actions, fmt);
    expect(result.profit).toBeCloseTo(20, 3);
  });

  it('finalShares is negative (short position owed)', () => {
    const actions = [makeAction(1, '2024-01-01', 'short', 100)];
    const result = runShortSimulation(bars, actions, fmt);
    expect(result.finalShares).toBeLessThan(0);
  });

  it('does not execute same action twice', () => {
    const actions = [makeAction(1, '2024-01-01', 'short', 100)];
    const result = runShortSimulation(bars, actions, fmt);
    expect(result.transactions.filter((t) => t.side === 'short')).toHaveLength(1);
  });

  it('portfolioHistory has one entry per bar', () => {
    const result = runShortSimulation(bars, [], fmt);
    expect(result.portfolioHistory).toHaveLength(bars.length);
  });
});

// ─── buildSimStats ────────────────────────────────────────────────────────────

describe('buildSimStats', () => {
  const result: SimResult = {
    transactions: [],
    portfolioHistory: [],
    totalInvested: 1000,
    cashWithdrawn: 200,
    finalShares: 5,
    sharesValue: 900,
    profit: 100,
    profitPct: 10,
  };

  it('returns 6 stat rows for long mode', () => {
    expect(buildSimStats(result, 'long', dollar)).toHaveLength(6);
  });

  it('returns 6 stat rows for short mode', () => {
    expect(buildSimStats(result, 'short', dollar)).toHaveLength(6);
  });

  it('profit row has green color for positive profit', () => {
    const stats = buildSimStats(result, 'long', dollar);
    const profitRow = stats.find((r) => r.label === 'Profit');
    expect(profitRow?.color).toBe('var(--color-green)');
  });

  it('profit row has red color for negative profit', () => {
    const loss = { ...result, profit: -50, profitPct: -5 };
    const stats = buildSimStats(loss, 'long', dollar);
    const profitRow = stats.find((r) => r.label === 'Profit');
    expect(profitRow?.color).toBe('var(--color-red)');
  });

  it('prefixes positive profit with +', () => {
    const stats = buildSimStats(result, 'long', dollar);
    const profitRow = stats.find((r) => r.label === 'Profit')!;
    expect(profitRow.value).toMatch(/^\+/);
  });

  it('long mode uses "Total invested" label', () => {
    const stats = buildSimStats(result, 'long', dollar);
    expect(stats[0].label).toBe('Total invested');
  });

  it('short mode uses "Cash received" label', () => {
    const stats = buildSimStats(result, 'short', dollar);
    expect(stats[0].label).toBe('Cash received');
  });
});

// ─── fmtMarkerText ────────────────────────────────────────────────────────────

describe('fmtMarkerText', () => {
  it('formats buy as B $value', () => {
    expect(fmtMarkerText('buy', 500)).toBe('B $500');
  });

  it('formats sell as S value%', () => {
    expect(fmtMarkerText('sell', 50)).toBe('S 50%');
  });

  it('formats short as Sh $value', () => {
    expect(fmtMarkerText('short', 1000)).toBe('Sh $1000');
  });

  it('formats cover as C value%', () => {
    expect(fmtMarkerText('cover', 100)).toBe('C 100%');
  });
});

// ─── simStatsToExportRows ─────────────────────────────────────────────────────

describe('simStatsToExportRows', () => {
  const result: SimResult = {
    transactions: [],
    portfolioHistory: [],
    totalInvested: 1000,
    cashWithdrawn: 200,
    finalShares: 5,
    sharesValue: 900,
    profit: 100,
    profitPct: 10,
  };

  it('returns 6 rows', () => {
    expect(simStatsToExportRows(result)).toHaveLength(6);
  });

  it('formats dollar values with $ prefix', () => {
    const rows = simStatsToExportRows(result);
    const invested = rows.find((r) => r.label === 'Total invested')!;
    expect(invested.value).toMatch(/^\$/);
  });

  it('prefixes positive profit with +', () => {
    const rows = simStatsToExportRows(result);
    const profit = rows.find((r) => r.label === 'Profit')!;
    expect(profit.value).toMatch(/^\+/);
  });

  it('does not prefix negative profit with +', () => {
    const rows = simStatsToExportRows({ ...result, profit: -50, profitPct: -5 });
    const profit = rows.find((r) => r.label === 'Profit')!;
    expect(profit.value).not.toMatch(/^\+/);
  });

  it('uses green color for positive profit', () => {
    const rows = simStatsToExportRows(result);
    const profit = rows.find((r) => r.label === 'Profit')!;
    expect(profit.color).toBe('#16a34a');
  });

  it('uses red color for negative profit', () => {
    const rows = simStatsToExportRows({ ...result, profit: -50, profitPct: -5 });
    const profit = rows.find((r) => r.label === 'Profit')!;
    expect(profit.color).toBe('#dc2626');
  });
});

// ─── simResultToExportArgs ────────────────────────────────────────────────────

describe('simResultToExportArgs', () => {
  const result: SimResult = {
    transactions: [
      { time: '09:30', timestamp: '2024-01-01T14:30:00Z', side: 'buy', price: 100, shares: 1, value: 100, sharesAfter: 1, portfolioValue: 100 },
      { time: '10:00', timestamp: '2024-01-01T15:00:00Z', side: 'sell', price: 110, shares: 0.5, value: 55, sharesAfter: 0.5, portfolioValue: 110 },
    ],
    portfolioHistory: [],
    totalInvested: 100,
    cashWithdrawn: 55,
    finalShares: 0.5,
    sharesValue: 55,
    profit: 10,
    profitPct: 10,
  };

  it('returns stats and transactions', () => {
    const { stats, transactions } = simResultToExportArgs(result);
    expect(stats).toBeDefined();
    expect(stats.length).toBeGreaterThan(0);
    expect(transactions).toHaveLength(2);
  });

  it('transaction entries have the expected fields', () => {
    const { transactions } = simResultToExportArgs(result);
    const tx = transactions[0];
    expect(tx.label).toBe('09:30');
    expect(tx.side).toBe('buy');
    expect(tx.price).toBe(100);
    expect(tx.shares).toBe(1);
    expect(tx.value).toBe(100);
    expect(tx.sharesAfter).toBe(1);
    expect(tx.portfolioValue).toBe(100);
  });

  it('stats has 6 rows matching simStatsToExportRows', () => {
    const { stats } = simResultToExportArgs(result);
    expect(stats).toHaveLength(6);
  });
});
