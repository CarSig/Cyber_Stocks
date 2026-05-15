export default function WatchlistSparkline({ closes, color, id }) {
  const W = 52,
    H = 28;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes
    .map((v, i) => {
      const x = (i / (closes.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const fillPts = `0,${H} ${pts} ${W},${H}`;
  const gradId = `spk-${id}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="ticker-wl-sparkline" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
