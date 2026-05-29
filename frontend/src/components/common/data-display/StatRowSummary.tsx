import type { CSSProperties } from 'react';

type Summary = {
  articleCount?: number;
  positiveCount?: number;
  negativeCount?: number;
  neutralCount?: number;
};

type Labels = {
  articles?: string;
  positive?: string;
  negative?: string;
  neutral?: string;
};

type StatRowSummaryProps = {
  summary?: Summary | null;
  labels?: Labels;
  style?: CSSProperties;
};

export default function StatRowSummary({ summary, labels, style }: StatRowSummaryProps) {
  if (!summary) return null;
  const { articleCount, positiveCount, negativeCount, neutralCount } = summary;
  const l = {
    articles: 'art',
    positive: 'pos',
    negative: 'neg',
    neutral: 'neu',
    ...labels,
  };

  return (
    <div className="ti-stats-row" style={style}>
      <div className="ti-stat">
        <div className="ti-stat-value">{articleCount}</div>
        <div className="ti-stat-label">{l.articles}</div>
      </div>
      <div className="ti-stat">
        <div className="ti-stat-value text-positive">{positiveCount}</div>
        <div className="ti-stat-label">{l.positive}</div>
      </div>
      <div className="ti-stat">
        <div className="ti-stat-value text-negative">{negativeCount}</div>
        <div className="ti-stat-label">{l.negative}</div>
      </div>
      {neutralCount !== undefined && (
        <div className="ti-stat">
          <div className="ti-stat-value">{neutralCount}</div>
          <div className="ti-stat-label">{l.neutral}</div>
        </div>
      )}
    </div>
  );
}
