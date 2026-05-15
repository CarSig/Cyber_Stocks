import { Link } from 'react-router-dom';
import WatchlistSparkline from './WatchlistSparkline';

type SparklineEntry = {
  changePct?: number | null;
  latestPrice?: number | null;
  closes?: number[];
};

type TickerWatchlistProps = {
  ticker?: string;
  companies?: Record<string, string>;
  sparklinesData?: Record<string, SparklineEntry>;
  showWatchlist: boolean;
  onToggle: () => void;
};

export default function TickerWatchlist({
  ticker,
  companies,
  sparklinesData,
  showWatchlist,
  onToggle,
}: TickerWatchlistProps) {
  const sortedCompanies = companies ? Object.entries(companies).sort(([, a], [, b]) => a.localeCompare(b)) : [];

  return (
    <>
      <button
        className={`ticker-wl-toggle${showWatchlist ? ' ticker-wl-toggle--open' : ''}`}
        onClick={onToggle}
        title={showWatchlist ? 'Hide watchlist' : 'Show watchlist'}
      >
        {showWatchlist ? '<' : '›'}
      </button>

      <aside className={`ticker-wl${showWatchlist ? '' : ' ticker-wl--collapsed'}`}>
        <div className="ticker-wl-head">
          <div className="ticker-wl-title">Companies</div>
        </div>
        <div className="ticker-wl-list">
          {sortedCompanies.map(([name, t]) => {
            const sp = sparklinesData?.[t];
            const changePct = sp?.changePct ?? null;
            const changeClass =
              changePct == null ? '' : changePct >= 0 ? ' ticker-wl-change--up' : ' ticker-wl-change--down';
            const changeSign = changePct != null && changePct >= 0 ? '+' : '';
            const sparkColor =
              changePct == null
                ? 'var(--text-faint)'
                : changePct >= 0
                  ? 'var(--color-green, #22c55e)'
                  : 'var(--color-red, #ef4444)';
            return (
              <Link key={t} to={`/${t}`} className={`ticker-wl-row${t === ticker ? ' is-active' : ''}`}>
                <div className="ticker-wl-info">
                  <div className="ticker-wl-meta">
                    <span className="ticker-wl-symbol">{t}</span>
                    {sp?.latestPrice != null && <span className="ticker-wl-price">${sp.latestPrice.toFixed(2)}</span>}
                  </div>
                  <div className="ticker-wl-meta">
                    <span className="ticker-wl-name">{name}</span>
                    {changePct != null && (
                      <span className={`ticker-wl-change${changeClass}`}>
                        {changeSign}
                        {changePct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
                {(sp?.closes?.length ?? 0) > 1 && (
                  <WatchlistSparkline closes={sp!.closes!} color={sparkColor} id={t} />
                )}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
