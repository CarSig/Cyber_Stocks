import { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCompanies, getTicker } from "../api.js";
import MultiChart from "../components/organisms/charts/MultiChart.jsx";
import { Button } from "@/components/ui/button";

const MAX = 10;

function Toggle({ on, onChange, disabled }) {
  return (
    <button onClick={onChange} disabled={disabled} className={`toggle-btn${on ? " on" : ""}`}>
      <span className="toggle-knob" />
    </button>
  );
}

export default function Home() {
  const [toggled, setToggled] = useState(new Set());
  const [rangeFrom, setRangeFrom] = useState(null);
  const [rangeTo, setRangeTo] = useState(null);

  const { data: companies, error, isPending } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });

  const toggledArr = [...toggled];

  const tickerQueries = useQueries({
    queries: toggledArr.map((ticker) => ({
      queryKey: ["ticker", ticker],
      queryFn: () => getTicker(ticker),
    })),
  });

  if (isPending) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  function toggle(ticker) {
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) { next.delete(ticker); return next; }
      if (next.size >= MAX) return prev;
      next.add(ticker);
      return next;
    });
  }

  function selectFirst10() {
    setToggled(new Set(Object.values(companies).slice(0, MAX)));
  }

  function handleRangeChange(from, to) {
    setRangeFrom(from ?? null);
    setRangeTo(to ?? null);
  }

  const series = tickerQueries
    .filter((q) => q.data)
    .map((q, i) => ({ ticker: toggledArr[i], quotes: q.data.history.quotes ?? [], analysis: q.data.analysis }));

  return (
    <div className="page">
      <div className="home-header">
        <h1 className="page-title">Companies</h1>
        <Button onClick={selectFirst10}>Select first 10</Button>
      </div>

      <ul className="company-list">
        {Object.entries(companies).map(([name, ticker]) => {
          const on = toggled.has(ticker);
          const disabled = !on && toggled.size >= MAX;
          return (
            <li key={ticker} className="company-item">
              <Toggle on={on} onChange={() => toggle(ticker)} disabled={disabled} />
              <Link to={`/${ticker}`}>{name} ({ticker})</Link>
            </li>
          );
        })}
      </ul>

      {toggled.size > 0 && (
        <MultiChart
          series={series}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onRangeChange={handleRangeChange}
        />
      )}
      {toggled.size === 0 && <p>Toggle companies to compare them on the chart.</p>}
    </div>
  );
}
