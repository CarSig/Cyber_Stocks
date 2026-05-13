import { useState } from "react";
import CountBadge from "@/components/atoms/CountBadge.jsx";
import { useCyberNewsTopics } from "@/hooks/useCyberNews.js";

export default function TopicsPanel({ selectedTopic, onSelectTopic }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending } = useCyberNewsTopics();
  const visible = expanded ? data : data?.slice(0, 10);

  return (
    <div className="ti-card" style={{ cursor: "default" }}>
      <div className="ti-card-head">
        <span className="ti-card-icon">🏷️</span>
        <span className="ti-card-title">Top Topics</span>
      </div>
      <div className="ti-card-body">
        {isPending && <p className="ti-loading">Loading…</p>}
        {visible?.map((t) => (
          <div
            key={t.topic}
            onClick={() => onSelectTopic(selectedTopic === t.topic ? null : t.topic)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              fontSize: 13,
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              background: selectedTopic === t.topic ? "rgba(59, 130, 246, 0.1)" : "transparent",
              paddingLeft: selectedTopic === t.topic ? 6 : 0,
              borderLeft: selectedTopic === t.topic ? "3px solid #3b82f6" : "none",
              transition: "all 0.1s"
            }}
          >
            <span>{t.topic}</span>
            <CountBadge count={t.count} />
          </div>
        ))}
        {data?.length > 10 && (
          <button onClick={() => setExpanded((e) => !e)}
            style={{ marginTop: 10, fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {expanded ? "Show less ↑" : `Show all ${data.length} topics ↓`}
          </button>
        )}
      </div>
    </div>
  );
}
