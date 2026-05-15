import React from 'react';
import StatsGrid from './StatsGrid';
import StatSection from './StatSection';
import type { CyberNewsSummary, CorrelationResult, SentimentLabel } from '@/types';

type TickerStatsProps = {
  summary: CyberNewsSummary & { articleCount?: number; positiveCount?: number; negativeCount?: number };
  sentimentInfo: SentimentLabel | null;
  hasCorrelation: boolean;
  strength: SentimentLabel | null;
  corrResult?: CorrelationResult | { error: string };
};

export default function TickerStats({ summary, sentimentInfo, hasCorrelation, strength, corrResult }: TickerStatsProps) {
  return (
    <>
      <StatsGrid
        stats={[
          { value: (summary as Record<string, unknown>).articleCount as React.ReactNode, label: 'total' },
          { value: (summary as Record<string, unknown>).positiveCount as React.ReactNode, label: 'positive', color: 'var(--color-green, #22c55e)' },
          { value: (summary as Record<string, unknown>).negativeCount as React.ReactNode, label: 'negative', color: 'var(--color-red, #ef4444)' },
        ]}
      />

      <StatSection
        label="Avg Sentiment"
        value={sentimentInfo?.label}
        valueColor={sentimentInfo?.color}
        subtitle={`${summary.avgSentiment > 0 ? '+' : ''}${summary.avgSentiment.toFixed(2)}`}
      />

      {hasCorrelation && strength && corrResult && !('error' in corrResult) && (
        <StatSection label="Correlation" value={strength.label} valueColor={strength.color}>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--muted-foreground)', marginTop: 4 }}>
            <span>r: {(corrResult as CorrelationResult).r.toFixed(3)}</span>
            <span>p: {(corrResult as CorrelationResult).pValue < 0.001 ? '< 0.001' : (corrResult as CorrelationResult).pValue.toFixed(3)}</span>
          </div>
        </StatSection>
      )}
    </>
  );
}
