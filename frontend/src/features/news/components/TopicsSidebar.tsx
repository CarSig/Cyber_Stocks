import BaseCard from '@/components/common/cards/BaseCard';

type TopicEntry = { topic: string; count: number };
type TopicsSidebarProps = { selectedTopic: string | null; data?: TopicEntry[] };

export default function TopicsSidebar({ selectedTopic, data }: TopicsSidebarProps) {
  if (!selectedTopic || !data) return null;
  const topic = data.find((t) => t.topic === selectedTopic);
  if (!topic) return null;

  return (
    <BaseCard className="topics-sidebar">
      <TopicsSidebarHeader selectedTopic={selectedTopic} />
      <TopicsSidebarCard count={topic.count} />
      <TopicsSidebarDescription count={topic.count} />
    </BaseCard>
  );
}

function TopicsSidebarHeader({ selectedTopic }: { selectedTopic: string }) {
  return (
    <div className="topics-sidebar-header header-flex-between">
      <h3 className="topics-sidebar-title">{selectedTopic}</h3>
    </div>
  );
}

function TopicsSidebarCard({ count }: { count: number }) {
  return (
    <div className="topics-sidebar-card">
      <p className="label-sm-caps" style={{ marginBottom: 'var(--ts-spacing-sm)' }}>
        Articles
      </p>
      <p className="metric-value">{count}</p>
    </div>
  );
}

function TopicsSidebarDescription({ count }: { count: number }) {
  return (
    <div className="topics-sidebar-description">
      <p>
        This topic appears in <strong>{count}</strong> articles across your tracked companies.
      </p>
    </div>
  );
}
