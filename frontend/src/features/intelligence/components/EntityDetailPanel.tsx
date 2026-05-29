import { useEntityIntelligence } from '../hooks/useIntelligence';
import SentimentBar from '@/components/common/data-display/SentimentBar';
import StatRowSummary from '@/components/common/data-display/StatRowSummary';
import DetailPanelOverlay from '@/components/common/layout/DetailPanelOverlay';
import EntityCorrelation from './EntityCorrelation';
import ArticleDetail from './ArticleDetail';

type EntityDetailPanelProps = {
  entityId: string;
  onClose: () => void;
  signal?: string;
};

export default function EntityDetailPanel({ entityId, onClose, signal }: EntityDetailPanelProps) {
  const { articles, summary } = useEntityIntelligence(entityId, signal);
  const articleList = articles.data ?? [];

  return (
    <DetailPanelOverlay title={entityId} onClose={onClose} className="entity-detail-panel-content">
      <EntityCorrelation entityId={entityId} />

      {summary.data && (
        <div className="entity-detail-panel-summary card-inset">
          <StatRowSummary
            summary={{
              articleCount: summary.data.articleCount,
              positiveCount: summary.data.positiveCount,
              negativeCount: summary.data.negativeCount,
              neutralCount: summary.data.neutralCount,
            }}
          />
          <p className="entity-detail-panel-summary-label">Avg sentiment</p>
          <SentimentBar value={summary.data.avgSentiment} />
        </div>
      )}

      <p className="entity-detail-panel-articles-title">Articles ({articleList.length})</p>

      {articles.isPending && <p className="ti-loading">Loading…</p>}
      {articleList.map((a) => (
        <ArticleDetail
          key={a.id ?? a.link}
          article={a as unknown as Parameters<typeof ArticleDetail>[0]['article']}
          focusEntityId={entityId}
        />
      ))}
    </DetailPanelOverlay>
  );
}
