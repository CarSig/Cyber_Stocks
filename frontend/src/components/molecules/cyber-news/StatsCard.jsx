import SentimentBar from "@/components/molecules/shared/SentimentBar.jsx";

const StatItem = ({ value, label, color }) => (
  <div className="ti-stat">
    <div className="ti-stat-value" style={{ color }}>
      {value}
    </div>
    <div className="ti-stat-label">{label}</div>
  </div>
);

export default function StatsCard({ summary }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
      <div className="ti-stats-row" style={{ marginBottom: 12 }}>
        <StatItem value={summary.articleCount} label="Articles" />
        <StatItem value={summary.positiveCount} label="Positive" color="var(--color-green, #22c55e)" />
        <StatItem value={summary.negativeCount} label="Negative" color="var(--color-red, #ef4444)" />
        <StatItem value={summary.neutralCount} label="Neutral" />
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>Avg sentiment</p>
      <SentimentBar value={summary.avgSentiment} />
    </div>
  );
}
