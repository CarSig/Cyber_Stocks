import { useEntityIntelligence } from '@/features/intelligence/hooks/useIntelligence';
import { useCorrelationMetrics } from '@/features/correlations/hooks';
import BaseCard from '@/components/common/BaseCard';
import CardHeader from '@/components/common/CardHeader';
import StatRowSummary from '@/components/common/StatRowSummary';
import SentimentCorrelationMetrics from '@/components/common/SentimentCorrelationMetrics';
import type { IntelligenceEntity, CorrelationResult } from '@/types';

type EntityCardProps = {
  entity: IntelligenceEntity;
  onClick?: () => void;
  signal?: string;
  correlation?: { result?: CorrelationResult | { error: string } };
};

export default function EntityCard({ entity, onClick, signal, correlation }: EntityCardProps) {
  const { summary } = useEntityIntelligence(entity.entityId, signal);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary.data);

  return (
    <BaseCard
      variant="interactive"
      style={{ cursor: 'pointer', opacity: summary.isPending ? 0.6 : 1 }}
      onClick={onClick}
    >
      <CardHeader title={entity.name} titleClassName="entity-name-capitalize" />
      <div className="ti-card-body">
        {summary.isPending && <p className="ti-loading">Loading…</p>}
        {!summary.isPending && summary.error && <p className="ti-empty">No data</p>}
        {summary.data && (
          <>
            <StatRowSummary summary={summary.data} />
            <SentimentCorrelationMetrics
              sentimentInfo={sentimentInfo}
              hasCorrelation={hasCorrelation}
              strength={strength}
              corrResult={corrResult}
            />
          </>
        )}
      </div>
    </BaseCard>
  );
}
