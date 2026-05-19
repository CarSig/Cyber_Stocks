import { useCyberNewsArticles, useCyberNewsSummary } from '../hooks/useCyberNews';
import StatsCard from './StatsCard';
import ArticleCard from './ArticleCard';
import DetailPanelOverlay from '@/components/common/DetailPanelOverlay';
import '@/components/organisms/cyber-news/TickerDetailPanel.css';

type TickerDetailPanelProps = { ticker: string; company: string; onClose: () => void; topic?: string };

export default function TickerDetailPanel({ ticker, company, onClose, topic }: TickerDetailPanelProps) {
  const { data: articles, isPending } = useCyberNewsArticles(ticker, topic);
  const { data: summary } = useCyberNewsSummary(ticker, topic);

  return (
    <DetailPanelOverlay title={company} subtitle={ticker} onClose={onClose} className="ticker-detail-panel">
      {summary && <StatsCard summary={summary} />}
      <p className="ticker-detail-articles-title">Articles ({articles?.length ?? 0})</p>
      {isPending && <p className="ti-loading">Loading…</p>}
      {articles?.map((a) => (
        <ArticleCard key={a.id ?? a.link} article={a} />
      ))}
    </DetailPanelOverlay>
  );
}
