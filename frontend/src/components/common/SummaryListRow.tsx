import type { ReactNode } from 'react';
import SummaryStats from './SummaryStats';
import useCorrelationMetrics from '@/features/correlations/hooks/useCorrelationMetrics';
import type { SummaryData } from './SummaryStats';
import type { CorrelationWrapper } from '@/features/correlations/types';

type SummaryListRowProps = {
  title: ReactNode;
  /** Optional secondary line under the title (e.g. ticker symbol under company name). */
  subtitle?: ReactNode;
  titleClassName?: string;
  summary: SummaryData | undefined;
  isPending: boolean;
  correlation?: CorrelationWrapper;
  onClick?: () => void;
};

export default function SummaryListRow({
  title,
  subtitle,
  titleClassName,
  summary,
  isPending,
  correlation,
  onClick,
}: SummaryListRowProps) {
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary);

  return (
    <div onClick={onClick} className={`summary-list-row list-row-card ${isPending ? 'loading' : ''}`}>
      <div className="summary-list-row-info">
        <div className={`summary-list-row-title ${titleClassName ?? ''}`.trim()}>{title}</div>
        {subtitle && <div className="summary-list-row-subtitle">{subtitle}</div>}
      </div>

      {isPending ? (
        <div className="summary-list-row-empty">Loading…</div>
      ) : summary ? (
        <SummaryStats
          summary={summary}
          sentimentInfo={sentimentInfo}
          hasCorrelation={hasCorrelation}
          strength={strength}
          corrResult={corrResult}
        />
      ) : (
        <div className="summary-list-row-empty">No data</div>
      )}
    </div>
  );
}
