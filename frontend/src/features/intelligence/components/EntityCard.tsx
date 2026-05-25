import { useEntityIntelligence } from '@/features/intelligence/hooks/useIntelligence';
import SummaryCard from '@/features/news/components/SummaryCard';
import type { IntelligenceEntity, CorrelationResult } from '@/types';

type EntityCardProps = {
  entity: IntelligenceEntity;
  onClick?: () => void;
  signal?: string;
  correlation?: { result?: CorrelationResult | { error: string } };
};

export default function EntityCard({ entity, onClick, signal, correlation }: EntityCardProps) {
  const { summary } = useEntityIntelligence(entity.entityId, signal);
  return (
    <SummaryCard
      title={entity.name}
      titleClassName="entity-name-capitalize"
      summary={summary.data ?? undefined}
      isPending={summary.isPending}
      correlation={correlation}
      onClick={onClick}
    />
  );
}
