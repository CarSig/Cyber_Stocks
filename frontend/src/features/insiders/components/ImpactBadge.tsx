type Props = { deltaPct: number | null | undefined };

function fmt(v: number): string {
  const s = v > 0 ? '+' : '';
  return `${s}${v.toFixed(2)}%`;
}

export default function ImpactBadge({ deltaPct }: Props) {
  if (deltaPct == null) return null;
  const cls = deltaPct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative';
  return (
    <span className={cls} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem' }}>
      {fmt(deltaPct)}
    </span>
  );
}
