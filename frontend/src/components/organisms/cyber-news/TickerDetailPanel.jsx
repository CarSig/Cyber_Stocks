import { useCyberNewsArticles, useCyberNewsSummary } from '@/hooks/useCyberNews.js';
import StatsCard from '@/components/organisms/cards/stats/StatsCard.jsx';
import ArticleCard from '@/components/organisms/cards/article/ArticleCard.jsx';
import DetailPanelOverlay from '@/components/molecules/shared/DetailPanelOverlay.jsx';
import './TickerDetailPanel.css';

export default function TickerDetailPanel({ ticker, company, onClose, topic }) {
  const { data: articles, isPending } = useCyberNewsArticles(ticker, topic);
  const { data: summary } = useCyberNewsSummary(ticker, topic);

  return (
    <DetailPanelOverlay title={company} subtitle={ticker} onClose={onClose} className="ticker-detail-panel">
      {summary && <StatsCard summary={summary} />}
      <p className="ticker-detail-articles-title">Articles ({articles?.length ?? 0})</p>
      {isPending && <p className="ti-loading">Loading…</p>}
      {articles?.map((a) => (
        <ArticleCard key={a.id} article={a} />
      ))}
    </DetailPanelOverlay>
  );
}
