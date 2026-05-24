import StatsGrid from './StatsGrid';
import StatSection from './StatSection';
import type { CorrelationResult, SentimentLabel } from '@/types';

export type SummaryData = {
  avgSentiment: number;
  articleCount?: number;
  positiveCount?: number;
  negativeCount?: number;
};

type SummaryStatsProps = {
  summary: SummaryData;
  sentimentInfo: SentimentLabel | null;
  hasCorrelation: boolean;
  strength: SentimentLabel | null;
  corrResult?: CorrelationResult | { error: string };
};

export default function SummaryStats({
  summary,
  sentimentInfo,
  hasCorrelation,
  strength,
  corrResult,
}: SummaryStatsProps) {
  const showCorrelation = hasCorrelation && strength && corrResult && !('error' in corrResult);
  const corr = showCorrelation ? (corrResult as CorrelationResult) : null;

  return (
    <>
      <StatsGrid
        stats={[
          { value: summary.articleCount, label: 'total' },
          { value: summary.positiveCount, label: 'positive', tone: 'positive' },
          { value: summary.negativeCount, label: 'negative', tone: 'negative' },
        ]}
      />

      <StatSection
        label="Avg Sentiment"
        value={sentimentInfo?.label}
        valueColor={sentimentInfo?.color}
        subtitle={`${summary.avgSentiment > 0 ? '+' : ''}${summary.avgSentiment.toFixed(2)}`}
      />

      {corr && (
        <StatSection label="Correlation" value={strength!.label} valueColor={strength!.color}>
          <div className="stat-details-row">
            <span>r: {corr.r.toFixed(3)}</span>
            <span>p: {corr.pValue < 0.001 ? '< 0.001' : corr.pValue.toFixed(3)}</span>
          </div>
        </StatSection>
      )}
    </>
  );
}
