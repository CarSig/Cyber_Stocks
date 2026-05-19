import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import StateHandler from '@/components/common/StateHandler';
import { getCompanies, getTicker } from '@/features/tickers/api';
import { MultiChart } from '@/features/charts/components';
import { CorrelationMatrix } from '@/features/correlations/components';
import Toggle from '@/components/common/Toggle';
import Page from '@/components/common/Page';

const MAX = 10;

type CompanyListProps = {
  companies: Record<string, string>;
  toggled: Set<string>;
  onToggle: (updated: Set<string>) => void;
};

function CompanyList({ companies, toggled, onToggle }: CompanyListProps) {
  const toggle = (ticker: string) => {
    const updated = new Set(toggled);
    if (updated.has(ticker)) updated.delete(ticker);
    else updated.add(ticker);
    onToggle(updated);
  };

  return (
    <ul className="company-list">
      {Object.entries(companies).map(([name, ticker]) => {
        const on = toggled.has(ticker);
        const disabled = !on && toggled.size >= MAX;
        return (
          <li key={ticker} className="company-item">
            <Toggle on={on} onChange={() => toggle(ticker)} disabled={disabled} />
            <Link to={`/${ticker}`}>
              {name} ({ticker})
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Home() {
  const [toggled, setToggled] = useState(new Set<string>());
  const [rangeFrom, setRangeFrom] = useState<string | null>(null);
  const [rangeTo, setRangeTo] = useState<string | null>(null);

  const {
    data: companies,
    error,
    isPending,
  } = useQuery<Record<string, string>>({
    queryKey: ['companies'],
    queryFn: getCompanies,
  });

  const toggledArr = [...toggled];

  const tickerQueries = useQueries({
    queries: toggledArr.map((ticker) => ({
      queryKey: ['ticker', ticker],
      queryFn: () => getTicker(ticker),
    })),
  });

  function handleRangeChange(from: string | null | undefined, to: string | null | undefined) {
    setRangeFrom(from ?? null);
    setRangeTo(to ?? null);
  }

  const series = tickerQueries
    .filter((q) => q.data)
    .map((q, i) => ({
      ticker: toggledArr[i],
      quotes: (q.data as { history: { quotes: unknown[] } }).history?.quotes ?? [],
      analysis: (q.data as { analysis?: unknown }).analysis,
    }));

  return (
    <StateHandler isPending={isPending} error={error}>
      <Page title="Companies">
        <CompanyList companies={companies ?? {}} toggled={toggled} onToggle={setToggled} />

        {toggled.size > 0 ? (
          <MultiChart
            series={series as Parameters<typeof MultiChart>[0]['series']}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onRangeChange={handleRangeChange}
          />
        ) : (
          <p>Toggle companies to compare them on the chart.</p>
        )}

        <CorrelationMatrix />
      </Page>
    </StateHandler>
  );
}
