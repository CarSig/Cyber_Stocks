import "./TopicsSidebar.css";

export default function TopicsSidebar({ selectedTopic, data }) {
  if (!selectedTopic || !data) return null;
  const topic = data.find((t) => t.topic === selectedTopic);
  if (!topic) return null;

  return (
    <div className="topics-sidebar">
      <div className="topics-sidebar-header header-flex-between">
        <h3 className="topics-sidebar-title">{selectedTopic}</h3>
      </div>
      <div className="topics-sidebar-card">
        <p className="label-sm-caps" style={{ marginBottom: "var(--ts-spacing-sm)" }}>Articles</p>
        <p className="metric-value">{topic.count}</p>
      </div>
      <div className="topics-sidebar-description">
        <p>This topic appears in <strong>{topic.count}</strong> articles across your tracked companies.</p>
      </div>
    </div>
  );
}
