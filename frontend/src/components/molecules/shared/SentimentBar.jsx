import { sentimentColor } from "@/utils/sentimentUtils";

export default function SentimentBar({ value }) {
  const pct = Math.round(((value + 1) / 2) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: sentimentColor(value), borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: sentimentColor(value), minWidth: 40, textAlign: "right" }}>
        {value > 0 ? "+" : ""}{value.toFixed(2)}
      </span>
    </div>
  );
}
