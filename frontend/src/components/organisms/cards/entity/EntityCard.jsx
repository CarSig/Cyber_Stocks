import { useEntityIntelligence } from "@/hooks/useIntelligence.js";
import useCorrelationMetrics from "@/hooks/useCorrelationMetrics.js";
import BaseCard from "@/components/atoms/BaseCard.jsx";
import CardHeader from "@/components/atoms/CardHeader.jsx";
import StatRowSummary from "@/components/molecules/shared/StatRowSummary.jsx";
import SentimentCorrelationMetrics from "@/components/molecules/shared/SentimentCorrelationMetrics.jsx";

export default function EntityCard({ entity, onClick, signal, correlation }) {
  const { summary } = useEntityIntelligence(entity.entityId, signal);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary.data);

  return (
    <BaseCard variant="interactive" style={{ cursor: "pointer", opacity: summary.isPending ? 0.6 : 1 }} onClick={onClick}>
      <CardHeader title={entity.name} titleClassName="entity-name-capitalize" />
      <div className="ti-card-body">
        {summary.isPending && <p className="ti-loading">Loading…</p>}
        {!summary.isPending && summary.error && <p className="ti-empty">No data</p>}
        {summary.data && (
          <>
            <StatRowSummary summary={summary.data} />
            <SentimentCorrelationMetrics sentimentInfo={sentimentInfo} hasCorrelation={hasCorrelation} strength={strength} corrResult={corrResult} />
          </>
        )}
      </div>
    </BaseCard>
  );
}
