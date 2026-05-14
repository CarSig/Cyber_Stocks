export default function SentimentCorrelationMetrics({ sentimentInfo, hasCorrelation, strength, corrResult }) {
  return (
    <div className="card-metrics">
      {sentimentInfo && (
        <div>
          <div className="card-metric-label">Sentiment</div>
          <span className="card-metric-value" style={{ color: sentimentInfo.color }}>{sentimentInfo.label}</span>
        </div>
      )}
      {hasCorrelation && (
        <div>
          <div className="card-metric-label">Correlation</div>
          <span className="card-metric-value" style={{ color: strength.color }}>{strength.label}</span>
          <div className="card-metric-details">
            <span>r: <strong>{corrResult.r.toFixed(3)}</strong></span>
            <span>p: <strong>{corrResult.pValue < 0.001 ? "< 0.001" : corrResult.pValue.toFixed(3)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
