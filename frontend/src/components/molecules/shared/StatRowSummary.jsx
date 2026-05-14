export default function StatRowSummary({ summary, labels, style }) {
  if (!summary) return null;
  const { articleCount, positiveCount, negativeCount, neutralCount } = summary;
  const l = {
    articles: "art",
    positive: "pos",
    negative: "neg",
    neutral: "neu",
    ...labels,
  };

  return (
    <div className="ti-stats-row" style={style}>
      <div className="ti-stat">
        <div className="ti-stat-value">{articleCount}</div>
        <div className="ti-stat-label">{l.articles}</div>
      </div>
      <div className="ti-stat">
        <div className="ti-stat-value" style={{ color: "var(--color-green, #22c55e)" }}>
          {positiveCount}
        </div>
        <div className="ti-stat-label">{l.positive}</div>
      </div>
      <div className="ti-stat">
        <div className="ti-stat-value" style={{ color: "var(--color-red, #ef4444)" }}>
          {negativeCount}
        </div>
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
