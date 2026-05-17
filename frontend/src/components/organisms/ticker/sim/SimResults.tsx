import { forwardRef } from 'react';
import SimStatsGrid from './SimStatsGrid';
import SimPortfolioChart from './SimPortfolioChart';
import SimTransactionTable, { type AnyTransaction } from './SimTransactionTable';

type StatItem = { label: string; value: string; color?: string };

type MarkerPoint = { time: string; side: string; value: number; shares: number };

type SimResultsProps = {
  stats: StatItem[];
  history: { time: string; value: number }[];
  markers: MarkerPoint[];
  transactions: AnyTransaction[];
  intraday?: boolean;
};

const SimResults = forwardRef<HTMLDivElement, SimResultsProps>(function SimResults(
  { stats, history, markers, transactions, intraday = false },
  portfolioRef,
) {
  return (
    <div>
      <SimStatsGrid stats={stats} />
      <SimPortfolioChart ref={portfolioRef} history={history} markers={markers} intraday={intraday} />
      <SimTransactionTable transactions={transactions} />
    </div>
  );
});

export default SimResults;
