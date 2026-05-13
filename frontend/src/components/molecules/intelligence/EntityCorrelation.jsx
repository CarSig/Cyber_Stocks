import { correlationStrength } from "@/utils/sentimentUtils.js";
import { useAllSentimentCorrelations } from "@/hooks/useIntelligence.js";

export default function EntityCorrelation({ entityId }) {
  const { data } = useAllSentimentCorrelations(1);
  const row = data?.find((r) => r.entityId === entityId);
  if (!row) return null;
  const res = row.result;
  const hasError = "error" in res;
  const strength = !hasError ? correlationStrength(res.r) : null;

  return (
    <div className="entity-correlation card-inset">
      <p className="entity-correlation-title">Sentiment ↔ Price Correlation</p>
      {hasError ? (
        <p className="entity-correlation-error">{res.error}</p>
      ) : (
        <div className="entity-correlation-content">
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <span className="entity-correlation-value-number" style={{ color: strength.color }}>
                {res.r.toFixed(3)}
              </span>
              <span className="entity-correlation-value-label">r</span>
            </div>
            <div>
              <span className="entity-correlation-value-number">{res.n}</span>
              <span className="entity-correlation-value-label">points</span>
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{res.significant ? "✓ significant" : "not significant"}</span>
            </div>
          </div>
          <p className="entity-correlation-interpretation">{res.interpretation}</p>
        </div>
      )}
    </div>
  );
}
