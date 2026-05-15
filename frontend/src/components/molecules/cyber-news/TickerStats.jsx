import StatsGrid from './StatsGrid.jsx';
import StatSection from './StatSection.jsx';

export default function TickerStats({ summary, sentimentInfo, hasCorrelation, strength, corrResult }) {
  return (
    <>
      <StatsGrid
        stats={[
          { value: summary.articleCount, label: 'total' },
          { value: summary.positiveCount, label: 'positive', color: 'var(--color-green, #22c55e)' },
          { value: summary.negativeCount, label: 'negative', color: 'var(--color-red, #ef4444)' },
        ]}
      />

      <StatSection
        label="Avg Sentiment"
        value={sentimentInfo?.label}
        valueColor={sentimentInfo?.color}
        subtitle={`${summary.avgSentiment > 0 ? '+' : ''}${summary.avgSentiment.toFixed(2)}`}
      />

      {hasCorrelation && (
        <StatSection label="Correlation" value={strength.label} valueColor={strength.color}>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--muted-foreground)', marginTop: 4 }}>
            <span>r: {corrResult.r.toFixed(3)}</span>
            <span>p: {corrResult.pValue < 0.001 ? '< 0.001' : corrResult.pValue.toFixed(3)}</span>
          </div>
        </StatSection>
      )}
    </>
  );
}
