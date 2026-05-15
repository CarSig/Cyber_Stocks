import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import StateHandler from '@/components/organisms/shared/StateHandler.jsx';
import { getCompanies, getTicker } from '@/api/stock.js';
import MultiChart from '@/components/organisms/charts/MultiChart.jsx';
import CorrelationMatrix from '@/components/organisms/ticker/CorrelationMatrix.jsx';
import Toggle from '@/components/molecules/shared/Toggle.jsx';
import Page from '@/components/atoms/Page.jsx';

const MAX = 10;

function CompanyList({ companies, toggled, onToggle }) {
  const toggle = (ticker) => {
    const updated = new Set(toggled);
    updated.has(ticker) ? updated.delete(ticker) : updated.add(ticker);
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
  const [toggled, setToggled] = useState(new Set());
  const [rangeFrom, setRangeFrom] = useState(null);
  const [rangeTo, setRangeTo] = useState(null);

  const {
    data: companies,
    error,
    isPending,
  } = useQuery({
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

  function handleRangeChange(from, to) {
    setRangeFrom(from ?? null);
    setRangeTo(to ?? null);
  }

  const series = tickerQueries
    .filter((q) => q.data)
    .map((q, i) => ({ ticker: toggledArr[i], quotes: q.data.history.quotes ?? [], analysis: q.data.analysis }));

  return (
    <StateHandler isPending={isPending} error={error}>
      <Page title="Companies">
        <CompanyList companies={companies} toggled={toggled} onToggle={setToggled} />

        {toggled.size > 0 ? (
          <MultiChart series={series} rangeFrom={rangeFrom} rangeTo={rangeTo} onRangeChange={handleRangeChange} />
        ) : (
          <p>Toggle companies to compare them on the chart.</p>
        )}

        <CorrelationMatrix />
      </Page>
    </StateHandler>
  );
}
