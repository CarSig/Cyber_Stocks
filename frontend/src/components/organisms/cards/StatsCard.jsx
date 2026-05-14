import BaseCard from "@/components/atoms/BaseCard.jsx";
import Stat from "@/components/atoms/Stat.jsx";
import SentimentBar from "@/components/molecules/shared/SentimentBar.jsx";

export default function StatsCard({ summary }) {
  return (
    <BaseCard variant="stats">
      <div className="ti-stats-row" style={{ marginBottom: 12 }}>
        <Stat value={summary.articleCount} label="Articles" />
        <Stat value={summary.positiveCount} label="Positive" color="var(--color-green, #22c55e)" />
        <Stat value={summary.negativeCount} label="Negative" color="var(--color-red, #ef4444)" />
        <Stat value={summary.neutralCount} label="Neutral" />
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>Avg sentiment</p>
      <SentimentBar value={summary.avgSentiment} />
    </BaseCard>
  );
}
