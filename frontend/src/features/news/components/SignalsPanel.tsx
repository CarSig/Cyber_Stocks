import { useState } from 'react';
import BaseCard from '@/components/common/cards/BaseCard';
import CardHeader from '@/components/common/cards/CardHeader';
import CountBadge from '@/components/common/data-display/CountBadge';
import { useGlobalSignals } from '@/features/intelligence/hooks/useIntelligence';

type SignalsPanelProps = { selectedSignal: string | null; onSelectSignal: (signal: string | null) => void };

export default function SignalsPanel({ selectedSignal, onSelectSignal }: SignalsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, error } = useGlobalSignals();
  const filtered = data?.filter((s) => s.count >= 5) ?? [];
  const visible = expanded ? filtered : filtered.slice(0, 10);

  return (
    <BaseCard variant="interactive" className="signals-panel">
      <CardHeader icon="📡" title="Global Macro Signals" />
      <div className="ti-card-body">
        {isPending && <p className="ti-loading">Loading…</p>}
        {error && <p className="ti-error">{error.message}</p>}
        {filtered.length === 0 && !isPending && <p className="ti-empty">No signals detected</p>}
        {visible.map((s) => (
          <div
            key={s.signalType}
            onClick={() => onSelectSignal(selectedSignal === s.signalType ? null : s.signalType)}
            className={`signals-panel-item ${selectedSignal === s.signalType ? 'signals-panel-item-active' : ''}`}
          >
            <span style={{ color: 'var(--foreground)' }}>{s.signalType}</span>
            <CountBadge count={s.count} />
          </div>
        ))}
        {filtered.length > 10 && (
          <button onClick={() => setExpanded((e) => !e)} className="signals-panel-expand-button">
            {expanded ? 'Show less ↑' : `Show all ${filtered.length} signals ↓`}
          </button>
        )}
      </div>
    </BaseCard>
  );
}
