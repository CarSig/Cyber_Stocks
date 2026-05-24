import { useState } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CorrelationSelector, ViewToggle } from '@/features/correlations/ui';
import { useCyberNewsPage } from '@/features/news/hooks/useCyberNewsPage';
import TickerCard from '@/features/news/components/TickerCard';
import TickerListRow from '@/features/news/components/TickerListRow';
import TickerDetailPanel from '@/features/news/components/TickerDetailPanel';
import FilterBanner from '@/components/common/FilterBanner';
import LeftSidebar from '@/components/common/LeftSidebar';
import PageWithSidebar from '@/components/common/PageWithSidebar';
import './CyberNews.css';
import Page from '@/components/common/Page';
import type { CorrelationResult } from '@/types';

export default function CyberNews() {
  const [showSidebar, setShowSidebar] = useState(true);

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
    <PageWithSidebar
      sidebar={
        <LeftSidebar title="Topics" show={showSidebar} onToggle={() => setShowSidebar((v) => !v)}>
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
        </LeftSidebar>
      }
    >
      <Page title="Cyber News">
        <p className="cyber-news-intro">
          Archived cybersecurity news (2025+) matched to tracked companies and analyzed with AI. Click a company to see
          all articles.
        </p>

        {selectedTopic && (
          <FilterBanner label="Filtered by topic:" value={selectedTopic} onClear={() => setSelectedTopic(null)} />
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
    </PageWithSidebar>
  );
}
