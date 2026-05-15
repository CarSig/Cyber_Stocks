import { useEntityIntelligence } from '@/hooks/useIntelligence';
import { URGENCY_CONFIG } from '@/utils/urgencyUtils';
import useUrgencyFilter from '@/hooks/useUrgencyFilter';
import SentimentBar from '@/components/molecules/shared/SentimentBar';
import StatRowSummary from '@/components/molecules/shared/StatRowSummary';
import DetailPanelOverlay from '@/components/molecules/shared/DetailPanelOverlay';
import EntityCorrelation from '@/components/molecules/intelligence/EntityCorrelation';
import ArticleDetail from '@/components/molecules/intelligence/ArticleDetail';
import type { UrgencyKey } from '@/types';

type EntityDetailPanelProps = {
  entityId: string;
  onClose: () => void;
  signal?: string;
  urgencyFilter?: UrgencyKey | null;
  onUrgencyChange?: (key: UrgencyKey | null) => void;
  onUrgencyCounts?: (counts: Record<string, number>) => void;
};

export default function EntityDetailPanel({
  entityId,
  onClose,
  signal,
  urgencyFilter: globalUrgencyFilter,
  onUrgencyChange,
  onUrgencyCounts,
}: EntityDetailPanelProps) {
  const { articles, summary } = useEntityIntelligence(entityId, signal);
  const { enriched, counts, activeUrgency, setActiveUrgency, filtered } = useUrgencyFilter(articles.data);

  const activeFilter = globalUrgencyFilter || activeUrgency;
  const filteredArticles = globalUrgencyFilter
    ? enriched
        .filter((a) => a._urgency === globalUrgencyFilter)
        .sort((a, b) => URGENCY_CONFIG[a._urgency].order - URGENCY_CONFIG[b._urgency].order)
    : filtered;

  if (onUrgencyCounts) onUrgencyCounts(counts);

  const urgencyKeys: Array<UrgencyKey | 'all'> = [
    'all',
    'now',
    'today',
    'recent',
    'future_short',
    'future_long',
    'past',
  ];

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

      <p className="entity-detail-panel-articles-title">
        Articles (
        {activeFilter === 'all' ? filteredArticles.length : `${filteredArticles.length} of ${enriched.length}`})
        {globalUrgencyFilter && (
          <span style={{ marginLeft: 6, color: URGENCY_CONFIG[globalUrgencyFilter].color }}>
            ({URGENCY_CONFIG[globalUrgencyFilter].label} from sidebar)
          </span>
        )}
      </p>

      <div className="urgency-filter-tabs">
        {urgencyKeys.map((key) => {
          const active = activeFilter === key;
          const cfg = key === 'all' ? null : URGENCY_CONFIG[key];
          const color = key === 'all' ? 'var(--border)' : cfg!.color;
          const count = key === 'all' ? enriched.length : counts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => {
                if (onUrgencyChange) onUrgencyChange(active || key === 'all' ? null : (key as UrgencyKey));
                else if (!globalUrgencyFilter && key !== 'all') setActiveUrgency(key as UrgencyKey);
                else if (!globalUrgencyFilter) setActiveUrgency('all');
              }}
              className={`urgency-filter-button ${active ? 'urgency-filter-button-active' : ''}`}
              style={{
                borderColor: active ? color : 'var(--border)',
                background: active ? (key === 'all' ? 'rgba(255,255,255,0.05)' : cfg!.bg) : 'transparent',
                color: active ? (key === 'all' ? 'var(--foreground)' : color) : 'var(--muted-foreground)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {key === 'all' ? 'All' : cfg!.label}
              <span className="urgency-filter-button-count">({count})</span>
            </button>
          );
        })}
      </div>

      {articles.isPending && <p className="ti-loading">Loading…</p>}
      {filteredArticles.map((a) => (
        <ArticleDetail
          key={a.id ?? a.link}
          article={a as unknown as Parameters<typeof ArticleDetail>[0]['article']}
          focusEntityId={entityId}
        />
      ))}
    </DetailPanelOverlay>
  );
}
