import { useEntityIntelligence } from '@/hooks/useIntelligence.js';
import useCorrelationMetrics from '@/hooks/useCorrelationMetrics.js';

function EntityListRowContent({ summary, sentimentInfo, hasCorrelation, corrResult, strength }) {
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

      {hasCorrelation && (
        <div className="entity-list-row-divider">
          <div className="entity-list-row-section-label">Correlation</div>
          <div className="entity-list-row-divider-value" style={{ color: strength.color }}>
            {strength.label}
          </div>
          <div className="entity-list-row-divider-detail">
            <span>r: {corrResult.r.toFixed(3)}</span>
            <span>p: {corrResult.pValue < 0.001 ? '< 0.001' : corrResult.pValue.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EntityListRow({ entity, onClick, signal, correlation }) {
  const { summary } = useEntityIntelligence(entity.entityId, signal);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary.data);

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
          summary={summary}
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
