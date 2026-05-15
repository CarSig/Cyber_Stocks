import { correlationStrength } from '@/utils/sentimentUtils';
import { useAllSentimentCorrelations } from '@/hooks/useIntelligence';
import type { CorrelationResult } from '@/types';

type EntityCorrelationProps = {
  entityId: string;
};

export default function EntityCorrelation({ entityId }: EntityCorrelationProps) {
  const { data } = useAllSentimentCorrelations(1);
  const row = data?.find((r) => r.entityId === entityId);
  if (!row) return null;
  const res = row.correlation;
  const hasError = !!res && 'error' in res;
  const strength = !hasError && res ? correlationStrength((res as CorrelationResult).r) : null;

  return (
    <div className="entity-correlation card-inset">
      <p className="entity-correlation-title">Sentiment ↔ Price Correlation</p>
      {hasError ? (
        <p className="entity-correlation-error">{(res as unknown as { error: string }).error}</p>
      ) : res && (
        <div className="entity-correlation-content">
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <span className="entity-correlation-value-number" style={{ color: strength?.color }}>
                {(res as CorrelationResult).r.toFixed(3)}
              </span>
              <span className="entity-correlation-value-label">r</span>
            </div>
            <div>
              <span className="entity-correlation-value-number">{(res as CorrelationResult).n}</span>
              <span className="entity-correlation-value-label">points</span>
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {(res as CorrelationResult).significant ? '✓ significant' : 'not significant'}
              </span>
            </div>
          </div>
          <p className="entity-correlation-interpretation">{(res as CorrelationResult).interpretation}</p>
        </div>
      )}
    </div>
  );
}
