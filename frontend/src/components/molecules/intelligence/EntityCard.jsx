import { useEntityIntelligence } from "@/hooks/useIntelligence.js";
import useCorrelationMetrics from "@/hooks/useCorrelationMetrics.js";
import StatRowSummary from "@/components/molecules/shared/StatRowSummary.jsx";

export default function EntityCard({ entity, onClick, signal, correlation }) {
  const { summary } = useEntityIntelligence(entity.entityId, signal);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary.data);

  return (
    <div className="ti-card" style={{ cursor: "pointer", opacity: summary.isPending ? 0.6 : 1 }} onClick={onClick}>
      <div className="ti-card-head">
        <span className="ti-card-title entity-name-capitalize">{entity.name}</span>
      </div>
      <div className="ti-card-body">
        {summary.isPending && <p className="ti-loading">Loading…</p>}
        {!summary.isPending && summary.error && <p className="ti-empty">No data</p>}
        {summary.data && (
          <>
            <StatRowSummary articleCount={summary.data.articleCount} positiveCount={summary.data.positiveCount} negativeCount={summary.data.negativeCount} />

            <div className="entity-card-metrics">
              {sentimentInfo && (
                <div>
                  <div className="entity-card-metric-label">Sentiment</div>
                  <span className="entity-card-metric-value" style={{ color: sentimentInfo.color }}>
                    {sentimentInfo.label}
                  </span>
                </div>
              )}
              {hasCorrelation && (
                <div>
                  <div className="entity-card-metric-label">Correlation</div>
                  <span className="entity-card-metric-value" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                  <div className="entity-card-correlation-details">
                    <span>r: <strong>{corrResult.r.toFixed(3)}</strong></span>
                    <span>p: <strong>{corrResult.pValue < 0.001 ? "< 0.001" : corrResult.pValue.toFixed(3)}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
