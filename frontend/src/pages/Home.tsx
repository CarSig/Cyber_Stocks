import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import StateHandler from '@/components/common/StateHandler';
import { getCompanies, getTicker, getSparklines } from '@/features/tickers/api';
import { MultiChart } from '@/features/charts/components';
import { CorrelationMatrix } from '@/features/correlations/components';
import Page from '@/components/common/Page';
import WatchlistSparkline from './Ticker/WatchlistSparkline';
import type { SparklineMap } from '@algo/shared';

const MAX = 10;

type Mode = 'view' | 'compare';

// ── View mode ─────────────────────────────────────────────────────────────────

type ViewListProps = {
  companies: Record<string, string>;
  sparklines: SparklineMap;
};

function ViewList({ companies, sparklines }: ViewListProps) {
  return (
    <ul className="company-list">
      {Object.entries(companies).map(([name, ticker]) => {
        const sp = sparklines[ticker];
        const changePct = sp?.changePct ?? null;
        const isUp = changePct != null && changePct >= 0;
        const sparkColor =
          changePct == null ? 'var(--text-faint)' : isUp ? 'var(--color-green, #22c55e)' : 'var(--color-red, #ef4444)';

        return (
          <li key={ticker} className="company-item">
            <Link to={`/${ticker}`} className="company-item-link">
              <div className="company-item-info">
                <span className="company-item-ticker">{ticker}</span>
                <span className="company-item-name">{name}</span>
              </div>
              <div className="company-item-data">
                {sp?.latestPrice != null && <span className="company-item-price">${sp.latestPrice.toFixed(2)}</span>}
                {changePct != null && (
                  <span
                    className={`company-item-change${isUp ? ' company-item-change--up' : ' company-item-change--down'}`}
                  >
                    {isUp ? '+' : ''}
                    {changePct.toFixed(2)}%
                  </span>
                )}
                {(sp?.closes?.length ?? 0) > 1 && (
                  <WatchlistSparkline closes={sp!.closes!} color={sparkColor} id={`home-${ticker}`} />
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ── Compare mode ──────────────────────────────────────────────────────────────

type CompareListProps = {
  companies: Record<string, string>;
  toggled: Set<string>;
  onToggle: (updated: Set<string>) => void;
};

function CompareList({ companies, toggled, onToggle }: CompareListProps) {
  const toggle = (ticker: string) => {
    const next = new Set(toggled);
    if (next.has(ticker)) next.delete(ticker);
    else if (next.size < MAX) next.add(ticker);
    onToggle(next);
  };

  return (
    <ul className="company-list company-list--compare">
      {Object.entries(companies).map(([name, ticker]) => {
        const on = toggled.has(ticker);
        const disabled = !on && toggled.size >= MAX;
        return (
          <li
            key={ticker}
            className={`company-pill${on ? ' company-pill--on' : ''}${disabled ? ' company-pill--disabled' : ''}`}
          >
            <button className="company-pill-btn" onClick={() => toggle(ticker)} disabled={disabled}>
              <span className="company-pill-ticker">{ticker}</span>
              <span className="company-pill-name">{name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [mode, setMode] = useState<Mode>('view');
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

  const allTickers = companies ? Object.values(companies) : [];

  const { data: sparklines = {} } = useQuery<SparklineMap>({
    queryKey: ['sparklines', allTickers],
    queryFn: () => getSparklines(allTickers),
    enabled: mode === 'view' && allTickers.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
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
        <div className="home-mode-bar">
          <button
            className={`home-mode-btn${mode === 'view' ? ' home-mode-btn--active' : ''}`}
            onClick={() => setMode('view')}
          >
            View
          </button>
          <button
            className={`home-mode-btn${mode === 'compare' ? ' home-mode-btn--active' : ''}`}
            onClick={() => setMode('compare')}
          >
            Compare
          </button>
        </div>

        {mode === 'view' && (
          <>
            {Object.keys(sparklines).length > 0 && (
              <div className="company-list-header">
                <span className="company-list-period">last 30 days</span>
              </div>
            )}
            <ViewList companies={companies ?? {}} sparklines={sparklines} />
          </>
        )}

        {mode === 'compare' && (
          <div className="home-compare-layout">
            <div className="home-compare-sidebar">
              <CompareList companies={companies ?? {}} toggled={toggled} onToggle={setToggled} />
            </div>
            <div className="home-compare-main">
              {toggled.size > 0 ? (
                <>
                  <MultiChart
                    series={series as Parameters<typeof MultiChart>[0]['series']}
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                    onRangeChange={handleRangeChange}
                  />
                  <CorrelationMatrix highlightTickers={[...toggled]} />
                </>
              ) : (
                <p className="home-compare-empty">Toggle companies on the left to compare them.</p>
              )}
            </div>
          </div>
        )}
      </Page>
    </StateHandler>
  );
}
