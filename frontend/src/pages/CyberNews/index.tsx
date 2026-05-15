import { useState } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CorrelationSelector, ViewToggle } from '@/components/shared/CorrelationControls';
import { useCyberNewsTickers, useCyberNewsTopics, useCyberNewsCorrelations } from '@/hooks/useCyberNews';
import indexBy from '@/utils/indexBy';
import TickerCard from '@/components/organisms/cards/ticker/TickerCard';
import TickerListRow from '@/components/molecules/cyber-news/TickerListRow';
import TickerDetailPanel from '@/components/organisms/cyber-news/TickerDetailPanel';
import TopicsSidebar from '@/components/organisms/cards/TopicsSidebar';
import './CyberNews.css';
import Page from '@/components/atoms/Page';
import type { CyberNewsTicker, CyberNewsTopic, CorrelationResult } from '@/types';

type CyberNewsCorrelationEntry = { ticker: string; correlation?: CorrelationResult };

export default function CyberNews() {
  const [selected, setSelected] = useState<CyberNewsTicker | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [lagDays, setLagDays] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const { data: tickers, isPending } = useCyberNewsTickers(selectedTopic ?? undefined);
  const { data: correlations } = useCyberNewsCorrelations(lagDays, selectedTopic ?? undefined);
  const { data: allTopics, isPending: topicsLoading } = useCyberNewsTopics();

  const correlationByTicker = indexBy((correlations as CyberNewsCorrelationEntry[]) ?? [], 'ticker');

  return (
    <div className="cyber-news-layout">
      <div className="cyber-news-sidebar-left">
        <h3 className="cyber-news-sidebar-title">🏷️ Topics</h3>
        {topicsLoading && <p className="ti-loading">Loading…</p>}
        {(allTopics as CyberNewsTopic[] | undefined)?.slice(0, 15).map((t) => (
          <div
            key={t.topic}
            onClick={() => setSelectedTopic(selectedTopic === t.topic ? null : t.topic)}
            className={`cyber-news-topic-item ${selectedTopic === t.topic ? 'active' : ''}`}
          >
            <span className="cyber-news-topic-text">{t.topic}</span>
          </div>
        ))}
      </div>

      <div className={`cyber-news-main ${selectedTopic ? 'with-sidebar' : ''}`}>
        <Page title="Cyber News">
          <p style={{ color: 'var(--muted-foreground)', marginBottom: 24 }}>
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
              {(tickers as CyberNewsTicker[] | undefined)?.map((row) => (
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
              {(tickers as CyberNewsTicker[] | undefined)?.map((row) => (
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

      <TopicsSidebar
        selectedTopic={selectedTopic}
        data={allTopics as Array<{ topic: string; count: number }> | undefined}
      />
    </div>
  );
}
