const THREAT_LEVELS: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low', 4: 'Undefined' };
const THREAT_COLORS: Record<number, string> = {
  1: 'var(--color-red)',
  2: 'var(--color-amber)',
  3: 'var(--color-blue-toggle)',
  4: 'var(--text-muted)',
};

type MispOrg = { name?: string };
type MispEvent = {
  uuid?: string;
  id?: string;
  info?: string;
  Orgc?: MispOrg;
  Org?: MispOrg;
  threat_level_id?: number;
  date?: string;
};

type MispRowProps = {
  item: { Event?: MispEvent } & MispEvent;
};

export default function MispRow({ item }: MispRowProps) {
  const e = item.Event ?? item;
  const level = e.threat_level_id as number;

  return (
    <tr key={e.uuid ?? e.id}>
      <td className="ti-name">{e.info}</td>
      <td>{e.Orgc?.name ?? e.Org?.name ?? '—'}</td>
      <td>
        <span style={{ color: THREAT_COLORS[level] ?? 'var(--text-muted)' }}>{THREAT_LEVELS[level] ?? '—'}</span>
      </td>
      <td className="ti-date">{e.date ?? '—'}</td>
    </tr>
  );
}
