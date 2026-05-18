import type { IntradayEvent } from '@/api/alpaca';

function SeverityBar({ severity }: { severity: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 12,
            borderRadius: 2,
            background:
              i < severity
                ? severity >= 9
                  ? '#ef4444'
                  : severity >= 7
                    ? '#f59e0b'
                    : '#22c55e'
                : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
      <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{severity}/10</span>
    </div>
  );
}

type Props = { event: IntradayEvent };

export default function IntradayEventCard({ event }: Props) {
  const primaryTicker = event.ticker.split('/')[0].trim();

  return (
    <div className="intraday-event-card">
      <div className="iec-header">
        <span className="iec-rank">#{event.rank}</span>
        <span className="iec-ticker">{event.ticker}</span>
        <span className="iec-title">{event.event}</span>
      </div>

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
        <a className="iec-link" href={event.source_link} target="_blank" rel="noreferrer">
          Source ↗
        </a>
        <a className="iec-link iec-link--ticker" href={`/${primaryTicker}`} rel="noreferrer">
          {primaryTicker} page ↗
        </a>
      </div>
    </div>
  );
}
