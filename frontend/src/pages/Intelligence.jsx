import { useState } from "react";
import { useEntityIntelligence, useGlobalSignals } from "../hooks/useIntelligence.js";
import { Badge } from "../components/ui/badge.jsx";

const KNOWN_ENTITIES = ["crowdstrike", "microsoft", "apple", "zscaler", "fortinet"];

function sentimentColor(v) {
  return v > 0.1 ? "var(--color-green, #22c55e)" : v < -0.1 ? "var(--color-red, #ef4444)" : "var(--muted-foreground)";
}

function SentimentBar({ value }) {
  const pct = Math.round(((value + 1) / 2) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: sentimentColor(value), borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: sentimentColor(value), minWidth: 40, textAlign: "right" }}>
        {value > 0 ? "+" : ""}
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function ArticleDetail({ article, focusEntityId }) {
  const mention = article.entities.find((e) => e.entityId === focusEntityId);
  const title = article.id.replace(/^news-\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 10, background: "var(--card)" }}>
      {/* title + news type */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize", flex: 1 }}>{title}</span>
        <Badge variant="secondary" style={{ marginLeft: 8, flexShrink: 0 }}>
          {article.newsType.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* focused entity sentiment */}
      {mention && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>
            Sentiment for <strong style={{ textTransform: "capitalize" }}>{focusEntityId}</strong>
            {" · "}
            <span style={{ color: "var(--muted-foreground)" }}>{mention.role.replace(/_/g, " ")}</span>
            {" · "}relevance {mention.score.toFixed(2)}
          </p>
          <SentimentBar value={mention.sentiment} />
        </div>
      )}

      {/* all entities in this article */}
      {article.entities.length > 1 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>All entities</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {article.entities.map((e) => (
              <span
                key={e.entityId}
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 12,
                  background: "var(--muted)",
                  color: sentimentColor(e.sentiment),
                  border: e.entityId === focusEntityId ? "1px solid currentColor" : "1px solid transparent",
                }}
              >
                {e.name} {e.sentiment > 0 ? "+" : ""}
                {e.sentiment.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {(article.companySignals?.length > 0 || article.globalSignals.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {article.companySignals?.map((s) => (
            <Badge key={`c-${s}`} variant="outline" style={{ fontSize: 10, color: "#fb923c", borderColor: "#fb923c" }}>{s}</Badge>
          ))}
          {article.globalSignals.map((s) => (
            <Badge key={`g-${s}`} variant="outline" style={{ fontSize: 10, color: "#60a5fa", borderColor: "#60a5fa" }}>{s}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function EntityDetailPanel({ entityId, onClose }) {
  const { articles, summary } = useEntityIntelligence(entityId);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div
        style={{ width: "min(600px, 100vw)", height: "100vh", background: "var(--background)", overflowY: "auto", padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, fontSize: 20, textTransform: "capitalize" }}>{entityId}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>
            ✕
          </button>
        </div>

        {/* summary stats */}
        {summary.data && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <div className="ti-stats-row" style={{ marginBottom: 12 }}>
              <div className="ti-stat">
                <div className="ti-stat-value">{summary.data.articleCount}</div>
                <div className="ti-stat-label">Articles</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-green, #22c55e)" }}>
                  {summary.data.positiveCount}
                </div>
                <div className="ti-stat-label">Positive</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-red, #ef4444)" }}>
                  {summary.data.negativeCount}
                </div>
                <div className="ti-stat-label">Negative</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value">{summary.data.neutralCount}</div>
                <div className="ti-stat-label">Neutral</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>Avg sentiment</p>
            <SentimentBar value={summary.data.avgSentiment} />
          </div>
        )}

        {/* articles */}
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Articles ({articles.data?.length ?? 0})
        </p>
        {articles.isPending && <p className="ti-loading">Loading…</p>}
        {articles.data?.map((a) => (
          <ArticleDetail key={a.id} article={a} focusEntityId={entityId} />
        ))}
      </div>
    </div>
  );
}

function EntityCard({ entityId, onClick }) {
  const { summary } = useEntityIntelligence(entityId);

  return (
    <div className="ti-card" style={{ cursor: "pointer" }} onClick={onClick}>
      <div className="ti-card-head">
        <span className="ti-card-title" style={{ textTransform: "capitalize" }}>
          {entityId}
        </span>
        {summary.data && (
          <Badge variant={summary.data.avgSentiment > 0.1 ? "default" : summary.data.avgSentiment < -0.1 ? "destructive" : "secondary"}>
            {summary.data.avgSentiment > 0.1 ? "Positive" : summary.data.avgSentiment < -0.1 ? "Negative" : "Neutral"}
          </Badge>
        )}
      </div>
      <div className="ti-card-body">
        {summary.isPending && <p className="ti-loading">Loading…</p>}
        {summary.error && <p className="ti-empty">No data</p>}
        {summary.data && (
          <>
            <div className="ti-stats-row" style={{ marginBottom: 12 }}>
              <div className="ti-stat">
                <div className="ti-stat-value">{summary.data.articleCount}</div>
                <div className="ti-stat-label">Articles</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-green, #22c55e)" }}>
                  {summary.data.positiveCount}
                </div>
                <div className="ti-stat-label">Positive</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-red, #ef4444)" }}>
                  {summary.data.negativeCount}
                </div>
                <div className="ti-stat-label">Negative</div>
              </div>
            </div>
            <SentimentBar value={summary.data.avgSentiment} />
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 8 }}>Click to see all articles →</p>
          </>
        )}
      </div>
    </div>
  );
}

function SignalsPanel() {
  const { data, isPending, error } = useGlobalSignals();
  return (
    <div className="ti-card" style={{ cursor: "default" }}>
      <div className="ti-card-head">
        <span className="ti-card-icon">📡</span>
        <span className="ti-card-title">Global Macro Signals</span>
      </div>
      <div className="ti-card-body">
        {isPending && <p className="ti-loading">Loading…</p>}
        {error && <p className="ti-error">{error.message}</p>}
        {data?.length === 0 && <p className="ti-empty">No signals detected</p>}
        {data?.map((s) => (
          <div
            key={s.signalType}
            style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--foreground)" }}>{s.signalType}</span>
            <Badge variant="secondary">{s.count}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Intelligence() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="ti-page">
      <h1 className="ti-page-title">News Intelligence</h1>
      <p style={{ color: "var(--muted-foreground)", marginBottom: 24 }}>
        AI-extracted entities, per-entity sentiment, and macro signals. Click a company to see all articles.
      </p>

      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Entity Intelligence
      </h2>
      <div className="ti-grid" style={{ marginBottom: 32 }}>
        {KNOWN_ENTITIES.map((id) => (
          <EntityCard key={id} entityId={id} onClick={() => setSelected(id)} />
        ))}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Macro Signals
      </h2>
      <div style={{ maxWidth: 480 }}>
        <SignalsPanel />
      </div>

      {selected && <EntityDetailPanel entityId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
