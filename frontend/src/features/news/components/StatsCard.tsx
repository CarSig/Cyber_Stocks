import BaseCard from '@/components/common/cards/BaseCard';
import Stat from '@/components/common/data-display/Stat';
import SentimentBar from '@/components/common/data-display/SentimentBar';

type StatsCardSummary = {
  articleCount?: number;
  positiveCount?: number;
  negativeCount?: number;
  neutralCount?: number;
  avgSentiment?: number;
};
type StatsCardProps = { summary: StatsCardSummary };

export default function StatsCard({ summary }: StatsCardProps) {
  return (
    <BaseCard variant="stats">
      <div className="ti-stats-row stats-card-header">
        <Stat value={summary.articleCount} label="Articles" />
        <Stat value={summary.positiveCount} label="Positive" color="var(--color-green, #22c55e)" />
        <Stat value={summary.negativeCount} label="Negative" color="var(--color-red, #ef4444)" />
        <Stat value={summary.neutralCount} label="Neutral" />
      </div>
      <p className="stats-card-avg-label">Avg sentiment</p>
      <SentimentBar value={summary.avgSentiment ?? 0} />
    </BaseCard>
  );
}
