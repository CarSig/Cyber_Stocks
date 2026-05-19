import type { IntelligenceSignal } from '@/types';

type SignalSidebarProps = {
  selectedSignal?: string | null;
  data?: IntelligenceSignal[];
};

export default function SignalSidebar({ selectedSignal, data }: SignalSidebarProps) {
  if (!selectedSignal || !data) return null;
  const signal = data.find((s) => s.signalType === selectedSignal);
  if (!signal) return null;

  return (
    <div className="signal-sidebar">
      <div className="signal-sidebar-header header-flex-between">
        <h3 className="signal-sidebar-title">{selectedSignal}</h3>
      </div>
      <div className="signal-sidebar-content card-inset">
        <p className="signal-sidebar-label label-sm-caps">Articles</p>
        <p className="signal-sidebar-count metric-value">{signal.count}</p>
      </div>
      <div className="signal-sidebar-description">
        <p>
          This signal appears in <strong>{signal.count}</strong> articles across your tracked entities.
        </p>
      </div>
    </div>
  );
}
