import { useState } from "react";
import { useEntityIntelligence, useGlobalSignals, useBackendEntities, useAllSentimentCorrelations } from "../hooks/useIntelligence.js";
import { Badge } from "../components/ui/badge.jsx";


function sentimentColor(v) {
  return v > 0.1 ? "var(--color-green, #22c55e)" : v < -0.1 ? "var(--color-red, #ef4444)" : "var(--muted-foreground)";
}

function rColor(r) {
  if (r > 0.1) return "var(--color-green, #22c55e)";
  if (r < -0.1) return "var(--color-red, #ef4444)";
  return "var(--muted-foreground)";
}

function SentimentBar({ value }) {
  const pct = Math.round(((value + 1) / 2) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: sentimentColor(value), borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: sentimentColor(value), minWidth: 40, textAlign: "right" }}>
        {value > 0 ? "+" : ""}{value.toFixed(2)}
      </span>
    </div>
  );
}

function ArticleDetail({ article, focusEntityId }) {
  const mention = article.entities.find((e) => e.entityId === focusEntityId);
  const title = article.title ?? article.id.replace(/^[a-z]+-\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 10, background: "var(--card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize", flex: 1 }}>{title}</span>
        <Badge variant="secondary" style={{ marginLeft: 8, flexShrink: 0 }}>
          {article.newsType.replace(/_/g, " ")}
        </Badge>
      </div>

      {article.publisher && (
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>
          {article.publisher}
          {article.link && (
            <> · <a href={article.link} target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--muted-foreground)", textDecoration: "underline" }}>source ↗</a></>
          )}
        </p>
      )}

      {mention && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>
            Sentiment for <strong style={{ textTransform: "capitalize" }}>{focusEntityId}</strong>
            {" · "}<span>{mention.role.replace(/_/g, " ")}</span>
            {" · "}relevance {mention.score.toFixed(2)}
          </p>
          <SentimentBar value={mention.sentiment} />
        </div>
      )}

      {article.entities.length > 1 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>All entities</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {article.entities.map((e) => (
              <span key={e.entityId} style={{
                fontSize: 11, padding: "2px 7px", borderRadius: 12,
                background: "var(--muted)", color: sentimentColor(e.sentiment),
                border: e.entityId === focusEntityId ? "1px solid currentColor" : "1px solid transparent",
              }}>
                {e.name} {e.sentiment > 0 ? "+" : ""}{e.sentiment.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {(article.companySignals?.length > 0 || article.globalSignals?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {article.companySignals?.map((s) => (
            <Badge key={`c-${s}`} variant="outline" style={{ fontSize: 10, color: "#fb923c", borderColor: "#fb923c" }}>{s}</Badge>
          ))}
          {article.globalSignals?.map((s) => (
            <Badge key={`g-${s}`} variant="outline" style={{ fontSize: 10, color: "#60a5fa", borderColor: "#60a5fa" }}>{s}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function EntityCorrelation({ entityId }) {
  const { data } = useAllSentimentCorrelations(1);
  const row = data?.find((r) => r.entityId === entityId);
  if (!row) return null;
  const res = row.result;
  const hasError = "error" in res;
  return (
    <div style={{ background: "var(--card)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
        Sentiment ↔ Price Correlation
      </p>
      {hasError ? (
        <p style={{ fontSize: 12, color: "var(--color-red, #ef4444)" }}>{res.error}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, color: rColor(res.r) }}>{res.r.toFixed(3)}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 4 }}>r</span>
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{res.n}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 4 }}>points</span>
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{res.significant ? "✓ significant" : "not significant"}</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{res.interpretation}</p>
        </div>
      )}
    </div>
  );
}

function EntityDetailPanel({ entityId, onClose }) {
  const { articles, summary } = useEntityIntelligence(entityId);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}>
      <div style={{ width: "min(600px, 100vw)", height: "100vh", background: "var(--background)", overflowY: "auto", padding: 24 }}
        onClick={(e) => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, fontSize: 20, textTransform: "capitalize" }}>{entityId}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)" }}>✕</button>
        </div>

        <EntityCorrelation entityId={entityId} />

        {summary.data && (
          <div style={{ background: "var(--card)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <div className="ti-stats-row" style={{ marginBottom: 12 }}>
              <div className="ti-stat">
                <div className="ti-stat-value">{summary.data.articleCount}</div>
                <div className="ti-stat-label">Articles</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-green, #22c55e)" }}>{summary.data.positiveCount}</div>
                <div className="ti-stat-label">Positive</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-red, #ef4444)" }}>{summary.data.negativeCount}</div>
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

function EntityCard({ entity, onClick }) {
  const { summary } = useEntityIntelligence(entity.entityId);

  return (
    <div className="ti-card" style={{ cursor: "pointer" }} onClick={onClick}>
      <div className="ti-card-head">
        <span className="ti-card-title" style={{ textTransform: "capitalize" }}>{entity.name}</span>
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
            <div className="ti-stats-row">
              <div className="ti-stat">
                <div className="ti-stat-value">{summary.data.articleCount}</div>
                <div className="ti-stat-label">art</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-green, #22c55e)" }}>{summary.data.positiveCount}</div>
                <div className="ti-stat-label">pos</div>
              </div>
              <div className="ti-stat">
                <div className="ti-stat-value" style={{ color: "var(--color-red, #ef4444)" }}>{summary.data.negativeCount}</div>
                <div className="ti-stat-label">neg</div>
              </div>
            </div>
            <SentimentBar value={summary.data.avgSentiment} />
          </>
        )}
      </div>
    </div>
  );
}

function SignalsPanel() {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, error } = useGlobalSignals();
  const filtered = data?.filter((s) => s.count >= 5) ?? [];
  const visible = expanded ? filtered : filtered.slice(0, 10);

  return (
    <div className="ti-card" style={{ cursor: "default" }}>
      <div className="ti-card-head">
        <span className="ti-card-icon">📡</span>
        <span className="ti-card-title">Global Macro Signals</span>
      </div>
      <div className="ti-card-body">
        {isPending && <p className="ti-loading">Loading…</p>}
        {error && <p className="ti-error">{error.message}</p>}
        {filtered.length === 0 && !isPending && <p className="ti-empty">No signals detected</p>}
        {visible.map((s) => (
          <div key={s.signalType} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--foreground)" }}>{s.signalType}</span>
            <Badge variant="secondary">{s.count}</Badge>
          </div>
        ))}
        {filtered.length > 10 && (
          <button onClick={() => setExpanded((e) => !e)} style={{ marginTop: 10, fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {expanded ? "Show less ↑" : `Show all ${filtered.length} signals ↓`}
          </button>
        )}
      </div>
    </div>
  );
}

function CorrelationSection() {
  const [lagDays, setLagDays] = useState(1);
  const { data, isPending, error } = useAllSentimentCorrelations(lagDays);

  const thStyle = { padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          Sentiment ↔ Price Correlation
        </h2>
        <select
          value={lagDays}
          onChange={(e) => setLagDays(Number(e.target.value))}
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer" }}
        >
          {[1, 2, 3, 5, 7, 14].map((d) => (
            <option key={d} value={d}>{`${d}d lag`}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
          Each company's news sentiment (weighted by relevance) vs its own stock's {lagDays}d price return
        </span>
      </div>

      {isPending && <p className="ti-loading">Computing correlations…</p>}
      {error && <p className="ti-error">{error.message}</p>}
      {data && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={{ ...thStyle }}>Company</th>
                <th style={{ ...thStyle, textAlign: "right" }}>r</th>
                <th style={{ ...thStyle, textAlign: "right" }}>p-value</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Sig.</th>
                <th style={{ ...thStyle, textAlign: "right" }}>n</th>
                <th style={{ ...thStyle }}>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const res = row.result;
                const hasError = "error" in res;
                return (
                  <tr key={row.entityId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>
                      {row.name}
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 6 }}>{row.ticker}</span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {hasError ? "—" : <span style={{ color: rColor(res.r), fontWeight: 600 }}>{res.r.toFixed(3)}</span>}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted-foreground)" }}>
                      {hasError ? "—" : (res.pValue < 0.001 ? "< 0.001" : res.pValue.toFixed(3))}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {!hasError && (
                        <Badge variant={res.significant ? "default" : "secondary"} style={{ fontSize: 10 }}>
                          {res.significant ? "Yes" : "No"}
                        </Badge>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted-foreground)" }}>
                      {hasError ? "—" : res.n}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--muted-foreground)" }}>
                      {hasError ? <span style={{ color: "var(--color-red, #ef4444)" }}>{res.error}</span> : res.interpretation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Intelligence2() {
  const [selected, setSelected] = useState(null);
  const { data: entities, isPending } = useBackendEntities();

  const uniqueEntities = entities
    ? [...new Map(entities.map((e) => [e.entityId, e])).values()]
    : [];

  return (
    <div className="ti-page">
      <h1 className="ti-page-title">News Intelligence</h1>
      <p style={{ color: "var(--muted-foreground)", marginBottom: 24 }}>
        AI-extracted entities, per-entity sentiment, and macro signals from Yahoo news. Click a company to see all articles.
      </p>

      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Entity Intelligence
      </h2>
      {isPending && <p className="ti-loading">Loading entities…</p>}
      <div className="ti-grid" style={{ marginBottom: 32 }}>
        {uniqueEntities.map((e) => (
          <EntityCard key={e.entityId} entity={e} onClick={() => setSelected(e.entityId)} />
        ))}
      </div>

      <CorrelationSection />

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
