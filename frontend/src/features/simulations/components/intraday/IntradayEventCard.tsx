import { useState } from 'react';
import BaseCard from '@/components/common/cards/BaseCard';
import type { IntradayEvent } from '@/features/charts/api';

function severityColor(active: boolean, severity: number): string | undefined {
  if (!active) return undefined;
  if (severity >= 9) return '#ef4444';
  if (severity >= 7) return '#f59e0b';
  return '#22c55e';
}

function SeverityBar({ severity }: { severity: number }) {
  return (
    <div className="severity-bar">
      {Array.from({ length: 10 }).map((_, i) => {
        const active = i < severity;
        const color = severityColor(active, severity);
        return <div key={i} className="severity-bar-cell" style={color ? { background: color } : undefined} />;
      })}
      <span className="severity-bar-readout">{severity}/10</span>
    </div>
  );
}

type Props = { event: IntradayEvent };

export default function IntradayEventCard({ event }: Props) {
  const primaryTicker = event.ticker.split('/')[0].trim();
  const [open, setOpen] = useState(true);

  return (
    <BaseCard variant="article">
      <div className="iec-header" onClick={() => setOpen((v) => !v)}>
        <span className="iec-rank">#{event.rank}</span>
        <span className="iec-ticker">{event.ticker}</span>
        <span className="iec-title">{event.event}</span>
        <span className="iec-header-toggle">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <>
          <SeverityBar severity={event.severity} />

          <div className="iec-grid">
            <div className="iec-field">
              <span className="iec-label">Trade idea</span>
              <span className="iec-value iec-value--idea">{event.trade_idea}</span>
            </div>
            <div className="iec-field">
              <span className="iec-label">Peers</span>
              <span className="iec-value">{event.peers.join(', ')}</span>
            </div>
            <div className="iec-field">
              <span className="iec-label">Chart day</span>
              <span className="iec-value">
                {event.chart_date}
                {event.after_hours && <span className="iec-badge">next open</span>}
              </span>
            </div>
            <div className="iec-field">
              <span className="iec-label">First reported</span>
              <span className={`iec-badge iec-badge--${event.timing}`}>{event.timing}</span>
              <span className="iec-value">
                {event.first_date} · {event.first_time}
              </span>
            </div>
            <div className="iec-field">
              <span className="iec-label">Source</span>
              <span className="iec-value">
                {event.source} · {event.source_date} · {event.source_time}
              </span>
            </div>
          </div>

          <p className="iec-notes">{event.notes}</p>

          <div className="iec-links">
            <a className="iec-link" href={event.first_link} target="_blank" rel="noreferrer">
              First report ↗
            </a>
            <a className="iec-link iec-link--source" href={event.source_link} target="_blank" rel="noreferrer">
              Source ↗
            </a>
            <a className="iec-link iec-link--ticker" href={`/${primaryTicker}`} rel="noreferrer">
              {primaryTicker} page ↗
            </a>
          </div>
        </>
      )}
    </BaseCard>
  );
}
