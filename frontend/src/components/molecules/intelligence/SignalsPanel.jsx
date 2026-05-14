import { useState } from "react";
import BaseCard from "@/components/atoms/BaseCard.jsx";
import CountBadge from "@/components/atoms/CountBadge.jsx";
import { useGlobalSignals } from "@/hooks/useIntelligence.js";

export default function SignalsPanel({ selectedSignal, onSelectSignal }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, error } = useGlobalSignals();
  const filtered = data?.filter((s) => s.count >= 5) ?? [];
  const visible = expanded ? filtered : filtered.slice(0, 10);

  return (
    <BaseCard className="ti-card signals-panel">
      <div className="ti-card-head">
        <span className="ti-card-icon">📡</span>
        <span className="ti-card-title">Global Macro Signals</span>
      </div>
      <div className="ti-card-body">
        {isPending && <p className="ti-loading">Loading…</p>}
        {error && <p className="ti-error">{error.message}</p>}
        {filtered.length === 0 && !isPending && <p className="ti-empty">No signals detected</p>}
        {visible.map((s) => (
          <div
            key={s.signalType}
            onClick={() => onSelectSignal(selectedSignal === s.signalType ? null : s.signalType)}
            className={`signals-panel-item ${selectedSignal === s.signalType ? "signals-panel-item-active" : ""}`}
          >
            <span style={{ color: "var(--foreground)" }}>{s.signalType}</span>
            <CountBadge count={s.count} />
          </div>
        ))}
        {filtered.length > 10 && (
          <button onClick={() => setExpanded((e) => !e)} className="signals-panel-expand-button">
            {expanded ? "Show less ↑" : `Show all ${filtered.length} signals ↓`}
          </button>
        )}
      </div>
    </div>
  );
}
