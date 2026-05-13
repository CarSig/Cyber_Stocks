export function CorrelationSelector({ lagDays, setLagDays }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
        Sentiment ↔ Price Correlation
      </h2>
      <select
        value={lagDays}
        onChange={(e) => setLagDays(Number(e.target.value))}
        style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer" }}
      >
        {[1, 2, 3, 5, 7, 14].map((d) => (
          <option key={d} value={d}>{`${d}d lag`}</option>
        ))}
      </select>
    </div>
  );
}

export function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--muted)", borderRadius: 6, padding: 4 }}>
      <button
        onClick={() => setViewMode("grid")}
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          background: viewMode === "grid" ? "var(--foreground)" : "transparent",
          color: viewMode === "grid" ? "var(--background)" : "var(--foreground)",
          transition: "all 0.2s"
        }}
      >
        Grid
      </button>
      <button
        onClick={() => setViewMode("list")}
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          background: viewMode === "list" ? "var(--foreground)" : "transparent",
          color: viewMode === "list" ? "var(--background)" : "var(--foreground)",
          transition: "all 0.2s"
        }}
      >
        List
      </button>
    </div>
  );
}
