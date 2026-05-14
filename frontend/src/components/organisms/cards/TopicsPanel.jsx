import { useState } from "react";
import CountBadge from "@/components/atoms/CountBadge.jsx";
import BaseCard from "@/components/atoms/BaseCard.jsx";
import CardHeader from "@/components/atoms/CardHeader.jsx";
import { useCyberNewsTopics } from "@/hooks/useCyberNews.js";

export default function TopicsPanel({ selectedTopic, onSelectTopic }) {
  return (
    <BaseCard variant="interactive" disabled>
      <TopicsPanelHeader />
      <TopicsPanelBody selectedTopic={selectedTopic} onSelectTopic={onSelectTopic} />
    </BaseCard>
  );
}

function TopicsPanelHeader() {
  return <CardHeader icon="🏷️" title="Top Topics" />;
}

function TopicsPanelBody({ selectedTopic, onSelectTopic }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending } = useCyberNewsTopics();
  const visible = expanded ? data : data?.slice(0, 10);

  const getTopicItemStyle = (isSelected) => ({
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    fontSize: 13,
    borderBottom: "1px solid var(--border)",
    cursor: "pointer",
    background: isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent",
    paddingLeft: isSelected ? 6 : 0,
    borderLeft: isSelected ? "3px solid #3b82f6" : "none",
    transition: "all 0.1s",
  });

  const getExpandButtonStyle = () => ({
    marginTop: 10,
    fontSize: 12,
    color: "var(--muted-foreground)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  });

  return (
    <div className="ti-card-body">
      {isPending && <p className="ti-loading">Loading…</p>}
      {visible?.map((t) => (
        <div key={t.topic} onClick={() => onSelectTopic(selectedTopic === t.topic ? null : t.topic)} style={getTopicItemStyle(selectedTopic === t.topic)}>
          <span>{t.topic}</span>
          <CountBadge count={t.count} />
        </div>
      ))}
      {data?.length > 10 && (
        <button onClick={() => setExpanded((e) => !e)} style={getExpandButtonStyle()}>
          {expanded ? "Show less ↑" : `Show all ${data.length} topics ↓`}
        </button>
      )}
    </div>
  );
}
