type StatItem = {
  label: string;
  value: string;
  color?: string;
};

type StatsGridProps = {
  stats: StatItem[];
};

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="sim-stats">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="stat-card">
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={color ? { color } : undefined}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
