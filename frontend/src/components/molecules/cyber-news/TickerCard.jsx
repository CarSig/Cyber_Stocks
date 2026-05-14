import { useCyberNewsSummary } from "@/hooks/useCyberNews.js";
import useCorrelationMetrics from "@/hooks/useCorrelationMetrics.js";
import StatRowSummary from "@/components/molecules/shared/StatRowSummary.jsx";

export default function TickerCard({ row, onClick, topic, correlation }) {
  const { data: summary, isPending } = useCyberNewsSummary(row.ticker, topic);
  const { corrResult, hasCorrelation, strength, sentimentInfo } = useCorrelationMetrics(correlation, summary);

  return (
    <div className="ti-card" style={{ cursor: "pointer", opacity: isPending ? 0.6 : 1 }} onClick={onClick}>
      <TickerCardHead row={row} />
      <TickerCardBody isPending={isPending} summary={summary} sentimentInfo={sentimentInfo} hasCorrelation={hasCorrelation} strength={strength} corrResult={corrResult} />
    </div>
  );
}

function TickerCardHead({ row }) {
  return (
    <div className="ti-card-head">
      <span className="ti-card-title">{row.company}</span>
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{row.ticker}</span>
    </div>
  );
}

function TickerCardBody({ isPending, summary, sentimentInfo, hasCorrelation, strength, corrResult }) {
  return (
    <div className="ti-card-body">
      {isPending ? (
        <p className="ti-loading">Loading…</p>
      ) : summary ? (
        <CardContent summary={summary} sentimentInfo={sentimentInfo} hasCorrelation={hasCorrelation} strength={strength} corrResult={corrResult} />
      ) : (
        <p className="ti-loading">Loading…</p>
      )}
    </div>
  );
}

function CardContent({ summary, sentimentInfo, hasCorrelation, strength, corrResult }) {
  return (
    <>
      <StatRowSummary summary={summary} />
      <SentimentCorrelationSection sentimentInfo={sentimentInfo} hasCorrelation={hasCorrelation} strength={strength} corrResult={corrResult} />
    </>
  );
}

function SentimentCorrelationSection({ sentimentInfo, hasCorrelation, strength, corrResult }) {
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {sentimentInfo && (
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>Sentiment</div>
          <span style={{ fontWeight: 600, fontSize: 12, color: sentimentInfo.color }}>{sentimentInfo.label}</span>
        </div>
      )}
      {hasCorrelation && (
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>Correlation</div>
          <span style={{ fontWeight: 600, fontSize: 12, color: strength.color }}>{strength.label}</span>
          <div style={{ display: "flex", gap: 12, fontSize: 9, color: "var(--muted-foreground)", marginTop: 3 }}>
            r: <strong>{corrResult.r.toFixed(3)}</strong>
            p: <strong>{corrResult.pValue < 0.001 ? "< 0.001" : corrResult.pValue.toFixed(3)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
