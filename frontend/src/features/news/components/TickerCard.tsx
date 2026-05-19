import { useCyberNewsSummary } from '@/hooks/useCyberNews';
import { useCorrelationMetrics } from '@/features/correlations/hooks';
import BaseCard from '@/components/common/BaseCard';
import CardHeader from '@/components/common/CardHeader';
import StatRowSummary from '@/components/common/StatRowSummary';
import SentimentCorrelationMetrics from '@/components/common/SentimentCorrelationMetrics';
import type { CyberNewsTicker, CorrelationResult } from '@/types';

type TickerCardProps = {
  row: CyberNewsTicker;
  onClick?: () => void;
  topic?: string;
  correlation?: { result?: CorrelationResult | { error: string } };
};

export default function TickerCard({ row, onClick, topic, correlation }: TickerCardProps) {
  const { data: summary, isPending } = useCyberNewsSummary(row.ticker, topic);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary);

  return (
    <BaseCard variant="interactive" style={{ cursor: 'pointer', opacity: isPending ? 0.6 : 1 }} onClick={onClick}>
      <CardHeader title={row.company}>
        <span className="ticker-card-ticker">{row.ticker}</span>
      </CardHeader>
      <div className="ti-card-body">
        {isPending || !summary ? (
          <p className="ti-loading">Loading…</p>
        ) : (
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
