import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CorrelationSelector, ViewToggle } from '@/features/correlations/ui';
import { useCyberNewsPage } from '@/hooks/useCyberNewsPage';
import TickerCard from '@/features/news/components/TickerCard';
import TickerListRow from '@/features/news/components/TickerListRow';
import TickerDetailPanel from '@/features/news/components/TickerDetailPanel';
import './CyberNews.css';
import Page from '@/components/common/Page';
import type { CorrelationResult } from '@/types';

export default function CyberNews() {
  const {
    selected,
    setSelected,
    selectedTopic,
    setSelectedTopic,
    lagDays,
    setLagDays,
    viewMode,
    setViewMode,
    tickers,
    isPending,
    allTopics,
    topicsLoading,
    correlationByTicker,
  } = useCyberNewsPage();

  return (
    <div className="cyber-news-layout">
      <div className="cyber-news-sidebar-left">
        <h3 className="cyber-news-sidebar-title">🏷️ Topics</h3>
        {topicsLoading && <p className="ti-loading">Loading…</p>}
        {allTopics?.slice(0, 15).map((t) => (
          <div
            key={t.topic}
            onClick={() => setSelectedTopic(selectedTopic === t.topic ? null : t.topic)}
            className={`cyber-news-topic-item ${selectedTopic === t.topic ? 'active' : ''}`}
          >
            <span className="cyber-news-topic-text">{t.topic}</span>
          </div>
        ))}
      </div>

      <div className="cyber-news-main">
        <Page title="Cyber News">
          <p className="cyber-news-intro">
            Archived cybersecurity news (2025+) matched to tracked companies and analyzed with AI. Click a company to
            see all articles.
          </p>

          {selectedTopic && (
            <div className="cyber-news-filter-banner">
              <span className="cyber-news-filter-text">
                <strong>Filtered by topic:</strong> <span className="topic">{selectedTopic}</span>
              </span>
              <button className="cyber-news-clear-btn" onClick={() => setSelectedTopic(null)}>
                Clear filter
              </button>
            </div>
          )}

          <CorrelationSelector lagDays={lagDays} setLagDays={setLagDays} />

          <div className="cyber-news-header header-flex-between">
            <h2 className="cyber-news-companies-title">Companies</h2>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>

          {isPending ? (
            <LoadingSpinner />
          ) : viewMode === 'grid' ? (
            <div className="ti-grid cyber-news-grid-container">
              {tickers?.map((row) => (
                <TickerCard
                  key={row.ticker}
                  row={row}
                  onClick={() => setSelected(row)}
                  topic={selectedTopic ?? undefined}
                  correlation={
                    correlationByTicker[row.ticker] as { result?: CorrelationResult | { error: string } } | undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="cyber-news-list-container">
              {tickers?.map((row) => (
                <TickerListRow
                  key={row.ticker}
                  row={row}
                  onClick={() => setSelected(row)}
                  topic={selectedTopic ?? undefined}
                  correlation={
                    correlationByTicker[row.ticker] as { result?: CorrelationResult | { error: string } } | undefined
                  }
                />
              ))}
            </div>
          )}

          {selected && (
            <TickerDetailPanel
              ticker={selected.ticker}
              company={selected.company}
              onClose={() => setSelected(null)}
              topic={selectedTopic ?? undefined}
            />
          )}
        </Page>
      </div>
    </div>
  );
}
