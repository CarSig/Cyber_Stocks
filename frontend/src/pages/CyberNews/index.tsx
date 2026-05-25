import { useCyberNewsPage } from '@/features/news/hooks/useCyberNewsPage';
import TickerCard from '@/features/news/components/TickerCard';
import TickerListRow from '@/features/news/components/TickerListRow';
import TickerDetailPanel from '@/features/news/components/TickerDetailPanel';
import ItemListPage from '@/components/common/layout/ItemListPage';
import './CyberNews.css';
import type { CorrelationResult, CyberNewsTicker } from '@/types';

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

  const sidebarContent = (
    <>
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
    </>
  );

  const correlationFor = (ticker: string) =>
    correlationByTicker[ticker] as { result?: CorrelationResult | { error: string } } | undefined;

  return (
    <ItemListPage<CyberNewsTicker>
      pageTitle="Cyber News"
      description="Archived cybersecurity news (2025+) matched to tracked companies and analyzed with AI. Click a company to see all articles."
      sidebarTitle="Topics"
      sidebarContent={sidebarContent}
      filterBannerLabel="Filtered by topic:"
      filterBannerValue={selectedTopic}
      onClearFilter={() => setSelectedTopic(null)}
      lagDays={lagDays}
      setLagDays={setLagDays}
      viewMode={viewMode}
      setViewMode={setViewMode}
      listHeaderTitle="Companies"
      items={tickers ?? []}
      itemsLoading={isPending}
      getItemKey={(row) => row.ticker}
      renderCard={(row) => (
        <TickerCard
          row={row}
          onClick={() => setSelected(row)}
          topic={selectedTopic ?? undefined}
          correlation={correlationFor(row.ticker)}
        />
      )}
      renderRow={(row) => (
        <TickerListRow
          row={row}
          onClick={() => setSelected(row)}
          topic={selectedTopic ?? undefined}
          correlation={correlationFor(row.ticker)}
        />
      )}
      detailPanel={
        selected && (
          <TickerDetailPanel
            ticker={selected.ticker}
            company={selected.company}
            onClose={() => setSelected(null)}
            topic={selectedTopic ?? undefined}
          />
        )
      }
    />
  );
}
