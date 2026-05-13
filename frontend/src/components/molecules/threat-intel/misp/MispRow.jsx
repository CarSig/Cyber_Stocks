const THREAT_LEVELS = { 1: "High", 2: "Medium", 3: "Low", 4: "Undefined" };
const THREAT_COLORS = { 1: "var(--color-red)", 2: "var(--color-amber)", 3: "var(--color-blue-toggle)", 4: "var(--text-muted)" };

export default function MispRow({ item }) {
  const e = item.Event ?? item;
  const level = e.threat_level_id;

  return (
    <tr key={e.uuid ?? e.id}>
      <td className="ti-name">{e.info}</td>
      <td>{e.Orgc?.name ?? e.Org?.name ?? "—"}</td>
      <td>
        <span style={{ color: THREAT_COLORS[level] ?? "var(--text-muted)" }}>
          {THREAT_LEVELS[level] ?? "—"}
        </span>
      </td>
      <td className="ti-date">{e.date ?? "—"}</td>
    </tr>
  );
}
