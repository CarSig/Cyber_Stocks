type StatEntry = {
  label: string;
  value: React.ReactNode;
  color?: string;
};

type StatsGridProps = {
  stats: StatEntry[];
};

import React from 'react';

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="stats-grid">
      <div>
        <div className="stats-grid-label">Articles</div>
        <div className="stats-grid-items">
          {stats.map((stat) => (
            <div key={stat.label} className="stats-grid-item">
              <div className="stats-grid-item-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="stats-grid-item-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
