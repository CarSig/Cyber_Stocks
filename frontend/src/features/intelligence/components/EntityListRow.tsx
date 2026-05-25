import { useEntityIntelligence } from '@/features/intelligence/hooks/useIntelligence';
import SummaryListRow from '@/features/news/components/SummaryListRow';
import type { IntelligenceEntity, CorrelationResult } from '@/types';

type EntityListRowProps = {
  entity: IntelligenceEntity;
  onClick?: () => void;
  signal?: string;
  correlation?: { result?: CorrelationResult | { error: string } };
};

export default function EntityListRow({ entity, onClick, signal, correlation }: EntityListRowProps) {
  const { summary } = useEntityIntelligence(entity.entityId, signal);
  return (
    <SummaryListRow
      title={entity.name}
      titleClassName="entity-name-capitalize"
      summary={summary.data ?? undefined}
      isPending={summary.isPending}
      correlation={correlation}
      onClick={onClick}
    />
  );
}
