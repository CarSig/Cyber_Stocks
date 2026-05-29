import type { ReactNode } from 'react';
import BaseCard from '@/components/common/cards/BaseCard';
import CardHeader from '@/components/common/cards/CardHeader';
import StatRowSummary from './StatRowSummary';
import SentimentCorrelationMetrics from './SentimentCorrelationMetrics';
import useCorrelationMetrics from '@/features/correlations/hooks/useCorrelationMetrics';
import type { SummaryData } from './SummaryStats';
import type { CorrelationWrapper } from '@/features/correlations/types';

type SummaryCardProps = {
  title: ReactNode;
  titleClassName?: string;
  /** Optional element rendered to the right of the title (e.g. ticker badge). */
  headerExtra?: ReactNode;
  summary: SummaryData | undefined;
  isPending: boolean;
  correlation?: CorrelationWrapper;
  onClick?: () => void;
};

export default function SummaryCard({
  title,
  titleClassName,
  headerExtra,
  summary,
  isPending,
  correlation,
  onClick,
}: SummaryCardProps) {
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary);

  return (
    <BaseCard variant="interactive" style={{ cursor: 'pointer', opacity: isPending ? 0.6 : 1 }} onClick={onClick}>
      <CardHeader title={title} titleClassName={titleClassName}>
        {headerExtra}
      </CardHeader>
      <div className="ti-card-body">
        {isPending && <p className="ti-loading">Loading…</p>}
        {!isPending && !summary && <p className="ti-empty">No data</p>}
        {summary && (
          <>
            <StatRowSummary summary={summary} />
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
