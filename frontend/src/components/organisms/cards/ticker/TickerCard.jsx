import { useCyberNewsSummary } from '@/hooks/useCyberNews.js';
import useCorrelationMetrics from '@/hooks/useCorrelationMetrics.js';
import BaseCard from '@/components/atoms/BaseCard.jsx';
import CardHeader from '@/components/atoms/CardHeader.jsx';
import StatRowSummary from '@/components/molecules/shared/StatRowSummary.jsx';
import SentimentCorrelationMetrics from '@/components/molecules/shared/SentimentCorrelationMetrics.jsx';

export default function TickerCard({ row, onClick, topic, correlation }) {
  const { data: summary, isPending } = useCyberNewsSummary(row.ticker, topic);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary);

  return (
    <BaseCard variant="interactive" style={{ cursor: 'pointer', opacity: isPending ? 0.6 : 1 }} onClick={onClick}>
      <CardHeader title={row.company}>
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{row.ticker}</span>
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
