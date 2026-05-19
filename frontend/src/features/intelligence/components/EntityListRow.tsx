import { useEntityIntelligence } from '@/hooks/useIntelligence';
import { useCorrelationMetrics } from '@/features/correlations/hooks';
import type { IntelligenceEntity, CorrelationResult, SentimentLabel } from '@/types';

type CorrelationWrapper = {
  result?: CorrelationResult | { error: string };
};

type EntityListRowContentProps = {
  summary: { data: { articleCount: number; positiveCount: number; negativeCount: number; avgSentiment: number } };
  sentimentInfo: SentimentLabel | null;
  hasCorrelation: boolean;
  corrResult?: CorrelationResult | { error: string };
  strength: SentimentLabel | null;
};

function EntityListRowContent({
  summary,
  sentimentInfo,
  hasCorrelation,
  corrResult,
  strength,
}: EntityListRowContentProps) {
  return (
    <div className="entity-list-row-content">
      <div className="entity-list-row-section">
        <div className="entity-list-row-section-label">Articles</div>
        <div className="entity-list-row-stats">
          <div className="entity-list-row-stat">
            <div className="entity-list-row-stat-value">{summary.data.articleCount}</div>
            <div className="entity-list-row-stat-label">total</div>
          </div>
          <div className="entity-list-row-stat">
            <div className="entity-list-row-stat-value" style={{ color: 'var(--color-green, #22c55e)' }}>
              {summary.data.positiveCount}
            </div>
            <div className="entity-list-row-stat-label">positive</div>
          </div>
          <div className="entity-list-row-stat">
            <div className="entity-list-row-stat-value" style={{ color: 'var(--color-red, #ef4444)' }}>
              {summary.data.negativeCount}
            </div>
            <div className="entity-list-row-stat-label">negative</div>
          </div>
        </div>
      </div>

      <div className="entity-list-row-divider">
        <div className="entity-list-row-section-label">Avg Sentiment</div>
        <div className="entity-list-row-divider-value" style={{ color: sentimentInfo?.color }}>
          {sentimentInfo?.label}
        </div>
        <div className="entity-list-row-section-label">
          {summary.data.avgSentiment > 0 ? '+' : ''}
          {summary.data.avgSentiment.toFixed(2)}
        </div>
      </div>

      {hasCorrelation && strength && corrResult && !('error' in corrResult) && (
        <div className="entity-list-row-divider">
          <div className="entity-list-row-section-label">Correlation</div>
          <div className="entity-list-row-divider-value" style={{ color: strength.color }}>
            {strength.label}
          </div>
          <div className="entity-list-row-divider-detail">
            <span>r: {(corrResult as CorrelationResult).r.toFixed(3)}</span>
            <span>
              p:{' '}
              {(corrResult as CorrelationResult).pValue < 0.001
                ? '< 0.001'
                : (corrResult as CorrelationResult).pValue.toFixed(3)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

type EntityListRowProps = {
  entity: IntelligenceEntity;
  onClick?: () => void;
  signal?: string;
  correlation?: CorrelationWrapper;
};

export default function EntityListRow({ entity, onClick, signal, correlation }: EntityListRowProps) {
  const { summary } = useEntityIntelligence(entity.entityId, signal);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(
    correlation,
    summary.data as { avgSentiment?: number } | undefined,
  );

  return (
    <div
      onClick={onClick}
      className={`entity-list-row list-row-card ${summary.isPending ? 'entity-list-row-loading' : ''}`}
    >
      <div className="entity-list-row-name">
        <div className="entity-list-row-name-text">{entity.name}</div>
      </div>

      {summary.isPending ? (
        <div className="entity-list-row-loading-message">Loading…</div>
      ) : summary.data ? (
        <EntityListRowContent
          summary={
            summary as unknown as {
              data: { articleCount: number; positiveCount: number; negativeCount: number; avgSentiment: number };
            }
          }
          sentimentInfo={sentimentInfo}
          hasCorrelation={hasCorrelation}
          corrResult={corrResult}
          strength={strength}
        />
      ) : (
        <div className="entity-list-row-loading-message">No data</div>
      )}
    </div>
  );
}
