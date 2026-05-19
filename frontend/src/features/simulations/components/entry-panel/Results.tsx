import { forwardRef } from 'react';
import StatsGrid from './StatsGrid';
import PortfolioChart from './PortfolioChart';
import TransactionTable, { type AnyTransaction } from './TransactionTable';
import type { MarkerPoint } from '@/features/charts/types';

type StatItem = { label: string; value: string; color?: string };

type ResultsProps = {
  stats: StatItem[];
  history: { time: string; value: number }[];
  markers: MarkerPoint[];
  transactions: AnyTransaction[];
  intraday?: boolean;
};

const Results = forwardRef<HTMLDivElement, ResultsProps>(function Results(
  { stats, history, markers, transactions, intraday = false },
  portfolioRef,
) {
  return (
    <div>
      <StatsGrid stats={stats} />
      <PortfolioChart ref={portfolioRef} history={history} markers={markers} intraday={intraday} />
      <TransactionTable transactions={transactions} />
    </div>
  );
});

export default Results;
