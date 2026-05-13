export default function StatsGrid({ stats }) {
  return (
    <div style={{ display: "flex", gap: 32, flex: "1" }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>Articles</div>
        <div style={{ display: "flex", gap: 16 }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
