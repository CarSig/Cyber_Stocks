import type { ReactNode } from 'react';

type StatEntry = {
  label: string;
  value: ReactNode;
  /** Optional sentiment hint: maps to .text-positive / .text-negative. */
  tone?: 'positive' | 'negative';
};

type StatsGridProps = {
  groupLabel?: string;
  stats: StatEntry[];
};

const toneClass = (tone?: StatEntry['tone']) =>
  tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : '';

export default function StatsGrid({ groupLabel = 'Articles', stats }: StatsGridProps) {
  return (
    <div className="stats-grid">
      <div>
        <div className="stats-grid-label">{groupLabel}</div>
        <div className="stats-grid-items">
          {stats.map((stat) => (
            <div key={stat.label} className="stats-grid-item">
              <div className={`stats-grid-item-value ${toneClass(stat.tone)}`.trim()}>{stat.value}</div>
              <div className="stats-grid-item-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
