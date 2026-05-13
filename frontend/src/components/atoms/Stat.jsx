export default function Stat({ label, value, color }) {
  return (
    <div className="ti-stat">
      <div className="ti-stat-value" style={color ? { color } : {}}>
        {value ?? "—"}
      </div>
      <div className="ti-stat-label">{label}</div>
    </div>
  );
}
